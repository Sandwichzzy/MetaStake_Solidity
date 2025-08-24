const { expect } = require("chai");
const {
  setupCompleteTestEnvironment,
  approveTokens,
} = require("../../helpers/test-setup");

describe("StakeFunction", () => {
  let contracts;

  beforeEach(async () => {
    // 使用共享的测试环境设置
    contracts = await setupCompleteTestEnvironment();
  });

  it("should allow ETH staking", async () => {
    const { metaNodeStakeProxy, user1, pools } = contracts;
    const depositAmount = ethers.parseEther("1");

    await expect(
      metaNodeStakeProxy.connect(user1).depositETH({ value: depositAmount })
    )
      .to.emit(metaNodeStakeProxy, "Deposit")
      .withArgs(user1.address, pools.ethPoolId, depositAmount);

    const userInfo = await metaNodeStakeProxy.user(
      pools.ethPoolId,
      user1.address
    );
    expect(userInfo.stAmount).to.equal(depositAmount);
  });

  it("should allow ERC20 staking", async () => {
    const { metaNodeStakeProxy, stakeToken, user1, pools } = contracts;
    const depositAmount = ethers.parseEther("1");

    // 批准合约使用用户的代币
    await approveTokens(stakeToken, user1, metaNodeStakeProxy, depositAmount);

    await expect(
      metaNodeStakeProxy
        .connect(user1)
        .deposit(pools.erc20PoolId, depositAmount)
    )
      .to.emit(metaNodeStakeProxy, "Deposit")
      .withArgs(user1.address, pools.erc20PoolId, depositAmount);

    const userInfo = await metaNodeStakeProxy.user(
      pools.erc20PoolId,
      user1.address
    );
    expect(userInfo.stAmount).to.equal(depositAmount);
  });

  it("should reject staking below minimum amount", async () => {
    const { metaNodeStakeProxy, user1 } = contracts;
    const depositAmount = ethers.parseEther("0.05");

    await expect(
      metaNodeStakeProxy.connect(user1).depositETH({ value: depositAmount })
    ).to.be.revertedWith("deposit amount is too small");
  });
});
