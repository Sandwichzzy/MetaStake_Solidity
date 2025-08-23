require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: [".env.local", ".env"] });
require("hardhat-deploy");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [
        process.env.PRIVATE_KEY,
        process.env.PRIVATE_KEY_2,
        process.env.PRIVATE_KEY_3,
      ],
      chainId: 11155111,
      timeout: 100000,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },

  namedAccounts: {
    deployer: {
      default: 0,
    },
    secondAccount: {
      default: 1,
    },
    thirdAccount: {
      default: 2,
    },
  },

  // 部署配置
  paths: {
    deploy: "deploy",
    deployments: "deployments",
    artifacts: "artifacts",
  },
};
