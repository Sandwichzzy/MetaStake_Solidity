const { expect } = require("chai");
const {
  setupCompleteTestEnvironment,
  advanceBlocks,
} = require("../../helpers/test-setup");

describe("Completet Staking Cycle", async () => {
  let contracts;

  beforeEach(async () => {
    // 使用完整的测试环境设置
    contracts = await setupCompleteTestEnvironment();
  });

  it("should calculate pending rewards correctly", async () => {
    const { metaNodeStakeProxy, user1, deployer, stakeToken } = contracts;
    // 1. 首先向合约提供足够的MetaNode代币用于奖励分发
    const rewardTokenAmount = ethers.parseEther("10000");
    await stakeToken
      .connect(deployer)
      .transfer(metaNodeStakeProxy.target, rewardTokenAmount);
    console.log("向合约转移MetaNode代币:", rewardTokenAmount.toString());

    // 2. 用户质押
    const depositAmount = ethers.parseEther("100");
    await stakeToken
      .connect(user1)
      .approve(metaNodeStakeProxy.target, depositAmount);
    await metaNodeStakeProxy.connect(user1).deposit(1, depositAmount);

    // 查看质押后的用户信息
    const userInfoAfterDeposit = await metaNodeStakeProxy.user(
      1,
      user1.address
    );
    console.log("质押后用户信息:", {
      stAmount: userInfoAfterDeposit.stAmount.toString(),
      finishedMetaNode: userInfoAfterDeposit.finishedMetaNode.toString(),
      pendingMetaNode: userInfoAfterDeposit.pendingMetaNode.toString(),
    });

    // 3. 推进区块产生奖励
    await advanceBlocks(20);

    // 4. 检查待领取奖励
    const pendingBefore = await metaNodeStakeProxy.pendingMetaNode(
      1,
      user1.address
    );
    expect(pendingBefore).to.be.gt(0);
    console.log("待领取奖励:", pendingBefore.toString());

    // 5. 领取奖励
    const initialMetaNodeBalance = await stakeToken.balanceOf(user1.address);
    const claimTx = await metaNodeStakeProxy.connect(user1).claim(1);

    // 检查奖励到账 - 注意：claim交易会产生额外的区块，所以实际奖励会比pendingBefore多一个区块的奖励
    const finalMetaNodeBalance = await stakeToken.balanceOf(user1.address);
    const actualReward = finalMetaNodeBalance - initialMetaNodeBalance;

    // 计算预期的额外奖励（由于claim交易产生的额外区块）
    // 每区块奖励 = 0.5 ETH, 用户权重比例 = 1/2 = 50%, 所以每区块用户应得 = 0.25 ETH
    const rewardPerBlock = ethers.parseEther("0.25"); // 0.5 * (1/2)
    const expectedReward = pendingBefore + rewardPerBlock;

    console.log("实际获得奖励:", actualReward.toString());
    console.log("预期奖励(含claim区块):", expectedReward.toString());
    expect(actualReward).to.equal(expectedReward);

    // 6. 请求取款部分资金
    const unstakeAmount = ethers.parseEther("50");
    await metaNodeStakeProxy.connect(user1).unstake(1, unstakeAmount);

    // 7. 等待锁定期满
    const pool = await metaNodeStakeProxy.pool(1);
    await advanceBlocks(pool.unstakeLockedBlocks);

    // 8. 提取资金
    const initialTokenBalance = await stakeToken.balanceOf(user1.address);
    await metaNodeStakeProxy.connect(user1).withdraw(1);

    // 检查代币到账
    const finalTokenBalance = await stakeToken.balanceOf(user1.address);
    expect(finalTokenBalance - initialTokenBalance).to.equal(unstakeAmount);

    // 9. 验证用户剩余质押金额
    const userInfo = await metaNodeStakeProxy.user(1, user1.address);
    expect(userInfo.stAmount).to.equal(depositAmount - unstakeAmount);
  });
});
