# MillionDAI contracts

Contracts used for The Million DAI Website.

## Install dependencies

npm i akap-utils
npm i @openzeppelin/test-helpers

## Run tests

You can run tests using the usual Truffle commands.

However, make sure you have deployed the [AKAP contract](https://github.com/cfelde/AKAP) first, and defined its address in 2_deploy_contracts.js!

## Compiled and deployed JSON files

If you'd like to use these contracts as deployed to Kovan and Mainnet in your Web3 project, you can find the various contract links on:

https://milliondai.website/_contract/MillionDai.json - MillionDAI contract

https://milliondai.website/_contract/MillionDaiToken.json - Contract holding MillionDAI ERC-721 tokens

https://milliondai.website/_contract/DomainManager.json - Used by contracts internally for AKAP storage

https://milliondai.website/_contract/IERC20.json - For interacting with the DAI contract

https://milliondai.website/_contract/RTokenLike.json - For interacting with the rDAI contract
