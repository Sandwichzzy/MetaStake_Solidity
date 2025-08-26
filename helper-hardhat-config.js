const { ethers } = require("hardhat");

const METANODE_PERBLOCK = ethers.parseEther("0.5");
const TEST_POOL_WEIGHT = ethers.parseEther("1");
const MIN_DEPOSIT_AMOUNT = ethers.parseEther("0.1");
const UNSTAKE_LOCKED_BLOCKS = 5;

// 网络特定配置
const networkConfig = {
  // 本地开发网络
  31337: {
    name: "localhost",
    START_BLOCK: 0,
    END_BLOCK: 1000000,
  },
  // Sepolia 测试网
  11155111: {
    name: "sepolia",
    START_BLOCK: 9064730, // 当前区块高度附近
    END_BLOCK: 12000000, // 未来足够远的区块高度 (约1年后)
  },
  // 以太坊主网
  1: {
    name: "mainnet",
    START_BLOCK: 18000000, // 需要根据部署时实际区块设置
    END_BLOCK: 20000000, // 需要根据项目规划设置
  },
};

// 获取当前网络配置的函数
function getNetworkConfig(chainId) {
  const config = networkConfig[chainId];
  if (!config) {
    throw new Error(`Network config not found for chainId: ${chainId}`);
  }
  return config;
}

// 导出默认配置（用于测试环境）
const START_BLOCK = 0;
const END_BLOCK = 1000000;

module.exports = {
  METANODE_PERBLOCK,
  START_BLOCK,
  END_BLOCK,
  TEST_POOL_WEIGHT,
  MIN_DEPOSIT_AMOUNT,
  UNSTAKE_LOCKED_BLOCKS,
  networkConfig,
  getNetworkConfig,
};
