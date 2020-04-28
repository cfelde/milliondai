const {expectRevert, expectEvent} = require('@openzeppelin/test-helpers');

const akap = artifacts.require("IAKAP");
const akaProxy = artifacts.require("AkaProxy");
const convertUtils = artifacts.require("ConvertUtils");
const domainManager = artifacts.require("DomainManager");
const simpleMap = artifacts.require("SimpleMap");
const millionDaiToken = artifacts.require("MillionDaiToken");
const millionDai = artifacts.require("MillionDai");
const fakeRToken = artifacts.require("FakeRToken");
const fakeERC20 = artifacts.require("FakeERC20");

contract("When testing MillionDai, it:", async accounts => {
    it("is under controlled access with good setup", async () => {
        let cu = await convertUtils.deployed();
        let dm = await domainManager.deployed();
        let rdai = await fakeRToken.deployed();
        let dai = await fakeERC20.deployed();
        let registry = await akap.at(await dm.akap());
        let rootPtr = await dm.domain();

        // Check setup
        let md = await millionDai.deployed();
        await expectRevert.unspecified(md.erc721());
        await expectRevert.unspecified(md.dai());
        await expectRevert.unspecified(md.rdai());
        await expectRevert.unspecified(md.dataMap());

        await expectRevert.unspecified(md.adminRootPtr());
        await expectRevert.unspecified(md.adminPtr());

        assert.equal(await registry.seeAddress(rootPtr), millionDai.address);

        md = await millionDai.at(akaProxy.address);
        let erc721Ptr = await md.erc721Ptr();
        let dataMapPtr = await md.dataMapPtr();
        assert.isNotNull(erc721Ptr);
        assert.isNotNull(dataMapPtr);

        assert.equal(await registry.seeAddress(erc721Ptr), millionDaiToken.address);
        //assert.equal(await registry.seeAddress(dataMapPtr), simpleMap.address);

        mdt = await millionDaiToken.deployed();
        let tokenAccessPtr = await mdt.tokenAccessPtr();
        assert.isNotNull(tokenAccessPtr);
        assert.equal(await registry.seeAddress(tokenAccessPtr), akaProxy.address);

        // Check direct access
        await expectRevert(mdt.mint(accounts[1], 0), "No token access");
        assert.isFalse(await mdt.exists(0));
        await expectRevert(mdt.setTokenURI(0, "https://milliondai.website", {from: accounts[1]}), "No token access");
        await expectRevert(mdt.burn(accounts[1], 0), "No token access");

        let datamap = await simpleMap.at(await md.dataMap());
        await datamap.put([0], [1]);
        assert.isNotNull(await datamap.get([0]));
        await datamap.remove([0]);
        assert.isNull(await datamap.get([0]));
        await expectRevert(datamap.put([0], [1], {from: accounts[1]}), "SimpleMap: Not approved for all");

        let daimap = await simpleMap.at(await md.daiMap());
        await daimap.put([0], [1]);
        assert.isNotNull(await daimap.get([0]));
        await daimap.remove([0]);
        assert.isNull(await daimap.get([0]));
        await expectRevert(daimap.put([0], [1], {from: accounts[1]}), "SimpleMap: Not approved for all");

        let tileBlockMap = await simpleMap.at(await md.tileBlockMap());
        await tileBlockMap.put([0], [1]);
        assert.isNotNull(await tileBlockMap.get([0]));
        await tileBlockMap.remove([0]);
        assert.isNull(await tileBlockMap.get([0]));
        await expectRevert(tileBlockMap.put([0], [1], {from: accounts[1]}), "SimpleMap: Not approved for all");

        // Check functions that require admin
        let adminRootPtr = await md.adminRootPtr();
        let adminPtr = await md.adminPtr();
        assert.isNotNull(adminRootPtr);
        assert.isNotNull(adminPtr);
        assert.isTrue(await registry.exists(adminPtr));

        let nonAdminPtr = await md.adminPtr({from: accounts[1]});
        assert.isNotNull(nonAdminPtr);
        assert.isFalse(await registry.exists(nonAdminPtr));

        assert.equal("0x0000000000000000000000000000000000000000", await dai.approvedSpender());
        assert.equal("0", (await dai.approval()).toString(16));
        let tx1 = await md.withHat([accounts[1]], [100]);
        assert.isTrue(tx1.receipt.rawLogs.map(x => x.address).includes(rdai.address));
        assert.isTrue(tx1.receipt.rawLogs.map(x => x.topics[0]).includes(web3.utils.keccak256("CreateHatDebug(address[],uint32[],bool)")));
        assert.equal(rdai.address, await dai.approvedSpender());
        assert.equal("ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", (await dai.approval()).toString(16));

        await expectRevert(md.withHat([accounts[1]], [100], {from: accounts[1]}), "AKAP: operator query for nonexistent node");

        await dm.claim(await md.adminRootPtr(), await cu.addressToBytes(accounts[1]));
        await expectRevert(md.withHat([accounts[1]], [100], {from: accounts[1]}), "Not admin");

        await registry.setSeeAddress(nonAdminPtr, accounts[1]);
        let tx2 = await md.withHat([accounts[1]], [100], {from: accounts[1]});
        assert.isTrue(tx2.receipt.rawLogs.map(x => x.address).includes(rdai.address));
        assert.isTrue(tx2.receipt.rawLogs.map(x => x.topics[0]).includes(web3.utils.keccak256("CreateHatDebug(address[],uint32[],bool)")));
    });

    it("is possible to mint and burn", async () => {
        let lower = web3.utils.toBN("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff").div(web3.utils.toBN("2"));
        let lower1 = lower.add(web3.utils.toBN("1"));
        let lower2 = lower.add(web3.utils.toBN("2"));
        let upper = lower.add(web3.utils.toBN("9999"));
        let upper1 = upper.add(web3.utils.toBN("1"));
        let upper2 = upper.add(web3.utils.toBN("2"));

        let md = await millionDai.at(akaProxy.address);
        let mdt = await millionDaiToken.deployed();
        let rdai = await fakeRToken.deployed();
        let dai = await fakeERC20.deployed();

        await expectRevert(md.enter(lower1, web3.utils.toWei("99"), {from: accounts[1]}), "Insufficient price");
        assert.equal("0", (await md.tilePrice(lower1)).toString(10));
        assert.isFalse(await mdt.exists(lower1));
        await md.enter(lower1, web3.utils.toWei("110"), {from: accounts[1]});
        assert.isTrue(await mdt.exists(lower1));
        assert.equal(accounts[1], await mdt.ownerOf(lower1));

        let priceInDai = 110;
        let price = web3.utils.toBN(priceInDai).mul(web3.utils.toBN(10).pow(web3.utils.toBN(await dai.decimals())));
        assert.equal(price.toString(10), (await md.tilePrice(lower1)).toString(10));

        await md.enter(lower1, web3.utils.toWei("100"), {from: accounts[1]});
        assert.equal(accounts[1], await mdt.ownerOf(lower1));

        priceInDai = 100;
        price = web3.utils.toBN(priceInDai).mul(web3.utils.toBN(10).pow(web3.utils.toBN(await dai.decimals())));
        assert.equal(price.toString(10), (await md.tilePrice(lower1)).toString(10));

        await md.enter(lower1, web3.utils.toWei("101"));
        assert.equal(accounts[0], await mdt.ownerOf(lower1));

        priceInDai = 101;
        price = web3.utils.toBN(priceInDai).mul(web3.utils.toBN(10).pow(web3.utils.toBN(await dai.decimals())));
        assert.equal(price.toString(10), (await md.tilePrice(lower1)).toString(10));

        await expectRevert(md.exit(lower1, {from: accounts[1]}), "ERC721: burn of token that is not own");
        await md.enter(lower1, web3.utils.toWei("102"), {from: accounts[2]});
        assert.equal(accounts[2], await mdt.ownerOf(lower1));

        priceInDai = 102;
        price = web3.utils.toBN(priceInDai).mul(web3.utils.toBN(10).pow(web3.utils.toBN(await dai.decimals())));
        assert.equal(price.toString(10), (await md.tilePrice(lower1)).toString(10));

        await expectRevert(md.enter(lower1, web3.utils.toWei("100"), {from: accounts[1]}), "Insufficient increase in price");
        await expectRevert(md.enter(lower1, web3.utils.toWei("102")), "Insufficient increase in price");
        await expectRevert(md.exit(lower1), "ERC721: burn of token that is not own");
        await md.exit(lower1, {from: accounts[2]});

        assert.equal("0", (await md.tilePrice(lower1)).toString(10));
        assert.isFalse(await mdt.exists(lower1));

        await expectRevert(md.exit(lower1, {from: accounts[2]}), "ERC721: owner query for nonexistent token");

        assert.equal(0, await mdt.totalSupply());
        let tx1 = await md.enter(lower, web3.utils.toWei("100"));
        let args1 = {
            tile: lower.toString(10),
            action: "0",
        };
        await expectEvent.inLogs(tx1.logs, "Tile", args1);
        assert.isTrue(tx1.receipt.rawLogs.map(x => x.address).includes(rdai.address));
        assert.isTrue(tx1.receipt.rawLogs.map(x => x.address).includes(dai.address));
        assert.isTrue(tx1.receipt.rawLogs.map(x => x.topics[0]).includes(web3.utils.keccak256("MintDebug(uint256)")));
        assert.isTrue(tx1.receipt.rawLogs.map(x => x.topics[0]).includes(web3.utils.keccak256("TransferFromDebug(address,address,uint256)")));
        assert.isFalse(tx1.receipt.rawLogs.map(x => x.topics[0]).includes(web3.utils.keccak256("RedeemAndTransferDebug(address,uint256)")));
        assert.equal(1, await mdt.totalSupply());

        await md.enter(lower2, web3.utils.toWei("100"));
        assert.equal(2, await mdt.totalSupply());
        await md.exit(lower);
        assert.equal(1, await mdt.totalSupply());
        let tx2 = await md.exit(lower2);
        let args2 = {
            tile: lower2.toString(10),
            action: "1",
        };
        await expectEvent.inLogs(tx2.logs, "Tile", args2);
        assert.isTrue(tx2.receipt.rawLogs.map(x => x.address).includes(rdai.address));
        assert.isFalse(tx2.receipt.rawLogs.map(x => x.address).includes(dai.address));
        assert.isFalse(tx2.receipt.rawLogs.map(x => x.topics[0]).includes(web3.utils.keccak256("MintDebug(uint256)")));
        assert.isFalse(tx2.receipt.rawLogs.map(x => x.topics[0]).includes(web3.utils.keccak256("TransferFromDebug(address,address,uint256)")));
        assert.isTrue(tx2.receipt.rawLogs.map(x => x.topics[0]).includes(web3.utils.keccak256("RedeemAndTransferDebug(address,uint256)")));
        assert.equal(0, await mdt.totalSupply());

        md.enter(upper, web3.utils.toWei("100"));
        md.exit(upper);

        await expectRevert(md.enter(upper1, web3.utils.toWei("100")), "Invalid tile");
        await expectRevert(md.enter(upper2, web3.utils.toWei("100")), "Invalid tile");
    });

    it("is possible to set and get data", async () => {
        let id1 = web3.utils.toBN("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff").div(web3.utils.toBN("2")).add(web3.utils.toBN("10"));
        let id2 = web3.utils.toBN("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff").div(web3.utils.toBN("2")).add(web3.utils.toBN("20"));

        let md = await millionDai.at(akaProxy.address);
        let cu = await convertUtils.deployed();

        await expectRevert(md.set(id1, await cu.sToBytes("Too short"), "Test URI"), "Wrong value size");
        await expectRevert(md.set(id1, await cu.sToBytes("Too long! 01234567890123456789012345678"), "Test URI"), "Wrong value size");
        await expectRevert(md.setTileValue(id1, await cu.sToBytes("Too short")), "Wrong value size");
        await expectRevert(md.setTileValue(id1, await cu.sToBytes("Too long! 01234567890123456789012345678")), "Wrong value size");

        let value1 = await cu.sToBytes("12345678901234567890123456789012345678");
        let value2 = await cu.sToBytes("12345678900034567890003456789000345678");
        let value3 = await cu.sToBytes("12345668900034566890003456689000345668");

        let tx0 = await md.enter(id1, web3.utils.toWei("200"), {from: accounts[1]});

        await expectRevert(md.set(id1, value1, "Test URI"), "Not owner");
        let tx1 = await md.set(id1, value1, "Test URI", {from: accounts[1]});
        let args1 = {
            tile: id1.toString(10),
            value: value1,
        };
        let args2 = {
            tile: id1.toString(10),
            uri: "Test URI",
        };
        await expectEvent(tx1, "Value", args1);
        await expectEvent(tx1, "URI", args2);

        let tile = await md.get(id1, {from: accounts[3]});
        assert.equal(value1, tile.value);
        assert.equal("Test URI", tile.uri);
        assert.equal(web3.utils.toWei("200"), tile.price);
        assert.equal(web3.utils.toWei("201"), tile.minNewPrice);
        assert.equal(accounts[1], tile.owner);
        assert.equal(tx0.receipt.blockNumber, tile.blockNumber)

        await expectRevert(md.setTileValue(id1, value2), "Not owner");
        let tx2 = await md.setTileValue(id1, value2, {from: accounts[1]});
        let args3 = {
            tile: id1.toString(10),
            value: value2,
        };
        await expectEvent(tx2, "Value", args3);

        tile = await md.get(id1);
        assert.equal(value2, tile.value);
        assert.equal("Test URI", tile.uri);
        assert.equal(web3.utils.toWei("200"), tile.price);
        assert.equal(web3.utils.toWei("201"), tile.minNewPrice);
        assert.equal(accounts[1], tile.owner);
        assert.equal(tx0.receipt.blockNumber, tile.blockNumber)

        await expectRevert(md.setTileURI(id1, "Test URI 2"), "Not owner");
        let tx3 = await md.setTileURI(id1, "Test URI 2", {from: accounts[1]});
        let args4 = {
            tile: id1.toString(10),
            uri: "Test URI 2",
        };
        await expectEvent(tx3, "URI", args4);

        tile = await md.get(id1);
        assert.equal(value2, tile.value);
        assert.equal("Test URI 2", tile.uri);
        assert.equal(web3.utils.toWei("200"), tile.price);
        assert.equal(web3.utils.toWei("201"), tile.minNewPrice);
        assert.equal(accounts[1], tile.owner);
        assert.equal(tx0.receipt.blockNumber, tile.blockNumber)

        await md.exit(id1, {from: accounts[1]});
        tile = await md.get(id1);
        assert.equal(value2, tile.value);
        assert.equal("", tile.uri);
        assert.equal(web3.utils.toWei("0"), tile.price);
        assert.equal(web3.utils.toWei("100"), tile.minNewPrice);
        assert.equal("0x0000000000000000000000000000000000000000", tile.owner);
        assert.equal(tx0.receipt.blockNumber, tile.blockNumber)

        await md.enter(id2, web3.utils.toWei("555"));
        let tx4 = await md.set(id2, value3, "Test URI");
        let args5 = {
            tile: id2.toString(10),
            value: value3,
        };
        let args6 = {
            tile: id2.toString(10),
            uri: "Test URI",
        };
        await expectEvent(tx4, "Value", args5);
        await expectEvent(tx4, "URI", args6);
    });

    it("is possible to vote on tiles", async () => {
        let id1 = web3.utils.toBN("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff").div(web3.utils.toBN("2")).add(web3.utils.toBN("123"));
        let id2 = web3.utils.toBN("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff").div(web3.utils.toBN("2")).add(web3.utils.toBN("10"));
        let id3 = web3.utils.toBN("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff").div(web3.utils.toBN("2")).add(web3.utils.toBN("20"));

        let md = await millionDai.at(akaProxy.address);

        let vote = await md.getVote(accounts[0]);
        assert.equal("0", vote.tile.toString(10));
        assert.equal("0", vote.blockNumber.toString(10));
        await expectRevert(md.vote(id1), "No tile");
        vote = await md.getVote(accounts[0]);
        assert.equal("0", vote.tile.toString(10));
        assert.equal("0", vote.blockNumber.toString(10));

        let tx1 = await md.vote(id2);
        let args1 = {
            tile: id2.toString(10),
            actor: accounts[0],
        };
        await expectEvent(tx1, "Vote", args1);
        vote = await md.getVote(accounts[0]);
        assert.equal(id2.toString(10), vote.tile.toString(10));
        assert.equal(tx1.receipt.blockNumber, vote.blockNumber.toString(10));

        vote = await md.getVote(accounts[1]);
        assert.equal("0", vote.tile.toString(10));
        assert.equal("0", vote.blockNumber.toString(10));
        let tx2 = await md.vote(id2, {from: accounts[1]});
        let args2 = {
            tile: id2.toString(10),
            actor: accounts[1],
        };
        await expectEvent(tx2, "Vote", args2);
        vote = await md.getVote(accounts[1]);
        assert.equal(id2.toString(10), vote.tile.toString(10));
        assert.equal(tx2.receipt.blockNumber, vote.blockNumber.toString(10));

        let tx3 = await md.vote(id3);
        let args3 = {
            tile: id3.toString(10),
            actor: accounts[0],
        };
        await expectEvent(tx3, "Vote", args3);
        vote = await md.getVote(accounts[0]);
        assert.equal(id3.toString(10), vote.tile.toString(10));
        assert.equal(tx3.receipt.blockNumber, vote.blockNumber.toString(10));

        vote = await md.getVote(accounts[1]);
        assert.equal(id2.toString(10), vote.tile.toString(10));
        assert.equal(tx2.receipt.blockNumber, vote.blockNumber.toString(10));
    });
});