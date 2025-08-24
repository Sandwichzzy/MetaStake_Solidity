const { expect } = require("chai");
const { setupTestEnvironment } = require("../../helpers/test-setup");
const {
  START_BLOCK,
  END_BLOCK,
  METANODE_PERBLOCK,
} = require("../../helper-hardhat-config");

describe("MetaNodeStake Initialization", () => {
  let contracts;

  beforeEach(async () => {
    // 使用基础测试环境设置（不需要创建池和分发代币）
    contracts = await setupTestEnvironment();
  });

  it("should initialize with correct parameters", async () => {
    const { metaNodeStakeProxy } = contracts;

    const startBlock = await metaNodeStakeProxy.startBlock();
    const endBlock = await metaNodeStakeProxy.endBlock();
    const metaNodePerBlock = await metaNodeStakeProxy.MetaNodePerBlock();

    expect(startBlock).to.equal(START_BLOCK);
    expect(endBlock).to.equal(END_BLOCK);
    expect(metaNodePerBlock).to.equal(METANODE_PERBLOCK);
  });

  it("should set correct roles for deployer", async () => {
    const { metaNodeStakeProxy, deployer } = contracts;

    const defaultAdminRole = await metaNodeStakeProxy.DEFAULT_ADMIN_ROLE();
    const upgradeRole = await metaNodeStakeProxy.UPGRADE_ROLE();
    const adminRole = await metaNodeStakeProxy.ADMIN_ROLE();

    const defaultAdminRoleGranted = await metaNodeStakeProxy.hasRole(
      defaultAdminRole,
      deployer.address
    );
    const upgradeRoleGranted = await metaNodeStakeProxy.hasRole(
      upgradeRole,
      deployer.address
    );
    const adminRoleGranted = await metaNodeStakeProxy.hasRole(
      adminRole,
      deployer.address
    );

    expect(defaultAdminRoleGranted).to.be.true;
    expect(upgradeRoleGranted).to.be.true;
    expect(adminRoleGranted).to.be.true;
  });
});
