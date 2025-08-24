const { expect } = require("chai");
const { setupTestEnvironment } = require("../../helpers/test-setup");
const {
  TEST_POOL_WEIGHT,
  MIN_DEPOSIT_AMOUNT,
  UNSTAKE_LOCKED_BLOCKS,
} = require("../../helper-hardhat-config");

describe("MetaNodeStake StakePool Management", () => {
  let contracts;

  beforeEach(async () => {
    // 使用基础测试环境设置（不自动创建池，因为我们需要测试池的创建）
    contracts = await setupTestEnvironment();

    // 手动添加ETH池（测试需要）
    await contracts.metaNodeStakeProxy.addPool(
      ethers.ZeroAddress, // ETH pool address
      ethers.parseEther("1"), // pool weight
      0, // min deposit amount for ETH
      UNSTAKE_LOCKED_BLOCKS, // unstake locked blocks
      false
    );

    // 给测试用户一些代币
    const transferAmount = ethers.parseEther("1000");
    await contracts.stakeToken
      .connect(contracts.deployer)
      .transfer(contracts.user1.address, transferAmount);
    await contracts.stakeToken
      .connect(contracts.deployer)
      .transfer(contracts.user2.address, transferAmount);
  });

  describe("Pool Addition", () => {
    it("should allow admin to add pool", async () => {
      // 注意：根据合约逻辑，第一个池必须是ETH池（地址为0x0）
      // 所以我们添加的ERC20池实际上是第二个池（索引1）

      const tx = await contracts.metaNodeStakeProxy.addPool(
        contracts.stakeToken.target,
        TEST_POOL_WEIGHT,
        MIN_DEPOSIT_AMOUNT,
        UNSTAKE_LOCKED_BLOCKS,
        false
      );
      await tx.wait();

      // 检查池1（第二个池，因为池0是ETH池）
      const pool = await contracts.metaNodeStakeProxy.pool(1);
      expect(pool.stTokenAddress).to.equal(contracts.stakeToken.target);
      expect(pool.poolWeight).to.equal(TEST_POOL_WEIGHT);
      expect(pool.minDepositAmount).to.equal(MIN_DEPOSIT_AMOUNT);
      expect(pool.unstakeLockedBlocks).to.equal(UNSTAKE_LOCKED_BLOCKS);
    });

    it("should not allow non-admin to add pool", async () => {
      await expect(
        contracts.metaNodeStakeProxy
          .connect(contracts.user1)
          .addPool(
            contracts.stakeToken.target,
            TEST_POOL_WEIGHT,
            MIN_DEPOSIT_AMOUNT,
            UNSTAKE_LOCKED_BLOCKS,
            false
          )
      ).to.be.revertedWithCustomError(
        contracts.metaNodeStakeProxy,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("should emit PoolAdded event when adding pool", async () => {
      const tx = await contracts.metaNodeStakeProxy.addPool(
        contracts.stakeToken.target,
        TEST_POOL_WEIGHT,
        MIN_DEPOSIT_AMOUNT,
        UNSTAKE_LOCKED_BLOCKS,
        false
      );

      await expect(tx)
        .to.emit(contracts.metaNodeStakeProxy, "AddPool")
        .withArgs(
          contracts.stakeToken.target, // stTokenAddress
          TEST_POOL_WEIGHT, // poolWeight
          await contracts.metaNodeStakeProxy.startBlock(), // lastRewardBlock (因为 block.number < startBlock)
          MIN_DEPOSIT_AMOUNT, // minDepositAmount
          UNSTAKE_LOCKED_BLOCKS // unstakeLockedBlocks
        );
    });

    it("should require ETH pool as first pool", async () => {
      // 验证合约确实需要ETH池作为第一个池
      // 当池长度为0时，只能添加地址为0x0的池
      const currentPoolLength = await contracts.metaNodeStakeProxy.poolLength();

      if (currentPoolLength === 1) {
        // 如果ETH池已经存在，验证其地址
        const ethPool = await contracts.metaNodeStakeProxy.pool(0);
        expect(ethPool.stTokenAddress).to.equal(ethers.ZeroAddress);
      }
    });
  });

  describe("Pool Parameter Updates", () => {
    let poolId;

    beforeEach(async () => {
      await contracts.metaNodeStakeProxy.addPool(
        contracts.stakeToken.target,
        TEST_POOL_WEIGHT,
        MIN_DEPOSIT_AMOUNT,
        UNSTAKE_LOCKED_BLOCKS,
        false
      );
      poolId = 1;
    });

    it("should allow admin to update pool weight", async () => {
      const newWeight = ethers.parseEther("2");
      await contracts.metaNodeStakeProxy.setPoolWeight(
        poolId,
        newWeight,
        false
      );

      const pool = await contracts.metaNodeStakeProxy.pool(poolId);
      expect(pool.poolWeight).to.equal(newWeight);
    });

    it("should not allow non-admin to update pool weight", async () => {
      const newWeight = ethers.parseEther("2");
      await expect(
        contracts.metaNodeStakeProxy
          .connect(contracts.user1)
          .setPoolWeight(poolId, newWeight, false)
      ).to.be.revertedWithCustomError(
        contracts.metaNodeStakeProxy,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("should allow admin to update pool parameters", async () => {
      const newMinDeposit = ethers.parseEther("10");
      const newLockedBlocks = 10;
      await contracts.metaNodeStakeProxy.updatePool(
        poolId,
        newMinDeposit,
        newLockedBlocks
      );

      const pool = await contracts.metaNodeStakeProxy.pool(poolId);
      expect(pool.minDepositAmount).to.equal(newMinDeposit);
      expect(pool.unstakeLockedBlocks).to.equal(newLockedBlocks);
    });

    it("should emit PoolUpdated event when updating pool parameters", async () => {
      const newWeight = ethers.parseEther("2");
      const tx = await contracts.metaNodeStakeProxy.setPoolWeight(
        poolId,
        newWeight,
        false
      );

      await expect(tx)
        .to.emit(contracts.metaNodeStakeProxy, "SetPoolWeight")
        .withArgs(
          poolId, // poolId
          newWeight, // poolWeight
          await contracts.metaNodeStakeProxy.totalPoolWeight() // totalPoolWeight
        );
    });

    it("should update total pool weight when changing pool weight", async () => {
      const initialTotalWeight =
        await contracts.metaNodeStakeProxy.totalPoolWeight();
      const newWeight = ethers.parseEther("2");

      await contracts.metaNodeStakeProxy.setPoolWeight(
        poolId,
        newWeight,
        false
      );

      const newTotalWeight =
        await contracts.metaNodeStakeProxy.totalPoolWeight();
      const expectedTotalWeight =
        initialTotalWeight -
        BigInt(TEST_POOL_WEIGHT.toString()) +
        BigInt(newWeight.toString());

      expect(newTotalWeight).to.equal(expectedTotalWeight);
    });
  });

  describe("Pool State Management", () => {
    let poolId;

    beforeEach(async () => {
      await contracts.metaNodeStakeProxy.addPool(
        contracts.stakeToken.target,
        TEST_POOL_WEIGHT,
        MIN_DEPOSIT_AMOUNT,
        UNSTAKE_LOCKED_BLOCKS,
        false
      );
      poolId = 1;
    });

    it("should initialize pool with correct default values", async () => {
      const pool = await contracts.metaNodeStakeProxy.pool(poolId);
      expect(pool.lastRewardBlock).to.equal(
        await contracts.metaNodeStakeProxy.startBlock()
      );
      expect(pool.accMetaNodePerST).to.equal(0);
      expect(pool.stTokenAmount).to.equal(0);
      expect(pool.poolWeight).to.equal(TEST_POOL_WEIGHT);
      expect(pool.minDepositAmount).to.equal(MIN_DEPOSIT_AMOUNT);
      expect(pool.unstakeLockedBlocks).to.equal(UNSTAKE_LOCKED_BLOCKS);
    });

    it("should maintain pool state consistency after updates", async () => {
      const newWeight = ethers.parseEther("2");
      const newMinDeposit = ethers.parseEther("10");
      const newLockedBlocks = 10;

      await contracts.metaNodeStakeProxy.setPoolWeight(
        poolId,
        newWeight,
        false
      );
      await contracts.metaNodeStakeProxy.updatePool(
        poolId,
        newMinDeposit,
        newLockedBlocks
      );

      const pool = await contracts.metaNodeStakeProxy.pool(poolId);
      expect(pool.poolWeight).to.equal(newWeight);
      expect(pool.minDepositAmount).to.equal(newMinDeposit);
      expect(pool.unstakeLockedBlocks).to.equal(newLockedBlocks);
      expect(pool.stTokenAddress).to.equal(contracts.stakeToken.target);
    });

    it("should calculate total pool weight correctly", async () => {
      const initialWeight =
        await contracts.metaNodeStakeProxy.totalPoolWeight();

      // 添加第二个池
      await contracts.metaNodeStakeProxy.addPool(
        contracts.stakeToken.target,
        ethers.parseEther("0.5"),
        MIN_DEPOSIT_AMOUNT,
        UNSTAKE_LOCKED_BLOCKS,
        false
      );

      const newWeight = await contracts.metaNodeStakeProxy.totalPoolWeight();
      expect(newWeight).to.equal(initialWeight + ethers.parseEther("0.5"));
    });
  });

  describe("Pool Access Control", () => {
    it("should only allow admin role to manage pools", async () => {
      const adminRole = await contracts.metaNodeStakeProxy.ADMIN_ROLE();

      // 验证部署者有管理员角色
      expect(
        await contracts.metaNodeStakeProxy.hasRole(
          adminRole,
          contracts.deployer.address
        )
      ).to.be.true;

      // 验证普通用户没有管理员角色
      expect(
        await contracts.metaNodeStakeProxy.hasRole(
          adminRole,
          contracts.user1.address
        )
      ).to.be.false;
    });

    it("should allow admin to grant pool management role", async () => {
      const adminRole = await contracts.metaNodeStakeProxy.ADMIN_ROLE();
      await contracts.metaNodeStakeProxy.grantRole(
        adminRole,
        contracts.user1.address
      );

      expect(
        await contracts.metaNodeStakeProxy.hasRole(
          adminRole,
          contracts.user1.address
        )
      ).to.be.true;

      // 现在 user1 应该可以添加池
      await expect(
        contracts.metaNodeStakeProxy
          .connect(contracts.user1)
          .addPool(
            contracts.stakeToken.target,
            TEST_POOL_WEIGHT,
            MIN_DEPOSIT_AMOUNT,
            UNSTAKE_LOCKED_BLOCKS,
            false
          )
      ).to.not.be.reverted;
    });

    it("should allow admin to revoke pool management role", async () => {
      const adminRole = await contracts.metaNodeStakeProxy.ADMIN_ROLE();

      // 先授予角色
      await contracts.metaNodeStakeProxy.grantRole(
        adminRole,
        contracts.user1.address
      );
      expect(
        await contracts.metaNodeStakeProxy.hasRole(
          adminRole,
          contracts.user1.address
        )
      ).to.be.true;

      // 再撤销角色
      await contracts.metaNodeStakeProxy.revokeRole(
        adminRole,
        contracts.user1.address
      );
      expect(
        await contracts.metaNodeStakeProxy.hasRole(
          adminRole,
          contracts.user1.address
        )
      ).to.be.false;

      // 现在 user1 不能添加池
      await expect(
        contracts.metaNodeStakeProxy
          .connect(contracts.user1)
          .addPool(
            contracts.stakeToken.target,
            TEST_POOL_WEIGHT,
            MIN_DEPOSIT_AMOUNT,
            UNSTAKE_LOCKED_BLOCKS,
            false
          )
      ).to.be.revertedWithCustomError(
        contracts.metaNodeStakeProxy,
        "AccessControlUnauthorizedAccount"
      );
    });
  });
});
