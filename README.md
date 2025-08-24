# MetaStake V2 智能合约项目

## 项目概述

MetaStake V2 是一个基于以太坊的质押挖矿智能合约系统，支持 UUPS 可升级代理模式。用户可以通过质押代币获得 MetaNode 奖励，系统采用权重分配机制确保公平的奖励分配。

## 项目架构

### 核心合约

- **MetaNodeStake.sol**: 主要的质押合约，实现质押、解质押、领取奖励等核心功能
- **StakeTokenERC20.sol**: 质押代币合约，用于测试和演示

### 技术特性

- **UUPS 代理模式**: 支持合约升级，无需重新部署代理
- **权重分配系统**: 基于池权重的奖励分配机制
- **解质押锁定机制**: 防止短期投机行为
- **多池支持**: 支持多个质押池，每个池可以有不同的权重和参数
- **权限管理**: 基于角色的访问控制

## 部署架构

### 部署流程

1. **StakeTokenERC20**: 部署质押代币合约
2. **MetaNodeStake**: 使用 OpenZeppelin 的 `upgrades.deployProxy` 部署 UUPS 代理合约

### 代理合约结构

```
用户交互 → MetaNodeStake 代理合约 → MetaNodeStake 实现合约
```

- **代理合约**: 存储状态数据，转发调用到实现合约
- **实现合约**: 包含业务逻辑，可以升级

## 部署脚本说明

### 00-deploy-StakeToken.js

部署 StakeTokenERC20 代币合约，用于测试质押功能。

**功能**:

- 部署 ERC20 代币合约
- 保存合约地址到 deployments 系统
- 支持 Sepolia 测试网验证

### 01-deploy-MetaStake.js

部署 MetaNodeStake 质押合约的代理版本。

**功能**:

- 使用 `upgrades.deployProxy` 部署 UUPS 代理合约
- 自动调用 `initialize` 函数设置初始参数
- 使用 `deployments.save` 保存部署信息到 deployments 系统
- 支持合约验证

**关键特性**:

- 代理类型: UUPS (Universal Upgradeable Proxy Standard)
- 初始化参数: 代币地址、开始区块、结束区块、每区块奖励
- 部署信息保存: 代理地址、实现地址、ABI、代理类型

## 部署参数配置

在 `helper-hardhat-config.js` 中配置以下参数:

```javascript
const METANODE_PERBLOCK = ethers.parseEther("1"); // 每区块奖励 1 MetaNode
const START_BLOCK = 0; // 开始区块
const END_BLOCK = 1000000; // 结束区块
```

## 使用方法

### 1. 安装依赖

```bash
npm install
```

**重要**: 确保安装了以下关键依赖：

- `@openzeppelin/hardhat-upgrades`: 用于部署可升级代理合约
- `@openzeppelin/contracts-upgradeable`: 可升级合约库
- `hardhat-deploy`: 部署脚本管理

### 2. 配置环境变量

创建 `.env` 文件:

```env
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 3. 部署合约

**本地网络部署**:

```bash
npx hardhat deploy --network localhost
```

**Sepolia 测试网部署**:

```bash
npx hardhat deploy --network sepolia
```

**主网部署**:

```bash
npx hardhat deploy --network mainnet
```

### 4. 运行测试

```bash
npx hardhat test
```

### 5. 验证合约

```bash
npx hardhat verify --network sepolia CONTRACT_ADDRESS
```

## 合约验证

### UUPS 代理合约验证说明

对于 UUPS 代理合约，验证过程需要特别注意：

1. **代理合约验证**: 主要验证代理合约地址，这样用户可以在 Etherscan 上查看合约代码
2. **实现合约验证**: 作为备选方案，验证实现合约地址
3. **验证参数**: 实现合约没有构造函数，所以 `constructorArguments` 为空数组

### 验证命令

```bash
# 验证代理合约
npx hardhat verify --network sepolia PROXY_ADDRESS

# 验证实现合约
npx hardhat verify --network sepolia IMPLEMENTATION_ADDRESS

# 指定合约文件验证代理合约
npx hardhat verify --network sepolia PROXY_ADDRESS --contract contracts/MetaNodeStake.sol:MetaNodeStake
```

### 验证失败处理

如果自动验证失败，可以：

1. **手动验证**: 在 Etherscan 上手动验证实现合约
2. **检查网络**: 确保在正确的网络上验证
3. **等待确认**: 等待更多区块确认后再验证
4. **API 限制**: 检查 Etherscan API 调用频率限制

## 部署信息获取

部署完成后，可以通过以下方式获取合约信息:

```javascript
// 获取代理合约
const metaStake = await deployments.get("MetaNodeStake");
console.log("代理地址:", metaStake.address);
console.log("实现地址:", metaStake.implementation);

// 获取实现合约
const implementation = await deployments.get("MetaNodeStakeImplementation");
console.log("实现合约地址:", implementation.address);
```

## 合约升级

使用 OpenZeppelin 的升级功能:

```bash
npx hardhat upgrade --network sepolia PROXY_ADDRESS NEW_IMPLEMENTATION
```

## 安全特性

- **权限控制**: 基于角色的访问控制
- **暂停机制**: 紧急情况下可暂停关键功能
- **重入攻击防护**: 使用 OpenZeppelin 的安全库
- **数学安全**: 使用 SafeMath 和 Math 库防止溢出

## 网络配置

支持的网络配置在 `hardhat.config.js` 中定义，包括:

- 本地网络 (localhost)
- Sepolia 测试网
- 以太坊主网

## 注意事项

1. 部署前确保有足够的 ETH 支付 gas 费用
2. 在测试网充分测试后再部署到主网
3. 保存好部署脚本和合约地址，便于后续维护
4. 定期备份和验证合约状态

## 技术支持

如有问题，请查看:

- 合约代码注释
- 测试用例
- Hardhat 官方文档
- OpenZeppelin 升级指南
