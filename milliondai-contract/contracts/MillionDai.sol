// Copyright (C) 2020  Christian Felde

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "akap/contracts/IAKAP.sol";
import "akap-utils/contracts/domain/IDomainManager.sol";
import "akap-utils/contracts/types/Uint256Lib.sol";
import "akap-utils/contracts/types/StringLib.sol";
import "akap-utils/contracts/types/AddressLib.sol";
import "akap-utils/contracts/types/BytesLib.sol";
import "akap-utils/contracts/collections/ISimpleMap.sol";
import "./RTokenLike.sol";
import "./MillionDaiToken.sol";

contract MillionDai {
    using StringLib for string;
    using AddressLib for address;
    using Uint256Lib for uint;
    using BytesLib for bytes;

    IDomainManager public dm;
    IAKAP public akap;
    uint public rootPtr;

    bool private lock;

    enum TileAction {ENTER, EXIT}
    event Tile(uint indexed tile, address indexed actor, TileAction indexed action, uint amount);
    event Value(uint indexed tile, address indexed actor, bytes value);
    event URI(uint indexed tile, address indexed actor, string uri);
    event Vote(uint indexed tile, address indexed actor);

    constructor() public {}

    function ptr(string memory k) internal view returns (uint) {
        return akap.hashOf(rootPtr, k.asBytes());
    }

    function erc721Ptr() public view returns (uint) {
        return ptr("erc-721");
    }

    function daiPtr() public view returns (uint) {
        return ptr("dai");
    }

    function rdaiPtr() public view returns (uint) {
        return ptr("rdai");
    }

    function dataMapPtr() public view returns (uint) {
        return ptr("data-map");
    }

    function daiMapPtr() public view returns (uint) {
        return ptr("dai-map");
    }

    function tileBlockMapPtr() public view returns (uint) {
        return ptr("tile-block-map");
    }

    function voteTileMapPtr() public view returns (uint) {
        return ptr("vote-tile-map");
    }

    function voteBlockMapPtr() public view returns (uint) {
        return ptr("vote-block-map");
    }

    function adminRootPtr() public view returns (uint) {
        return ptr("admin");
    }

    function adminPtr() public view returns (uint) {
        address a = msg.sender;
        return akap.hashOf(adminRootPtr(), a.asBytes());
    }

    function erc721() public view returns (MillionDaiToken) {
        return MillionDaiToken(akap.seeAddress(erc721Ptr()));
    }

    function dai() public view returns (IERC20) {
        return IERC20(akap.seeAddress(daiPtr()));
    }

    function rdai() public view returns (RTokenLike) {
        return RTokenLike(akap.seeAddress(rdaiPtr()));
    }

    function dataMap() public view returns (ISimpleMap) {
        return ISimpleMap(akap.seeAddress(dataMapPtr()));
    }

    function daiMap() public view returns (ISimpleMap) {
        return ISimpleMap(akap.seeAddress(daiMapPtr()));
    }

    function tileBlockMap() public view returns (ISimpleMap) {
        return ISimpleMap(akap.seeAddress(tileBlockMapPtr()));
    }

    function voteBlockMap() public view returns (ISimpleMap) {
        return ISimpleMap(akap.seeAddress(voteBlockMapPtr()));
    }

    function voteTileMap() public view returns (ISimpleMap) {
        return ISimpleMap(akap.seeAddress(voteTileMapPtr()));
    }

    function tilePrice(uint tile) public view returns (uint) {
        bytes memory value = daiMap().get(tile.asBytes());

        return value.asUint256();
    }

    function get(uint tile) external view returns (bytes memory value, string memory uri, uint price, uint minNewPrice, address owner, uint blockNumber) {
        value = dataMap().get(tile.asBytes());

        MillionDaiToken token = erc721();

        if (token.exists(tile)) {
            uri = token.tokenURI(tile);
            owner = erc721().ownerOf(tile);
        } else {
            uri = "";
            owner = address(0);
        }

        price = tilePrice(tile);

        uint minPrice = 100000000000000000000; // 100 DAI
        uint minIncrement = 1000000000000000000; // 1 DAI
        uint minAmount = price + minIncrement;

        if (minPrice > minAmount) {
            minNewPrice = minPrice;
        } else {
            minNewPrice = minAmount;
        }

        blockNumber = tileBlockMap().get(tile.asBytes()).asUint256();
    }

    modifier withValidTile(uint tile) {
        uint lower = uint(-1) / 2;
        uint higher = lower + 10000;
        require(tile >= lower && tile < higher, "Invalid tile");
        _;
    }

    function set(uint tile, bytes calldata value, string calldata uri) external withValidTile(tile) {
        require(value.length == 38, "Wrong value size");
        MillionDaiToken token = erc721();
        require(msg.sender == token.ownerOf(tile), "Not owner");
        token.setTokenURI(tile, uri);
        dataMap().put(tile.asBytes(), value);
        emit Value(tile, msg.sender, value);
        emit URI(tile, msg.sender, uri);
    }

    function setTileValue(uint tile, bytes calldata value) external withValidTile(tile) {
        require(value.length == 38, "Wrong value size");
        MillionDaiToken token = erc721();
        require(msg.sender == token.ownerOf(tile), "Not owner");
        dataMap().put(tile.asBytes(), value);
        emit Value(tile, msg.sender, value);
    }

    function setTileURI(uint tile, string calldata uri) external withValidTile(tile) {
        MillionDaiToken token = erc721();
        require(msg.sender == token.ownerOf(tile), "Not owner");
        token.setTokenURI(tile, uri);
        emit URI(tile, msg.sender, uri);
    }

    function enter(uint tile, uint amount) external withValidTile(tile) {
        require(!lock, "Lock failure");
        lock = true;

        uint minPrice = 100000000000000000000; // 100 DAI
        uint minIncrement = 1000000000000000000; // 1 DAI
        uint existingAmount = tilePrice(tile);
        uint minAmount = existingAmount + minIncrement;

        MillionDaiToken token = erc721();
        RTokenLike rtoken = rdai();

        require(amount >= minPrice && minAmount > existingAmount, "Insufficient price");

        bool tokenExists = token.exists(tile);

        if (tokenExists) {
            require(rtoken.redeemAndTransfer(token.ownerOf(tile), existingAmount), "RDai redeem failure");
        }

        if (tokenExists && token.ownerOf(tile) != msg.sender) {
            require(amount >= minAmount, "Insufficient increase in price");
            require(token.ownerChange(token.ownerOf(tile), msg.sender, tile), "Owner change failure");
        } else if (!tokenExists) {
            require(token.mint(msg.sender, tile), "Token mint failure");
        }

        require(dai().transferFrom(msg.sender, address(this), amount), "Transfer failure");
        require(rtoken.mint(amount), "RDai mint failure");

        tileBlockMap().put(tile.asBytes(), block.number.asBytes());
        daiMap().put(tile.asBytes(), amount.asBytes());

        emit Tile(tile, msg.sender, TileAction.ENTER, amount);

        require(lock, "Lock failure");
        lock = false;
    }

    function exit(uint tile) external withValidTile(tile) {
        require(!lock, "Lock failure");
        lock = true;

        bytes memory value = tileBlockMap().get(tile.asBytes());
        uint blockEnter = value.asUint256();

        require(block.number > blockEnter, "Mint too fresh");

        require(erc721().burn(msg.sender, tile), "Token burn failure");

        uint existingAmount = tilePrice(tile);
        daiMap().put(tile.asBytes(), "");

        require(rdai().redeemAndTransfer(msg.sender, existingAmount), "RDai redeem failure");

        emit Tile(tile, msg.sender, TileAction.EXIT, existingAmount);

        require(lock, "Lock failure");
        lock = false;
    }

    function vote(uint tile) external withValidTile(tile) {
        bytes memory value = dataMap().get(tile.asBytes());
        require(value.length > 0, "No tile");

        address a = msg.sender;
        voteTileMap().put(a.asBytes(), tile.asBytes());
        voteBlockMap().put(a.asBytes(), block.number.asBytes());

        emit Vote(tile, a);
    }

    function getVote(address actor) external view returns (uint tile, uint blockNumber) {
        tile = voteTileMap().get(actor.asBytes()).asUint256();
        blockNumber = voteBlockMap().get(actor.asBytes()).asUint256();
    }

    modifier onlyAdmin() {
        require(akap.seeAddress(adminPtr()) == msg.sender, "Not admin");
        _;
    }

    function withHat(address[] calldata recipients, uint32[] calldata proportions) external onlyAdmin() {
        RTokenLike rd = rdai();
        dai().approve(address(rd), uint(-1));
        rd.createHat(recipients, proportions, true);
    }
}