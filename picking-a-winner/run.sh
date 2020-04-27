#!/usr/bin/env bash

# Replace the infura project id and voting json url below:

web3url="https://kovan.infura.io/v3/your-infura-id-here"
votingJsonUrl="https://data.milliondai.website/kovan/voting_18157226.json"

echo "Web3 URL: $web3url"
echo "Voting JSON URL: $votingJsonUrl"

node index.js $web3url $votingJsonUrl
