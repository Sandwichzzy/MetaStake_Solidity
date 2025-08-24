const { ethers, deployments } = require("hardhat");
const { UNSTAKE_LOCKED_BLOCKS } = require("../helper-hardhat-config");

/**
 * 标准测试设置 - 为所有测试文件提供一致的初始环境
 * @returns {Object} 包含所有必要的合约实例和账户
 */
async function setupTestEnvironment() {
  // 部署所有合约
  await deployments.fixture(["all"]);

  // 获取测试账户
  const [deployer, user1, user2, user3] = await ethers.getSigners();

  // 获取 StakeToken 合约
  const stakeTokenDeployment = await deployments.get("StakeTokenERC20");
  const stakeToken = await ethers.getContractAt(
    "StakeTokenERC20",
    stakeTokenDeployment.address
  );

  // 获取 MetaNodeStake 代理合约
  const metaStakeDeployment = await deployments.get("MetaNodeStake");
  const metaNodeStakeProxy = await ethers.getContractAt(
    "MetaNodeStake",
    metaStakeDeployment.address
  );

  // 获取 MetaNodeStake 实现合约
  const implDeployment = await deployments.get("MetaNodeStakeImplementation");
  const metaNodeStakeImpl = await ethers.getContractAt(
    "MetaNodeStake",
    implDeployment.address
  );

  return {
    // 合约实例
    stakeToken,
    metaNodeStakeProxy,
    metaNodeStakeImpl,
    // 账户
    deployer,
    user1,
    user2,
    user3,
    // 部署信息
    deployments: {
      stakeToken: stakeTokenDeployment,
      metaStake: metaStakeDeployment,
      metaStakeImpl: implDeployment,
    },
  };
}

/**
 * 初始化池设置 - 创建必要的质押池
 * @param {Object} contracts - 合约实例对象
 */
async function initializePools(contracts) {
  const { metaNodeStakeProxy, stakeToken } = contracts;

  // 添加ETH池作为第一个池（池ID 0）
  // 这是合约要求的，第一个池必须是ETH池
  await metaNodeStakeProxy.addPool(
    ethers.ZeroAddress, // ETH pool address
    ethers.parseEther("1"), // pool weight
    ethers.parseEther("0.1"), // min deposit amount for ETH
    UNSTAKE_LOCKED_BLOCKS, // unstake locked blocks
    false
  );

  // 添加ERC20代币池（池ID 1）
  const tokenAddress = stakeToken.target || stakeToken.address;
  await metaNodeStakeProxy.addPool(
    tokenAddress, // ERC20 token address
    ethers.parseEther("1"), // pool weight
    ethers.parseEther("0.1"), // min deposit amount
    UNSTAKE_LOCKED_BLOCKS, // unstake locked blocks
    false
  );

  return {
    ethPoolId: 0,
    erc20PoolId: 1,
  };
}

/**
 * 分发测试代币 - 给测试用户分配足够的代币
 * @param {Object} contracts - 合约实例对象
 * @param {string} amount - 分发数量 (默认1000 ETH)
 */
async function distributeTestTokens(contracts, amount = "1000") {
  const { stakeToken, deployer, user1, user2, user3 } = contracts;
  const transferAmount = ethers.parseEther(amount);

  // 给每个测试用户分配代币
  const users = [user1, user2, user3];
  for (const user of users) {
    await stakeToken.connect(deployer).transfer(user.address, transferAmount);
  }

  return { transferAmount };
}

/**
 * 完整的测试环境设置 - 包含环境初始化、池创建和代币分发
 * @param {Object} options - 配置选项
 * @param {boolean} options.includePools - 是否创建池 (默认: true)
 * @param {boolean} options.distributeTokens - 是否分发代币 (默认: true)
 * @param {string} options.tokenAmount - 代币分发数量 (默认: "1000")
 */
async function setupCompleteTestEnvironment(options = {}) {
  const {
    includePools = true,
    distributeTokens = true,
    tokenAmount = "1000",
  } = options;

  // 1. 基础环境设置
  const contracts = await setupTestEnvironment();

  let pools = null;
  let tokens = null;

  // 2. 可选：创建池
  if (includePools) {
    pools = await initializePools(contracts);
  }

  // 3. 可选：分发代币
  if (distributeTokens) {
    tokens = await distributeTestTokens(contracts, tokenAmount);
  }

  return {
    ...contracts,
    pools,
    tokens,
  };
}

/**
 * 创建用户批准 - 批准合约使用用户的代币
 * @param {Object} stakeToken - StakeToken 合约实例
 * @param {Object} user - 用户签名者
 * @param {Object} spender - 被批准的合约地址
 * @param {string} amount - 批准数量
 */
async function approveTokens(stakeToken, user, spender, amount) {
  const spenderAddress = spender.target || spender.address;
  await stakeToken.connect(user).approve(spenderAddress, amount);
}

module.exports = {
  setupTestEnvironment,
  initializePools,
  distributeTestTokens,
  setupCompleteTestEnvironment,
  approveTokens,
};
