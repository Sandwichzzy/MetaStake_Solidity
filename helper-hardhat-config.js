const { ethers } = require("hardhat");
const METANODE_PERBLOCK = ethers.parseEther("0.5");
const START_BLOCK = 0; // 从区块0开始，适合测试环境
const END_BLOCK = 1000000; // 足够大的结束区块号
const TEST_POOL_WEIGHT = ethers.parseEther("1");
const MIN_DEPOSIT_AMOUNT = ethers.parseEther("0.1");
const UNSTAKE_LOCKED_BLOCKS = 5;

module.exports = {
  METANODE_PERBLOCK,
  START_BLOCK,
  END_BLOCK,
  TEST_POOL_WEIGHT,
  MIN_DEPOSIT_AMOUNT,
  UNSTAKE_LOCKED_BLOCKS,
};
