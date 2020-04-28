pragma solidity ^0.5.0;

import "../RTokenLike.sol";

contract FakeRToken is RTokenLike {
    event MintDebug(uint256 amount);

    event RedeemAndTransferDebug(address redeemTo, uint256 redeemTokens);

    event CreateHatDebug(address[] recipients,
        uint32[] proportions,
        bool doChangeHat);

    constructor() public {}

    function totalSupply() external view returns (uint256) {
        return 0;
    }

    function balanceOf(address) external view returns (uint256) {
        return 0;
    }

    function transfer(address, uint256) external returns (bool) {
        return true;
    }

    function allowance(address, address) external view returns (uint256) {
        return 0;
    }

    function approve(address, uint256) external returns (bool) {
        return true;
    }

    function transferFrom(address, address, uint256) external returns (bool) {
        return true;
    }

    function mint(uint256 amount) external returns (bool) {
        emit MintDebug(amount);
        return true;
    }

    function mintWithSelectedHat(uint256, uint256) external returns (bool) {
        return true;
    }

    function mintWithNewHat(
        uint256,
        address[] calldata,
        uint32[] calldata
    ) external returns (bool) {
        return true;
    }

    function transferAll(address) external returns (bool) {
        return true;
    }

    function transferAllFrom(address, address) external returns (bool) {
        return true;
    }

    function redeem(uint256) external returns (bool) {
        return true;
    }

    function redeemAll() external returns (bool) {
        return true;
    }

    function redeemAndTransfer(address redeemTo, uint256 redeemTokens) external returns (bool) {
        emit RedeemAndTransferDebug(redeemTo, redeemTokens);
        return true;
    }

    function redeemAndTransferAll(address) external returns (bool) {
        return true;
    }

    function createHat(
        address[] calldata recipients,
        uint32[] calldata proportions,
        bool doChangeHat
    ) external returns (uint256) {
        emit CreateHatDebug(recipients, proportions, doChangeHat);
        return 0;
    }

    function changeHat(uint256) external returns (bool) {
        return true;
    }

    function payInterest(address) external returns (bool) {
        return true;
    }

    function getMaximumHatID() external view returns (uint256) {
        return 0;
    }

    function getHatByAddress(address)
    external
    view
    returns (
        uint256 hatID,
        address[] memory recipients,
        uint32[] memory proportions
    ) {
        hatID = 0;
        recipients = new address[](0);
        proportions = new uint32[](0);
    }

    function getHatByID(uint256)
    external
    view
    returns (address[] memory recipients, uint32[] memory proportions) {
        recipients = new address[](0);
        proportions = new uint32[](0);
    }

    function receivedSavingsOf(address)
    external
    view
    returns (uint256) {
        return 0;
    }

    function receivedLoanOf(address)
    external
    view
    returns (uint256) {
        return 0;
    }

    function interestPayableOf(address)
    external
    view
    returns (uint256) {
        return 0;
    }
}