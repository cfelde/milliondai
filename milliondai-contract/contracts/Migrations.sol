pragma solidity ^0.5.0;

import "akap-utils/contracts/upgradable/AkaProxy.sol";
import "akap-utils/contracts/types/ConvertUtils.sol";
import "akap-utils/contracts/collections/SimpleMap.sol";

contract Migrations {
  address public owner;
  uint public last_completed_migration;

  constructor() public {
    owner = msg.sender;
  }

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }
}
