module.exports = async ({ getNamedAccounts, deployments, run }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const stakeToken = await deploy("StakeTokenERC20", {
    from: deployer,
    args: [],
    log: true,
  });

  if (
    hre.network.config.chainId === 11155111 &&
    process.env.ETHERSCAN_API_KEY
  ) {
    try {
      await run("verify:verify", {
        address: stakeToken.address,
        constructorArguments: [],
      });
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  } else {
    console.log("Network is not sepolia, skipping verification");
  }
};

module.exports.tags = ["all", "StakeTokenERC20"];
