const akap = artifacts.require("IAKAP");
const akaProxy = artifacts.require("AkaProxy");
const convertUtils = artifacts.require("ConvertUtils");
const domainManager = artifacts.require("DomainManager");
const simpleMap = artifacts.require("SimpleMap");
const millionDaiToken = artifacts.require("MillionDaiToken");
const millionDai = artifacts.require("MillionDai");
const fakeRToken = artifacts.require("FakeRToken");
const fakeERC20 = artifacts.require("FakeERC20");

function akapAddress(network) {
    let officialAddress = "0xaacCAAB0E85b1EfCEcdBA88F4399fa6CAb402349";
    let testNetworkAddress = "REPLACE ME WITH YOUR TESTNET AKAP ADDRESS";

    switch(network) {
        case "goerli": return officialAddress;
        case "rinkeby": return officialAddress;
        case "kovan": return officialAddress;
        case "ropsten": return officialAddress;
        case "mainnet": return officialAddress;
        default: return testNetworkAddress;
    }
}

module.exports = function(deployer, network, accounts) {
    deployer.then(async () => {
        let akapInstance = await akap.at(akapAddress(network));
        let cu = await deployer.deploy(convertUtils);

        let randomLabel = new Array(32);
        for (let i = 0; i < randomLabel.length; i++) {
            randomLabel[i] = Math.floor(Math.random() * 256)
        }

        console.log("Using random label: " + randomLabel);

        let dmPtr = await akapInstance.hashOf(0x0, randomLabel);

        console.log("Root pointer: 0x" + dmPtr.toString(16));

        let dm = await deployer.deploy(domainManager, akapAddress(network), 0x0, randomLabel);
        let dmAddress = dm.address;

        await dm.claim(await cu.sToBytes("erc-721"));
        await dm.claim(await cu.sToBytes("dai"));
        await dm.claim(await cu.sToBytes("rdai"));
        await dm.claim(await cu.sToBytes("data-map"));
        await dm.claim(await cu.sToBytes("dai-map"));
        await dm.claim(await cu.sToBytes("tile-block-map"));
        await dm.claim(await cu.sToBytes("vote-tile-map"));
        await dm.claim(await cu.sToBytes("vote-block-map"));
        await dm.claim(await cu.sToBytes("token-access"));
        await dm.claim(await cu.sToBytes("admin"));

        let adminRootPtr = await akapInstance.hashOf(dmPtr, await cu.sToBytes("admin"));
        await dm.claim(adminRootPtr, await cu.addressToBytes(accounts[0]));

        console.log("Deployed domain manager: " + dmAddress);

        let proxy = await deployer.deploy(akaProxy, dmAddress, dmPtr);
        let proxyAddress = proxy.address;
        await dm.setApprovalForAll(proxyAddress, true);

        console.log("Deployed proxy: " + proxyAddress);

        let mdai = await deployer.deploy(millionDai);
        let mdaiAddress = mdai.address;
        await akapInstance.setSeeAddress(dmPtr, mdaiAddress);

        mdai = await millionDai.at(proxyAddress);

        let erc721Ptr = await mdai.erc721Ptr();
        let dataMapPtr = await mdai.dataMapPtr();
        let daiMapPtr = await mdai.daiMapPtr();
        let tileBlockMapPtr = await mdai.tileBlockMapPtr();
        let voteTileMapPtr = await mdai.voteTileMapPtr();
        let voteBlockMapPtr = await mdai.voteBlockMapPtr();
        let adminPtr = await mdai.adminPtr();
        let daiPtr = await mdai.daiPtr();
        let rdaiPtr = await mdai.rdaiPtr();

        await akapInstance.setSeeAddress(adminPtr, accounts[0]);

        console.log("Deployed MillionDai: " + mdaiAddress);

        let mdaiToken = await deployer.deploy(millionDaiToken, dmAddress, dmPtr);
        let mdaiTokenAddress = mdaiToken.address;
        let tokenAccessPtr = await mdaiToken.tokenAccessPtr();

        await akapInstance.setSeeAddress(erc721Ptr, mdaiTokenAddress);
        await akapInstance.setSeeAddress(tokenAccessPtr, proxyAddress);

        console.log("Deployed MillionDaiToken: " + mdaiTokenAddress);

        let dataMap = await deployer.deploy(simpleMap, dmAddress, dataMapPtr);
        let dataMapAddress = dataMap.address;

        await dm.setApprovalForAll(dataMapAddress, true);
        await akapInstance.setSeeAddress(dataMapPtr, dataMapAddress);

        console.log("Deployed data map: " + dataMapAddress);

        let daiMap = await deployer.deploy(simpleMap, dmAddress, daiMapPtr);
        let daiMapAddress = daiMap.address;

        await dm.setApprovalForAll(daiMapAddress, true);
        await akapInstance.setSeeAddress(daiMapPtr, daiMapAddress);

        console.log("Deployed dai map: " + daiMapAddress);

        let tileBlockMap = await deployer.deploy(simpleMap, dmAddress, tileBlockMapPtr);
        let tileBlockMapAddress = tileBlockMap.address;

        await dm.setApprovalForAll(tileBlockMapAddress, true);
        await akapInstance.setSeeAddress(tileBlockMapPtr, tileBlockMapAddress);

        console.log("Deployed tile block map: " + tileBlockMapAddress);

        let voteTileMap = await deployer.deploy(simpleMap, dmAddress, voteTileMapPtr);
        let voteTileMapAddress = voteTileMap.address;

        await dm.setApprovalForAll(voteTileMapAddress, true);
        await akapInstance.setSeeAddress(voteTileMapPtr, voteTileMapAddress);

        console.log("Deployed vote tile map: " + voteTileMapAddress);

        let voteBlockMap = await deployer.deploy(simpleMap, dmAddress, voteBlockMapPtr);
        let voteBlockMapAddress = voteBlockMap.address;

        await dm.setApprovalForAll(voteBlockMapAddress, true);
        await akapInstance.setSeeAddress(voteBlockMapPtr, voteBlockMapAddress);

        console.log("Deployed vote block map: " + voteBlockMapAddress);

        let rt = await deployer.deploy(fakeRToken);
        let rtAddress = rt.address;

        await akapInstance.setSeeAddress(rdaiPtr, rtAddress);

        console.log("Deployed RToken: " + rtAddress);

        let dt = await deployer.deploy(fakeERC20);
        let dtAddress = await dt.address;

        await akapInstance.setSeeAddress(daiPtr, dtAddress);

        console.log("Deployed Dai: " + dtAddress);
    });
};
