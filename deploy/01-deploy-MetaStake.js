const {
  METANODE_PERBLOCK,
  START_BLOCK,
  END_BLOCK,
} = require("../helper-hardhat-config");
const { ethers } = require("hardhat");
const { upgrades } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments, run }) => {
  const { deployer } = await getNamedAccounts();
  const { deploy, save } = deployments;

  console.log("开始部署 MetaNodeStake 合约...");
  console.log("部署者地址:", deployer);

  // 获取 StakeToken 地址
  const stakeTokenAddress = (await deployments.get("StakeTokenERC20")).address;
  console.log("StakeToken 地址:", stakeTokenAddress);

  // 使用 upgrades.deployProxy 部署 UUPS 代理合约
  const MetaNodeStake = await ethers.getContractFactory("MetaNodeStake");
  const metaStakeProxy = await upgrades.deployProxy(
    MetaNodeStake,
    [
      stakeTokenAddress, // MetaNode token address (使用 StakeToken 地址)
      START_BLOCK, // startBlock - 开始区块
      END_BLOCK, // endBlock - 结束区块
      METANODE_PERBLOCK, // MetaNodePerBlock - 每区块奖励 (1 MetaNode)
    ],
    {
      kind: "uups", // 指定代理类型为 UUPS
      from: deployer,
    }
  );

  await metaStakeProxy.waitForDeployment();
  const proxyAddress = await metaStakeProxy.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    proxyAddress
  );

  console.log("MetaNodeStake 代理合约部署成功!");
  console.log("代理合约地址:", proxyAddress);
  console.log("实现合约地址:", implementationAddress);

  // 使用 deployments.save 保存代理合约信息到 deployments 系统
  const proxyArtifact = await deployments.getArtifact("MetaNodeStake");
  await save("MetaNodeStake", {
    address: proxyAddress,
    abi: proxyArtifact.abi,
    implementation: implementationAddress,
    proxy: true,
    kind: "uups",
  });

  // 保存实现合约信息到 deployments 系统
  await save("MetaNodeStakeImplementation", {
    address: implementationAddress,
    abi: proxyArtifact.abi,
  });

  // 如果在 Sepolia 测试网上，尝试验证合约
  if (
    hre.network.config.chainId === 11155111 &&
    process.env.ETHERSCAN_API_KEY
  ) {
    console.log("正在验证合约...");

    try {
      // 验证代理合约 - 对于 UUPS 代理，需要验证代理合约地址
      await run("verify:verify", {
        address: proxyAddress,
        constructorArguments: [],
      });
      console.log("代理合约验证成功!");
    } catch (error) {
      console.log("代理合约验证失败:", error.message);

      // 尝试验证实现合约
      try {
        await run("verify:verify", {
          address: implementationAddress,
          constructorArguments: [],
        });
        console.log("实现合约验证成功!");
        console.log(
          "注意: 代理合约验证失败，但实现合约已验证。用户可以通过代理合约地址查看合约代码。"
        );
      } catch (implError) {
        console.log("实现合约验证也失败:", implError.message);
        console.log(
          "建议: 手动在 Etherscan 上验证实现合约地址:",
          implementationAddress
        );
      }
    }
  } else {
    console.log("跳过合约验证 (非 Sepolia 网络或无 API Key)");
  }

  return {
    address: proxyAddress,
    implementation: implementationAddress,
  };
};

module.exports.tags = ["all", "MetaNodeStake"];
module.exports.dependencies = ["StakeTokenERC20"];
