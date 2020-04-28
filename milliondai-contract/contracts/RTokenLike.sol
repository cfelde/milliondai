pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RTokenLike is IERC20 {
    function mint(uint256 mintAmount) external returns (bool);

    function mintWithSelectedHat(uint256 mintAmount, uint256 hatID) external returns (bool);

    function mintWithNewHat(
        uint256 mintAmount,
        address[] calldata recipients,
        uint32[] calldata proportions
    ) external returns (bool);

    function transferAll(address dst) external returns (bool);

    function transferAllFrom(address src, address dst) external returns (bool);

    function redeem(uint256 redeemTokens) external returns (bool);

    function redeemAll() external returns (bool);

    function redeemAndTransfer(address redeemTo, uint256 redeemTokens) external returns (bool);

    function redeemAndTransferAll(address redeemTo) external returns (bool);

    function createHat(
        address[] calldata recipients,
        uint32[] calldata proportions,
        bool doChangeHat
    ) external returns (uint256 hatID);

    function changeHat(uint256 hatID) external returns (bool);

    function payInterest(address owner) external returns (bool);

    function getMaximumHatID() external view returns (uint256 hatID);

    function getHatByAddress(address owner)
    external
    view
    returns (
        uint256 hatID,
        address[] memory recipients,
        uint32[] memory proportions
    );

    function getHatByID(uint256 hatID)
    external
    view
    returns (address[] memory recipients, uint32[] memory proportions);

    function receivedSavingsOf(address owner)
    external
    view
    returns (uint256 amount);

    function receivedLoanOf(address owner)
    external
    view
    returns (uint256 amount);

    function interestPayableOf(address owner)
    external
    view
    returns (uint256 amount);

    event LoansTransferred(
        address indexed owner,
        address indexed recipient,
        uint256 indexed hatId,
        bool isDistribution,
        uint256 redeemableAmount,
        uint256 internalSavingsAmount);

    event InterestPaid(address indexed recipient, uint256 amount);

    event HatCreated(uint256 indexed hatID);

    event HatChanged(address indexed account, uint256 indexed oldHatID, uint256 indexed newHatID);
}
