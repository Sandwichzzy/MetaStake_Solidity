const { expect } = require("chai");
const {
  setupCompleteTestEnvironment,
  advanceBlocks,
} = require("../../helpers/test-setup");

describe("test unstake and withdraw function", () => {
  let contracts;

  beforeEach(async () => {
    // 使用完整的测试环境设置，包括池子创建
    contracts = await setupCompleteTestEnvironment();
  });

  describe("unstake function", () => {
    it("should allow user to unstake with locked period", async () => {
      const { metaNodeStakeProxy, user1 } = contracts;
      const depositAmount = ethers.parseEther("1");

      // 质押ETH
      await metaNodeStakeProxy
        .connect(user1)
        .depositETH({ value: depositAmount });

      // 检查质押是否成功
      const userInfoBefore = await metaNodeStakeProxy.user(0, user1.address);
      // console.log("质押后用户信息:", {
      //   stAmount: userInfoBefore.stAmount.toString(),
      //   finishedMetaNode: userInfoBefore.finishedMetaNode.toString(),
      //   pendingMetaNode: userInfoBefore.pendingMetaNode.toString(),
      // });

      // 请求解质押
      const tx = await metaNodeStakeProxy
        .connect(user1)
        .unstake(0, ethers.parseEther("0.5"));
      await tx.wait(); // 等待交易确认

      // 检查请求情况
      const userInfoAfter = await metaNodeStakeProxy.user(0, user1.address);
      // console.log("解质押后用户信息:", {
      //   stAmount: userInfoAfter.stAmount.toString(),
      //   finishedMetaNode: userInfoAfter.finishedMetaNode.toString(),
      //   pendingMetaNode: userInfoAfter.pendingMetaNode.toString(),
      // });

      // 使用新的 getter 函数获取解质押请求信息
      const requestsCount =
        await metaNodeStakeProxy.getUserUnstakeRequestsCount(0, user1.address);
      expect(requestsCount).to.equal(1);

      const [requestAmount, unlockBlocks] =
        await metaNodeStakeProxy.getUserUnstakeRequest(0, user1.address, 0);
      expect(requestAmount).to.equal(ethers.parseEther("0.5"));

      // 检查解锁区块
      const pool = await metaNodeStakeProxy.pool(0);
      const currentBlock = await ethers.provider.getBlockNumber();
      const expectedUnlockBlock =
        BigInt(currentBlock) + pool.unstakeLockedBlocks;

      console.log("解锁区块信息:", {
        currentBlock,
        unstakeLockedBlocks: pool.unstakeLockedBlocks.toString(),
        expectedUnlockBlock,
        actualUnlockBlock: unlockBlocks.toString(),
      });

      expect(unlockBlocks).to.equal(expectedUnlockBlock);
    });

    it("should not allow unstake more than staked amount", async () => {
      const { metaNodeStakeProxy, user1 } = contracts;
      const depositAmount = ethers.parseEther("1");
      const unstakeAmount = ethers.parseEther("2"); // 超过质押量

      // 质押ETH
      await metaNodeStakeProxy
        .connect(user1)
        .depositETH({ value: depositAmount });

      // 尝试解质押超过质押量的金额
      await expect(
        metaNodeStakeProxy.connect(user1).unstake(0, unstakeAmount)
      ).to.be.revertedWith("Not enough staking token balance");
    });

    it("should allow multiple unstake requests", async () => {
      const { metaNodeStakeProxy, user1, pools } = contracts;
      const depositAmount = ethers.parseEther("2");

      // 质押ETH
      await metaNodeStakeProxy
        .connect(user1)
        .depositETH({ value: depositAmount });

      // 第一次解质押
      await metaNodeStakeProxy
        .connect(user1)
        .unstake(pools.ethPoolId, ethers.parseEther("0.5"));

      // 第二次解质押
      await metaNodeStakeProxy
        .connect(user1)
        .unstake(pools.ethPoolId, ethers.parseEther("0.5"));

      // 检查解质押请求数量
      const withdrawInfo = await metaNodeStakeProxy.withdrawAmount(
        0,
        user1.address
      );
      expect(withdrawInfo.requestAmount).to.equal(ethers.parseEther("1"));
      expect(withdrawInfo.pendingWithdrawAmount).to.equal(0); // 还没有解锁
    });
  });

  describe("withdraw function", () => {
    it("should allow withdrawal after lock period", async () => {
      const { metaNodeStakeProxy, user1, pools } = contracts;
      const depositAmount = ethers.parseEther("1");
      //质押并请求取款
      await metaNodeStakeProxy
        .connect(user1)
        .depositETH({ value: depositAmount });
      await metaNodeStakeProxy
        .connect(user1)
        .unstake(pools.ethPoolId, depositAmount);

      //获取锁定区块数
      const pool = await metaNodeStakeProxy.pool(pools.ethPoolId);
      const lockedBlocks = pool.unstakeLockedBlocks;
      //推进区块知直到解锁
      await advanceBlocks(lockedBlocks);

      //检查可以提取的金额
      const [requestAmount, pendingWithdrawAmount] =
        await metaNodeStakeProxy.withdrawAmount(pools.ethPoolId, user1.address);

      expect(pendingWithdrawAmount).to.equal(depositAmount);

      //执行提取
      const initialBalance = await ethers.provider.getBalance(user1.address);
      const withdrawTx = await metaNodeStakeProxy
        .connect(user1)
        .withdraw(pools.ethPoolId);
      const receipt = await withdrawTx.wait();

      // 验证事件
      await expect(withdrawTx)
        .to.emit(metaNodeStakeProxy, "Withdraw")
        .withArgs(
          user1.address,
          pools.ethPoolId,
          pendingWithdrawAmount,
          receipt.blockNumber
        );

      //检查余额增加
      const finalBalance = await ethers.provider.getBalance(user1.address);
      const addBalance = finalBalance - initialBalance;
      // console.log(addBalance + "addbalance");

      expect(addBalance).to.be.closeTo(
        depositAmount,
        ethers.parseEther("0.01") //gas费
      );
    });
  });
});
