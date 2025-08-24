const { expect } = require("chai");
const { setupCompleteTestEnvironment } = require("../../helpers/test-setup");

describe("RewardToken", () => {
  let contracts;

  beforeEach(async () => {
    // 使用完整的测试环境设置
    contracts = await setupCompleteTestEnvironment();
  });

  //   it("should allow admin to set MetaNode reward token", async () => {
  //     const { metaNodeStakeProxy, stakeToken } = contracts;

  //     // 使用已部署的 StakeToken 作为奖励代币进行测试
  //     const currentRewardToken = await metaNodeStakeProxy.MetaNode();

  //     // 设置新的奖励代币
  //     await metaNodeStakeProxy.setMetaNode(
  //       stakeToken.target || stakeToken.address
  //     );

  //     const newRewardToken = await metaNodeStakeProxy.MetaNode();
  //     expect(newRewardToken).to.equal(stakeToken.target || stakeToken.address);
  //   });

  //   it("should not allow non-admin to set reward token", async () => {
  //     const { metaNodeStakeProxy, stakeToken, user1 } = contracts;

  //     await expect(
  //       metaNodeStakeProxy
  //         .connect(user1)
  //         .setMetaNode(stakeToken.target || stakeToken.address)
  //     ).to.be.revertedWithCustomError(
  //       metaNodeStakeProxy,
  //       "AccessControlUnauthorizedAccount"
  //     );
  //   });

  //   it("should emit SetMetaNode event when setting reward token", async () => {
  //     const { metaNodeStakeProxy, stakeToken } = contracts;

  //     const tokenAddress = stakeToken.target || stakeToken.address;
  //     const tx = await metaNodeStakeProxy.setMetaNode(tokenAddress);

  //     await expect(tx)
  //       .to.emit(metaNodeStakeProxy, "SetMetaNode")
  //       .withArgs(tokenAddress);
  //   });
});
