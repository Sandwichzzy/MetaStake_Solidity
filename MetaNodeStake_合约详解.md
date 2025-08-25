# MetaNodeStake 合约详细解读

## 📋 **合约概述**

MetaNodeStake 是一个基于 UUPS 代理模式的**可升级质押挖矿合约**，实现了多池质押机制，用户可以质押不同的代币（ETH 和 ERC20）来获得 MetaNode 代币奖励。

### **🔧 继承的合约模块**

- `Initializable`: 初始化器，替代构造函数
- `UUPSUpgradeable`: UUPS 代理升级模式
- `PausableUpgradeable`: 暂停功能（可暂停质押、提取等操作）
- `AccessControlUpgradeable`: 基于角色的访问控制

## 🎯 **核心设计理念**

### **奖励计算公式**

```solidity
// 用户待领取奖励 = (用户质押量 × 每单位代币累积奖励) - 用户已领取奖励
pending MetaNode = (user.stAmount * pool.accMetaNodePerST) - user.finishedMetaNode
```

### **权重分配机制**

每个池子都有权重，总奖励按权重比例分配：

```solidity
// 池子获得的奖励 = 总奖励 × (池子权重 / 总权重)
poolReward = totalReward * (poolWeight / totalPoolWeight)
```

## 📊 **数据结构解析**

### **1. Pool 结构体 - 质押池信息**

```solidity
struct Pool {
    address stTokenAddress;        // 质押代币地址 (ETH为0x0)
    uint256 poolWeight;           // 池子权重，决定奖励分配比例
    uint256 lastRewardBlock;      // 上次奖励计算的区块号
    uint256 accMetaNodePerST;     // 每单位质押代币累积的奖励（精度1e18）
    uint256 stTokenAmount;        // 池中总质押代币数量
    uint256 minDepositAmount;     // 最小质押数量
    uint256 unstakeLockedBlocks;  // 解质押锁定区块数
}
```

### **2. User 结构体 - 用户信息**

```solidity
struct User {
    uint256 stAmount;            // 用户质押的代币数量
    uint256 finishedMetaNode;    // 用户已分配的奖励数量
    uint256 pendingMetaNode;     // 用户待领取的奖励
    UnstakeRequest[] requests;   // 解质押请求列表
}
```

### **3. UnstakeRequest 结构体 - 解质押请求**

```solidity
struct UnstakeRequest {
    uint256 amount;         // 解质押数量
    uint256 unlockBlocks;   // 解锁区块号
}
```

## 🔐 **角色权限系统**

### **角色定义**

- `DEFAULT_ADMIN_ROLE`: 默认管理员（可授权其他角色）
- `ADMIN_ROLE`: 池子管理员（管理池子、暂停功能等）
- `UPGRADE_ROLE`: 升级管理员（可升级合约）

### **权限分配**

```solidity
// 初始化时，部署者获得所有角色
_grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
_grantRole(UPGRADE_ROLE, msg.sender);
_grantRole(ADMIN_ROLE, msg.sender);
```

## 🏊 **池子管理机制**

### **池子添加规则**

```solidity
// 特殊规则：第一个池子必须是 ETH 池（地址为 0x0）
if (pool.length > 0) {
    require(_stTokenAddress != address(0x0), "后续池子不能是ETH池");
} else {
    require(_stTokenAddress == address(0x0), "第一个池子必须是ETH池");
}
```

### **池子类型**

- **池子 0**: ETH 池（stTokenAddress = 0x0）
- **池子 1+**: ERC20 代币池

## 💰 **奖励分发机制**

### **区块奖励计算**

```solidity
function getMultiplier(uint256 _from, uint256 _to) public view returns(uint256) {
    // 确保在有效区块范围内
    if (_from < startBlock) _from = startBlock;
    if (_to > endBlock) _to = endBlock;

    // 计算区块差 × 每区块奖励
    return (_to - _from) * MetaNodePerBlock;
}
```

### **池子奖励更新**

```solidity
function updatePool(uint256 _pid) public {
    Pool storage pool_ = pool[_pid];

    // 如果当前区块 <= 上次奖励区块，无需更新
    if (block.number <= pool_.lastRewardBlock) return;

    // 计算总奖励 = 区块奖励 × 池子权重 / 总权重
    uint256 totalMetaNode = getMultiplier(pool_.lastRewardBlock, block.number)
                           * pool_.poolWeight / totalPoolWeight;

    // 如果池中有质押代币，更新每单位代币奖励
    if (pool_.stTokenAmount > 0) {
        pool_.accMetaNodePerST += totalMetaNode * 1e18 / pool_.stTokenAmount;
    }

    pool_.lastRewardBlock = block.number;
}
```

## 💎 **质押流程详解**

### **1. ETH 质押 (depositETH)**

```solidity
function depositETH() public payable {
    Pool storage pool_ = pool[ETH_PID]; // ETH_PID = 0
    require(pool_.stTokenAddress == address(0x0), "必须是ETH池");

    uint256 _amount = msg.value;
    require(_amount >= pool_.minDepositAmount, "质押数量太小");

    _deposit(ETH_PID, _amount);
}
```

### **2. ERC20 代币质押 (deposit)**

```solidity
function deposit(uint256 _pid, uint256 _amount) public {
    require(_pid != 0, "ERC20质押不能使用池子0");
    Pool storage pool_ = pool[_pid];
    require(_amount > pool_.minDepositAmount, "质押数量太小");

    // 转移代币到合约
    IERC20(pool_.stTokenAddress).safeTransferFrom(msg.sender, address(this), _amount);

    _deposit(_pid, _amount);
}
```

### **3. 内部质押逻辑 (\_deposit)**

```solidity
function _deposit(uint256 _pid, uint256 _amount) internal {
    updatePool(_pid); // 更新池子奖励

    // 如果用户已有质押，计算并累加待领取奖励
    if (user_.stAmount > 0) {
        uint256 pendingMetaNode_ = user_.stAmount * pool_.accMetaNodePerST / 1e18
                                  - user_.finishedMetaNode;
        user_.pendingMetaNode += pendingMetaNode_;
    }

    // 更新用户质押量
    user_.stAmount += _amount;
    pool_.stTokenAmount += _amount;

    // 更新用户已分配奖励基准
    user_.finishedMetaNode = user_.stAmount * pool_.accMetaNodePerST / 1e18;
}
```

## 🔄 **解质押流程详解**

### **1. 发起解质押请求 (unstake)**

```solidity
function unstake(uint256 _pid, uint256 _amount) public {
    require(user_.stAmount >= _amount, "质押量不足");

    updatePool(_pid); // 更新奖励

    // 计算并保存待领取奖励
    uint256 pendingMetaNode_ = user_.stAmount * pool_.accMetaNodePerST / 1e18
                              - user_.finishedMetaNode;
    user_.pendingMetaNode += pendingMetaNode_;

    // 创建解质押请求（带锁定期）
    user_.requests.push(UnstakeRequest({
        amount: _amount,
        unlockBlocks: block.number + pool_.unstakeLockedBlocks
    }));

    // 立即减少质押量
    user_.stAmount -= _amount;
    pool_.stTokenAmount -= _amount;

    // 更新已分配奖励基准
    user_.finishedMetaNode = user_.stAmount * pool_.accMetaNodePerST / 1e18;
}
```

### **2. 提取解质押资金 (withdraw)**

```solidity
function withdraw(uint256 _pid) public {
    uint256 pendingWithdraw = 0;

    // 遍历解质押请求，找出已解锁的
    for (uint256 i = 0; i < user_.requests.length; i++) {
        if (user_.requests[i].unlockBlocks <= block.number) {
            pendingWithdraw += user_.requests[i].amount;
        }
    }

    // 清理已处理的请求
    // ... 数组操作逻辑 ...

    // 转移资金
    if (pool_.stTokenAddress == address(0x0)) {
        _safeETHTransfer(msg.sender, pendingWithdraw); // ETH
    } else {
        IERC20(pool_.stTokenAddress).safeTransfer(msg.sender, pendingWithdraw); // ERC20
    }
}
```

## 🎁 **奖励领取机制**

### **领取奖励 (claim)**

```solidity
function claim(uint256 _pid) public {
    updatePool(_pid); // 更新池子奖励

    // 计算总待领取奖励
    uint256 pendingMetaNode_ = user_.stAmount * pool_.accMetaNodePerST / 1e18
                              - user_.finishedMetaNode + user_.pendingMetaNode;

    if (pendingMetaNode_ > 0) {
        user_.pendingMetaNode = 0; // 清零待领取
        _safeMetaNodeTransfer(msg.sender, pendingMetaNode_); // 转移奖励
    }

    // 更新已分配奖励基准
    user_.finishedMetaNode = user_.stAmount * pool_.accMetaNodePerST / 1e18;
}
```

## 📈 **查询功能**

### **1. 查询待领取奖励**

```solidity
function pendingMetaNode(uint256 _pid, address _user) external view returns(uint256) {
    return pendingMetaNodeByBlockNumber(_pid, _user, block.number);
}

function pendingMetaNodeByBlockNumber(uint256 _pid, address _user, uint256 _blockNumber)
    public view returns(uint256) {
    // 模拟更新池子奖励（不修改状态）
    uint256 accMetaNodePerST = pool_.accMetaNodePerST;

    if (_blockNumber > pool_.lastRewardBlock && pool_.stTokenAmount != 0) {
        uint256 multiplier = getMultiplier(pool_.lastRewardBlock, _blockNumber);
        uint256 MetaNodeForPool = multiplier * pool_.poolWeight / totalPoolWeight;
        accMetaNodePerST += MetaNodeForPool * 1e18 / pool_.stTokenAmount;
    }

    // 计算用户待领取奖励
    return user_.stAmount * accMetaNodePerST / 1e18
           - user_.finishedMetaNode + user_.pendingMetaNode;
}
```

### **2. 查询解质押信息**

```solidity
function withdrawAmount(uint256 _pid, address _user)
    public view returns(uint256 requestAmount, uint256 pendingWithdrawAmount) {

    for (uint256 i = 0; i < user_.requests.length; i++) {
        if (user_.requests[i].unlockBlocks <= block.number) {
            pendingWithdrawAmount += user_.requests[i].amount; // 可提取
        }
        requestAmount += user_.requests[i].amount; // 总请求量
    }
}
```

## 🛡️ **安全机制**

### **1. 溢出保护**

```solidity
// 使用 Math 库的安全数学运算
(bool success, uint256 result) = a.tryMul(b);
require(success, "multiplication overflow");
```

### **2. 重入保护**

- 继承 `PausableUpgradeable`，可在紧急情况下暂停合约
- 使用 `SafeERC20` 进行安全的代币转移

### **3. 精度处理**

- 使用 `1e18` 作为精度单位避免小数计算误差
- 所有奖励计算都基于整数运算

### **4. 资金安全转移**

```solidity
function _safeMetaNodeTransfer(address _to, uint256 _amount) internal {
    uint256 MetaNodeBal = MetaNode.balanceOf(address(this));

    // 如果合约余额不足，转移所有余额而不是失败
    if (_amount > MetaNodeBal) {
        MetaNode.transfer(_to, MetaNodeBal);
    } else {
        MetaNode.transfer(_to, _amount);
    }
}
```

## 🔧 **管理员功能**

### **1. 池子管理**

- `addPool()`: 添加新的质押池
- `setPoolWeight()`: 调整池子权重
- `updatePool()`: 更新池子参数（最小质押量、锁定期）

### **2. 系统参数**

- `setStartBlock()` / `setEndBlock()`: 设置奖励区块范围
- `setMetaNodePerBlock()`: 设置每区块奖励
- `setMetaNode()`: 设置奖励代币地址

### **3. 紧急控制**

- `pauseWithdraw()` / `unpauseWithdraw()`: 暂停/恢复提取
- `pauseClaim()` / `unpauseClaim()`: 暂停/恢复奖励领取

## 📝 **事件日志**

合约定义了丰富的事件来追踪所有重要操作：

```solidity
event AddPool(address indexed stTokenAddress, uint256 indexed poolWeight, ...);
event Deposit(address indexed user, uint256 indexed poolId, uint256 amount);
event RequestUnstake(address indexed user, uint256 indexed poolId, uint256 amount);
event Withdraw(address indexed user, uint256 indexed poolId, uint256 amount, uint256 indexed blockNumber);
event Claim(address indexed user, uint256 indexed poolId, uint256 MetaNodeReward);
```

## 🚀 **使用场景示例**

### **1. 用户质押 ETH 挖矿**

1. 调用 `depositETH()` 质押 ETH
2. 系统自动计算奖励
3. 调用 `claim(0)` 领取奖励

### **2. 用户质押 ERC20 代币挖矿**

1. 先调用 `approve()` 授权合约
2. 调用 `deposit(poolId, amount)` 质押代币
3. 定期调用 `claim(poolId)` 领取奖励

### **3. 用户解质押流程**

1. 调用 `unstake(poolId, amount)` 发起解质押
2. 等待锁定期结束
3. 调用 `withdraw(poolId)` 提取资金

## ⚠️ **注意事项**

1. **第一个池子必须是 ETH 池**，地址为 `0x0`
2. **解质押有锁定期**，需要等待指定区块数才能提取
3. **精度问题**：所有计算基于 `1e18` 精度
4. **Gas 消耗**：`massUpdatePools()` 会更新所有池子，Gas 消耗较高
5. **权限管理**：只有具备相应角色的账户才能执行管理操作

这个合约设计精巧，实现了一个功能完整的多池质押挖矿系统，支持 ETH 和 ERC20 代币质押，具有良好的安全性和可扩展性。
