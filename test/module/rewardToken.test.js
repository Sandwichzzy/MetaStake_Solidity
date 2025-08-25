const { expect } = require("chai");
const {
  setupCompleteTestEnvironment,
  advanceBlocks,
  getCurrentBlock,
} = require("../../helpers/test-setup");

describe("RewardToken", () => {
  let contracts;

  beforeEach(async () => {
    // 使用完整的测试环境设置
    contracts = await setupCompleteTestEnvironment();
  });

  it("should calculate pending rewards correctly", async () => {
    const { metaNodeStakeProxy, user1 } = contracts;

    const depositAmount = ethers.parseEther("1");
    //质押ETH
    await metaNodeStakeProxy
      .connect(user1)
      .depositETH({ value: ethers.parseEther("1") });

    //推进10个区块 产生奖励
    await advanceBlocks(10);

    //计算待领取奖励
    const pendingRewards = await metaNodeStakeProxy.pendingMetaNode(
      0,
      user1.address
    );
    expect(pendingRewards).to.be.gt(0);

    // 手动验证奖励计算
    const pool = await metaNodeStakeProxy.pool(0);
    const currentBlock = await getCurrentBlock();
    const multiplier = await metaNodeStakeProxy.getMultiplier(
      pool.lastRewardBlock,
      currentBlock
    );

    // 使用正确的 ethers v6 语法
    const totalPoolWeight = await metaNodeStakeProxy.totalPoolWeight();
    const metaNodeForPool = (multiplier * pool.poolWeight) / totalPoolWeight;

    const accMetaNodePerST =
      (metaNodeForPool * ethers.parseEther("1")) / pool.stTokenAmount;
    const expectedReward =
      (depositAmount * accMetaNodePerST) / ethers.parseEther("1");

    // console.log("pendingRewards:", pendingRewards.toString());
    // console.log("expectedReward:", expectedReward.toString());
    // console.log("current block:", currentBlock);
    // console.log("pool.lastRewardBlock:", pool.lastRewardBlock.toString());
    // console.log("multiplier:", multiplier.toString());
    //有一定误差 - 允许千分之一的误差
    const tolerance = expectedReward / 1000n;
    expect(pendingRewards).to.be.closeTo(expectedReward, tolerance);
  });

  it("should update rewards when block number increases", async function () {
    const { metaNodeStakeProxy, user1 } = contracts;
    const depositAmount = ethers.parseEther("1");

    // 质押ETH
    await metaNodeStakeProxy
      .connect(user1)
      .depositETH({ value: depositAmount });

    // 记录初始奖励
    const initialPending = await metaNodeStakeProxy.pendingMetaNode(
      0,
      user1.address
    );

    // 推进区块
    await advanceBlocks(5);

    // 检查奖励增加
    const newPending = await metaNodeStakeProxy.pendingMetaNode(
      0,
      user1.address
    );
    expect(newPending).to.be.gt(initialPending);
  });

  it("should handle zero reward claim", async () => {
    const { metaNodeStakeProxy, user1, stakeToken } = contracts;
    // 不质押，直接尝试领取奖励
    await expect(metaNodeStakeProxy.connect(user1).claim(0)).to.not.be.reverted;

    const balance = await stakeToken.balanceOf(user1.address);
    expect(balance).to.equal(ethers.parseEther("1000"));
  });

  it("should handle claim MetaNode get correct reward", async function () {
    const { metaNodeStakeProxy, user1, deployer, stakeToken } = contracts;

    // 首先向合约提供足够的MetaNode代币用于奖励分发
    const rewardTokenAmount = ethers.parseEther("10000");
    await stakeToken
      .connect(deployer)
      .transfer(metaNodeStakeProxy.target, rewardTokenAmount);
    console.log("向合约转移MetaNode代币:", rewardTokenAmount.toString());

    // 质押ETH
    const depositAmount = ethers.parseEther("100");
    await metaNodeStakeProxy
      .connect(user1)
      .depositETH({ value: depositAmount });

    // 设置MetaNodePerBlock
    const metaNodePerBlock = ethers.parseEther("1");
    await metaNodeStakeProxy
      .connect(deployer)
      .setMetaNodePerBlock(metaNodePerBlock);

    // 推进区块产生奖励
    const blocksToAdvance = 10;
    await advanceBlocks(blocksToAdvance);

    // 检查合约中的MetaNode代币余额
    const contractMetaNodeBalance = await stakeToken.balanceOf(
      metaNodeStakeProxy.target
    );
    console.log("合约MetaNode代币余额:", contractMetaNodeBalance.toString());

    // 领取奖励前的状态
    const initialBalance = await stakeToken.balanceOf(user1.address);
    console.log("用户领取前余额:", initialBalance.toString());

    // 领取奖励
    await metaNodeStakeProxy.connect(user1).claim(0);

    const pendingMetaNode = await metaNodeStakeProxy.pendingMetaNode(
      0,
      user1.address
    );
    console.log("领取后pendingMetaNode", pendingMetaNode);
    expect(pendingMetaNode).to.equal(0);

    // 计算实际收到的奖励
    const finalBalance = await stakeToken.balanceOf(user1.address);
    console.log("用户领取后余额:", finalBalance.toString());
    const actualReward = finalBalance - initialBalance;
    console.log("实际收到的奖励:", actualReward.toString());

    expect(actualReward).to.gt(0);
  });
});
