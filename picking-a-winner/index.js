const fetch = require('node-fetch');
const Web3 = require("web3");
const seedrandom = require("seedrandom");

function pickWinner(votingData, ownershipData, blockHash) {
    // Seed random
    const rnd = seedrandom(blockHash);

    // Get sorted voting data, high to low
    const votes = Object.values(votingData)
        .filter(o => o.votes > 0)
        .sort((a, b) => {
            return b.votes - a.votes;
        });

    // Upper bound
    const voteSum = votes.reduce((acc, entry) => acc + entry.votes, 0);

    console.log("Vote sum is " + voteSum);

    // Pick a random tile, weighted by voting count
    const rndVote = Math.ceil(rnd() * voteSum);
    let runningSum = 0;
    let selectedId;
    for (let i = 0; i < votes.length; i++) {
        selectedId = votes[i].id;
        runningSum += votes[i].votes;

        if (runningSum >= rndVote) {
            break;
        }
    }

    console.log("Selected tile with id " + selectedId + " using rndVote " + rndVote);

    // There might be no tiles to pick..
    if (selectedId === undefined) {
        return undefined;
    }

    // Get owners on selected tile
    const owners = Object.values(ownershipData).filter(e => e.id === selectedId).map(e => e.blocks);

    if (owners.length !== 1) {
        return undefined;
    }

    // Get owners sorted by block ownership length, high to low
    const applicableOwners = Object.entries(owners[0])
        .filter(v => v[1] > 0)
        .sort((a, b) => {
            return b[1] - a[1];
        });

    // Upper bound
    const blockSum = applicableOwners.reduce((acc, entry) => acc + entry[1], 0);

    console.log("Block sum is " + blockSum);

    // Pick a random owner on the selected tile, weighted by block ownership length
    const rndBlock = Math.ceil(rnd() * blockSum);
    let runningBlock = 0;
    let selectedAddress;
    for (let i = 0; i < applicableOwners.length; i++) {
        selectedAddress = applicableOwners[i][0];
        runningBlock += applicableOwners[i][1];

        if (runningBlock >= rndBlock) {
            break;
        }
    }

    console.log("Selected owner with address " + selectedAddress + " using rndBlock " + rndBlock);

    return selectedAddress;
}

async function managerWinner(web3, nextWinningBlock, votingData, ownershipData) {
    const winningBlock = await web3.eth.getBlock(nextWinningBlock);

    if (winningBlock === undefined || winningBlock === null) {
        console.error("No block found on " + nextWinningBlock);
        return null;
    }

    const winningBlockHash = winningBlock.hash;

    if (winningBlockHash === undefined || winningBlockHash === null || winningBlockHash.length === 0) {
        console.error("Invalid winning block hash: " + winningBlockHash);
        return null;
    }

    console.log("Winning block hash for seed: " + winningBlockHash);

    return pickWinner(votingData, ownershipData, winningBlockHash);
}

async function main() {
    const web3url = process.argv[2];
    const votingJsonUrl = process.argv[3];

    const provider = new Web3.providers.HttpProvider(web3url);
    const web3 = new Web3(provider);
    
    const votingJson = await fetch(votingJsonUrl).then(r => r.json());
    
    const nextWinningBlock = votingJson.nextWinnerBlock;
    const votingData = votingJson.votes;
    const ownershipData = votingJson.owners;

    await managerWinner(web3, nextWinningBlock, votingData, ownershipData);
}

main().catch(e => console.error(e)).finally(() => process.exit(0));
