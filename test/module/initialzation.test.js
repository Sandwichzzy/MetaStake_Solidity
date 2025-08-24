const { expect } = require("chai");
const { ethers } = require("hardhat");
const { getNamedAccounts } = require("hardhat");

describe("MetaNodeStake Initialization", () => {
  let metaNodeStake;
  let stakeToken;
  let deployer;

  beforeEach(async () => {
    await deployments.fixture(["all"]);
    deployer = (await getNamedAccounts()).deployer;
    metaNodeStake = await ethers.getContractAt(
      "MetaNodeStake",
      (
        await deployments.get("MetaNodeStake")
      ).address
    );
    stakeToken = await ethers.getContractAt(
      "StakeTokenERC20",
      (
        await deployments.get("StakeTokenERC20")
      ).address
    );
  });

  it("should initialize with correct parameters", async () => {
    const startBlock = (await metaNodeStake.START_BLOCK()).toNumber();
    const endBlock = (await metaNodeStake.END_BLOCK()).toNumber();
    const metaNodePerBlock = (
      await metaNodeStake.METANODE_PERBLOCK()
    ).toNumber();

    expect(startBlock).to.equal(START_BLOCK);
    expect(endBlock).to.equal(END_BLOCK);
    expect(metaNodePerBlock).to.equal(METANODE_PERBLOCK);
  });
});
