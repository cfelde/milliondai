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

import "@openzeppelin/contracts/token/ERC721/ERC721Full.sol";
import "akap/contracts/IAKAP.sol";
import "akap-utils/contracts/domain/DomainManager.sol";
import "akap-utils/contracts/types/StringLib.sol";

contract MillionDaiToken is ERC721Full {
    using StringLib for string;

    DomainManager public dm;
    IAKAP public akap;
    uint public rootPtr;

    constructor(address _dmAddress, uint _rootPtr) ERC721Full("Million DAI website", "MillionDAI") public {
        dm = DomainManager(_dmAddress);
        akap = dm.akap();
        rootPtr = _rootPtr;
    }

    function ptr(string memory k) internal view returns (uint) {
        return akap.hashOf(rootPtr, k.asBytes());
    }

    function tokenAccessPtr() public view returns (uint) {
        return ptr("token-access");
    }

    function tokenAccess() public view returns (address) {
        return akap.seeAddress(tokenAccessPtr());
    }

    function exists(uint tile) external view returns (bool) {
        return _exists(tile);
    }

    modifier withTokenAccess() {
        require(msg.sender == tokenAccess(), "No token access");
        _;
    }

    function mint(address owner, uint tile) external withTokenAccess() returns (bool) {
        _mint(owner, tile);
        return true;
    }

    function burn(address owner, uint tile) external withTokenAccess() returns (bool) {
        _burn(owner, tile);
        return true;
    }

    function ownerChange(address from, address to, uint tile) external withTokenAccess() returns (bool) {
        _safeTransferFrom(from, to, tile, "");
        return true;
    }

    function setTokenURI(uint tile, string calldata uri) external withTokenAccess() {
        _setTokenURI(tile, uri);
    }
}