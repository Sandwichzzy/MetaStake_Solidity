// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract StakeTokenERC20 is ERC20{
    constructor() ERC20("MetaStakeToken", "MST"){
        // 初始供应量可以在这里定义，或者留空以便之后通过 mint 函数铸造
         _mint(msg.sender, 10000000*1_000_000_000_000_000_000);
    }
}