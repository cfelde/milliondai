# The Million DAI Website

Welcome to [The Million DAI Website](https://milliondai.website) GitHub repo, where developer friendly information is shared about the website.

As outlined on [the about section](https://milliondai.website/about), in today's world, with blockchain and DeFi available, we can take the old million dollar homepage idea and make it new again. I hope this reincarnation can inspire people to create some fun and interesting tiles. I consider this a little art experiment, mixing modern technology with human behavior.

## If you're a developer..

Everyone's welcome to use milliondai.website when interacting with the smart contracts, but if you're a developer you might want direct access to content and tools. Below we describe these in more detail:

The site uses JSON files hosted on [data.milliondai.website](https://data.milliondai.website) to render the tiles. These files are updated every few minutes by the backend, fetching blockchain data as it gets updated. You can of course fetch blockchain data yourself if you'd like. The data.milliondai.website contains two sections, one for [Kovan](https://data.milliondai.website/kovan/index.html), and one for [Mainnet](https://data.milliondai.website/mainnet/index.html).

Two types of files are available:

* pixels.json, describing the tiles rendered on the site
* voting.json, describing voting and tile ownership data

### pixels.json structure

The file contains a map, with the key being the left to right, top to bottom, tile offset. Each entry value contains:

* A tile id, related to the offset
* Owner, holding the current tile owner address
* Price, and minNewPrice, holding the price of DAI, using 18 decimals. For example, 200000000000000000000 is equal to 200 DAI.
* Pixels, a sequence of pixel colors, from left to right, top to bottom. A tile is 10 by 10 pixels big.
* URI, holding a link to a JSON file with meta data. The JSON meta data file may contain a map of name, description and a URL.
* Name, description, and URL, as fetched from the URI, might be included.

All keys are optional, with the exception of id, price, and minNewPrice.

### voting.json structure

This file contains details about voting intervals, number of votes per tile, tile ownership and last winner details. Individual voting_X.json files are also produced each time a new winner has been selected.

The keys lowerVotingBlock, upperVotingBlock, and nextWinnerBlock give details about what block range this file includes, and at what block the next winner is selected.

Under the votes key you'll find a map of tile offset keys, like in pixels.json, with the tile id and total vote count for this tile.

Under the owners key you'll again find a map of tile offset keys, and the nested blocks key holds a map keyed by the owner address with the number of blocks held by that owner.

Finally some details around the last winner and last update timestamp is given in lastWinnerAddress, lastWinnerBlock, lastWinnerTransaction, and lastUpdate.

## Picking winners

The process of picking winners is as follows:

* Take the block hash of the nextWinningBlock and use this as a seed
* Go though the weighted tile votes and select a tile at random
* Using the selected tile, go through the weighted tile owners, and select an owner at random

The selected owner is the winner of that round, with the process starting again. The next winner block is 45454 into the future.

You can find the implementation for this under the picking-a-winner folder.

## Contract source code

While we've above focused on the JSON files, if you'd like to interact directly with the contracts you can find them as a truffle project under the milliondai-contract folder. These contracts leverage the [AKA protocol](https://akap.me) for much of their functionality, but you do not need to consider this if you just want to interact with them directly.

The MillionDAI contract is deployed under these addresses:

* Kovan: 0x26b6739Fc3836A4442A7fC15d28fA0Abe15Dc4e0
* Mainnet: 0xEe681CD9eD937700e859DA167676e2C730d037db

The MillionDAI token contract is deployed under these addresses:

* Kovan: 0x4f5A0aF1877A2D4E18B52B7854312db25F5C03c8
* Mainnet: 0xC5535Fb98315EDD20F6ad1F8C9D0303D0b96f869

## MillionDAI CLI

Interacting with the contracts directly isn't that difficult, but sometimes you just want a simple tool to make the job a bit easier. This is what the MillionDAI CLI allows you to do, and you'll find it under the milliondai-cli folder.

