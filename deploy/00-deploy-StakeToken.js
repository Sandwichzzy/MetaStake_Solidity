module.exports = async ({ getNamedAccounts, deployments, run }) => {
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;

  console.log("开始部署 StakeTokenERC20 合约...");
  console.log("部署者地址:", deployer);

  // 部署 StakeTokenERC20 合约
  const stakeToken = await deploy("StakeTokenERC20", {
    from: deployer,
    args: [deployer],
    // waitConfirmations: 5,
    log: true,
  });

  console.log("StakeTokenERC20 合约部署成功!");
  console.log("合约地址:", stakeToken.address);

  // 如果在 Sepolia 测试网上，尝试验证合约
  if (
    hre.network.config.chainId === 11155111 &&
    process.env.ETHERSCAN_API_KEY
  ) {
    console.log("正在验证合约...");
    try {
      await run("verify:verify", {
        address: stakeToken.address,
        constructorArguments: [],
      });
      console.log("合约验证成功!");
    } catch (error) {
      console.log("合约验证失败:", error.message);
    }
  } else {
    console.log("Network is not sepolia, skipping verification");
  }

  return stakeToken;
};

module.exports.tags = ["all", "StakeTokenERC20"];
module.exports.dependencies = [];
