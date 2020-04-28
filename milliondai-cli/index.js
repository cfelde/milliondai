const fs = require('fs');
const fetch = require('node-fetch');
const Web3 = require("web3");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const TruffleContract = require("@truffle/contract");
const BN = require("bn.js");

function parsePixelChainData(value) {
    if (value === null || value === undefined) {
        return [];
    }

    const bits = Web3.utils.toBN(value).toString(2).substring(2);

    let pixels = bits
        .match(/.{3}/g)
        .map(bitmap => bitmap
            .replace(/1/g, "f")
            .replace(/[^f]/g, "0"))
        .map(rgb => "#" + rgb)
        .slice(0, 100);

    while (pixels.length < 100) {
        pixels.push("#fff");
    }

    return pixels;
}

function packagePixels(pixels) {
    const bits = "11"
        + pixels
            .join("")
            .replace(/#/g, "")
            .replace(/f/g, "1")
            .replace(/[^1]/g, "0")
        + "11";

    const bn = new BN(bits, 2);

    return Web3.utils.toHex(bn);
}

async function getMDContractJson(config) {
    return await fetch(config.millionDaiJsonURL || "https://milliondai.website/_contract/MillionDai.json").then(r => r.json());
}

async function getMDTContractJson(config) {
    return await fetch(config.millionDaiTokenJsonURL || "https://milliondai.website/_contract/MillionDaiToken.json").then(r => r.json());
}

async function getDaiContractJson(config) {
    return await fetch(config.daiJsonURL || "https://milliondai.website/_contract/IERC20.json").then(r => r.json());
}

async function getProvider(config) {
    if (config.accountKey && config.accountKey !== "") {
        return new HDWalletProvider(config.accountKey, config.web3url || "http://localhost:8545")
    } else {
        return new Web3.providers.HttpProvider(config.web3url || "http://localhost:8545");
    }
}

async function getContract(address, json, provider) {
    const contract = TruffleContract(json);
    contract.setProvider(provider);
    contract.defaults({
        from: address,
        //gas: 3000000,
        gasPrice: Web3.utils.toWei("5", "gwei")
    });
    return contract.deployed();
}

async function getChainData(millionDaiContract, tileId) {
    return await millionDaiContract.get(tileId);
}

function getTileId(offset) {
    return new BN("57896044618658097711785492504343953926634992332820282019728792003956564819967").add(new BN(offset));
}

function getTileOffset(tileId) {
    return new BN(tileId.substring(2), 16).sub(new BN("57896044618658097711785492504343953926634992332820282019728792003956564819967"));
}

function isData(d) {
    return d !== null && d !== undefined
}

function isValidURL(url) {
    const pattern = new RegExp("^https?:\\/\\/[^\\s$.?#].[^\\s]*$", "i");
    return isData(url) && !!pattern.test(url);
}

async function fetchTransferEvents(contract, fromBlock, toBlock) {
    const rawBatch = await contract.getPastEvents("Transfer", {
        fromBlock: fromBlock,
        toBlock: toBlock
    });

    return rawBatch.map(e => {
        return {
            "tile": "0x" + (new BN(e.returnValues.tokenId)).toString(16),
            "blockNumber": e.blockNumber,
            "transactionIndex": e.transactionIndex,
            "logIndex": e.logIndex,
            "blockHash": e.blockHash,
            "transactionHash": e.transactionHash,
            "transferFrom": e.returnValues.from,
            "transferTo": e.returnValues.to
        }
    });
}

async function fetchTileEvents(contract, fromBlock, toBlock) {
    const rawBatch = await contract.getPastEvents("Tile", {
        fromBlock: fromBlock,
        toBlock: toBlock
    });

    return rawBatch.map(e => {
        return {
            "tile": "0x" + (new BN(e.returnValues.tile)).toString(16),
            "blockNumber": e.blockNumber,
            "transactionIndex": e.transactionIndex,
            "logIndex": e.logIndex,
            "blockHash": e.blockHash,
            "transactionHash": e.transactionHash,
            "actor": e.returnValues.actor,
            "action": e.returnValues.action,
            "amount": e.returnValues.amount
        }
    });
}

async function fetchValueEvents(contract, fromBlock, toBlock) {
    const rawBatch = await contract.getPastEvents("Value", {
        fromBlock: fromBlock,
        toBlock: toBlock
    });

    return rawBatch.map(e => {
        return {
            "tile": "0x" + (new BN(e.returnValues.tile)).toString(16),
            "blockNumber": e.blockNumber,
            "transactionIndex": e.transactionIndex,
            "logIndex": e.logIndex,
            "blockHash": e.blockHash,
            "transactionHash": e.transactionHash,
            "actor": e.returnValues.actor,
            "value": e.returnValues.value
        }
    });
}

async function enrichURIData(blockData) {
    // Note: Always returning blank name, desc and url.
    // This is because there's not enough safety around
    // the below fetch of the uri. Better to just let the
    // browsers handle this on a tile by tile basis.
    if (true || !isValidURL(blockData.uri)) {
        return {
            ...blockData,
            ...{
                name: "",
                description: "",
                url: ""
            }
        };
    }

    const data = await fetch(blockData.uri).then(r => r.json()).catch(e => {
        return {};
    });

    const validKeys = {
        name: true,
        description: true,
        url: true
    };

    const metaData = Object
        .keys(data)
        .filter(k => validKeys[k] && typeof data[k] === "string")
        .reduce((acc, k) => {
            acc[k] = data[k].substring(0, 1000);
            return acc;
        }, {
            name: "",
            description: "",
            url: ""
        });

    return {...blockData, ...metaData}
}

async function fetchUriEvents(contract, fromBlock, toBlock) {
    const rawBatch = await contract.getPastEvents("URI", {
        fromBlock: fromBlock,
        toBlock: toBlock
    });

    return Promise.all(rawBatch.map(e => {
        const blockData = {
            "tile": "0x" + (new BN(e.returnValues.tile)).toString(16),
            "blockNumber": e.blockNumber,
            "transactionIndex": e.transactionIndex,
            "logIndex": e.logIndex,
            "blockHash": e.blockHash,
            "transactionHash": e.transactionHash,
            "actor": e.returnValues.actor,
            "uri": e.returnValues.uri
        };

        return enrichURIData(blockData);
    }));
}

async function fetchVoteEvents(contract, fromBlock, toBlock) {
    const rawBatch = await contract.getPastEvents("Vote", {
        fromBlock: fromBlock,
        toBlock: toBlock
    });

    return rawBatch.map(e => {
        return {
            "tile": "0x" + (new BN(e.returnValues.tile)).toString(16),
            "blockNumber": e.blockNumber,
            "transactionIndex": e.transactionIndex,
            "logIndex": e.logIndex,
            "blockHash": e.blockHash,
            "transactionHash": e.transactionHash,
            "actor": e.returnValues.actor,
        }
    });
}

async function events(millionDaiContract, millionDaiTokenContract, firstBlockNumber, lastBlockNumber) {
    if (lastBlockNumber < firstBlockNumber) {
        console.log("No new blocks to check..");
        process.exit(1);
    }

    console.log("Looking for events in block range " + firstBlockNumber + " to " + lastBlockNumber);

    const transferEvents = [];
    const tileEvents = [];
    const valueEvents = [];
    const uriEvents = [];
    const voteEvents = [];

    const blockBatchSize = 1000;
    let blockMax = firstBlockNumber;
    for (let blockMin = firstBlockNumber; blockMin <= lastBlockNumber; blockMin += blockBatchSize) {
        blockMax = Math.min(blockMin + blockBatchSize - 1, lastBlockNumber);
        console.log("Fetching event batch within blocks: " + blockMin + " and " + blockMax);

        transferEvents.push(...await fetchTransferEvents(millionDaiTokenContract, blockMin, blockMax));
        tileEvents.push(...await fetchTileEvents(millionDaiContract, blockMin, blockMax));
        valueEvents.push(...await fetchValueEvents(millionDaiContract, blockMin, blockMax));
        uriEvents.push(...await fetchUriEvents(millionDaiContract, blockMin, blockMax));
        voteEvents.push(...await fetchVoteEvents(millionDaiContract, blockMin, blockMax));
    }

    console.log("Have " + transferEvents.length + " transfer events");
    console.log(JSON.stringify(transferEvents));
    console.log();

    console.log("Have " + tileEvents.length + " tile events");
    console.log(JSON.stringify(tileEvents));
    console.log();

    console.log("Have " + valueEvents.length + " value events");
    console.log(JSON.stringify(valueEvents));
    console.log();

    console.log("Have " + uriEvents.length + " URI events");
    console.log(JSON.stringify(uriEvents));
    console.log();

    console.log("Have " + voteEvents.length + " vote events");
    console.log(JSON.stringify(uriEvents));
}

async function getTile(millionDaiContract, tileOffset) {
    const tileId = getTileId(tileOffset);
    const rawTileData = await getChainData(millionDaiContract, tileId);
    const value = rawTileData["value"];
    const uri = rawTileData["uri"];
    const price = Web3.utils.fromWei(rawTileData["price"]);
    const minNewPrice = Web3.utils.fromWei(rawTileData["minNewPrice"]);
    const owner = rawTileData["owner"];
    const blockNumber = rawTileData["blockNumber"].toString(10);

    const tileData = {
        "value": value,
        "pixels": parsePixelChainData(value),
        "uri": uri,
        "price": price,
        "minNewPrice": minNewPrice,
        "owner": owner,
        "blockNumber": blockNumber
    }

    return tileData;
}

async function ensureDaiAllowance(account, millionDaiContract, daiContract, amount) {
    let allowance = await daiContract.allowance(account, millionDaiContract.address);

    if (allowance.gte(amount)) {
        return;
    }

    let newAllowance = Web3.utils.toBN("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    await daiContract.approve(millionDaiContract.address, newAllowance);
}

async function setTile(account, millionDaiContract, daiContract, input) {
    for (let i = 0; i < input.length; i++) {
        const tile = input[i];
        const tileOffset = tile.tileOffset;
        const tileId = getTileId(tileOffset);

        console.log("Doing set-tile on: " + tileOffset);

        const tileData = await getTile(millionDaiContract, tileOffset);
        const price = new BN(tile.price);
        const minNewPrice = new BN(tileData.minNewPrice);

        if (price.lt(minNewPrice)) {
            console.log("Skipping tile " + tileOffset + " due to insufficient price, require " + minNewPrice);
            continue;
        }

        await ensureDaiAllowance(account, millionDaiContract, daiContract, price);

        console.log("Doing tile enter: " + tileId + ", " + Web3.utils.toWei(price));
        await millionDaiContract.enter(tileId, Web3.utils.toWei(price));

        const uri = tile.uri;
        const pixels = tile.pixels;

        if (uri && pixels) {
            console.log("Doing tile set..");
            await millionDaiContract.set(tileId, packagePixels(pixels), uri);
        } else if (pixels) {
            console.log("Doing tile setTileValue..");
            await millionDaiContract.setTileValue(tileId, packagePixels(pixels));
        } else if (uri) {
            console.log("Doing tile setTileURI..");
            await millionDaiContract.setTileURI(tileId, uri);
        }

        const buyAndHold = tile.buyAndHold;

        if (!buyAndHold) {
            console.log("Doing tile exit..");
            await millionDaiContract.exit(tileId);
        }

        console.log("Done with tile " + tileOffset);
    }
}

async function main() {
    const config = JSON.parse(fs.readFileSync(process.argv[2]).toString());
    const command = process.argv[3];

    const provider = await getProvider(config);
    const web3 = new Web3(provider);

    const accounts = await web3.eth.getAccounts();
    const account = accounts[0];

    if (account === undefined || account === null) {
        console.warn("Running without an account..");
    } else {
        console.log("Using account " + account);
        web3.eth.defaultAccount = account;
    }

    const millionDaiJson = await getMDContractJson(config);
    const millionDaiTokenJson = await getMDTContractJson(config);
    const daiJson = await getDaiContractJson(config);

    const millionDaiContract = await getContract(account, millionDaiJson, provider);
    const millionDaiTokenContract = await getContract(account, millionDaiTokenJson, provider);
    const daiContract = await getContract(account, daiJson, provider);

    // Available commands
    // events [from block] [to block]
    // get-tile [tile offset]
    // set-tile [set tile json]

    switch (command) {
        case "events":
            const fromBlock = parseInt(process.argv[4]);
            const toBlock = parseInt(process.argv[5]);
            await events(millionDaiContract, millionDaiTokenContract, fromBlock, toBlock);
            break;
        case "get-tile":
            const tileOffset = parseInt(process.argv[4]);
            const tileId = getTileId(tileOffset);
            console.log("Getting tile data on tile offset " + tileOffset + " / tile id " + tileId);
            const tileData = await getTile(millionDaiContract, tileOffset);
            console.log(JSON.stringify(tileData));
            break;
        case "set-tile":
            const input = JSON.parse(fs.readFileSync(process.argv[4]).toString());
            await setTile(account, millionDaiContract, daiContract, input);
            break;
        default:
            console.error("No support for command: " + command);
    }
}

main().catch(e => console.error(e)).finally(() => process.exit(0));
