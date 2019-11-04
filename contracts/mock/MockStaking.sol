pragma solidity ^0.5.0;

import 'openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';
import './MockToken.sol';

contract MockStaking {
    using SafeERC20 for MockToken;

    MockToken public token;
    mapping(address => uint256) public balances;

    event StakeIncreased(address sender, uint256 amount);

    constructor(address _token) public {
        token = MockToken(_token);
    }

    function stake(uint256 amount) public {
        balances[msg.sender] += amount;
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit StakeIncreased(msg.sender, amount);
    }

    function balanceOf(address stakeHolder) public view returns(uint256) {
        return balances[stakeHolder];
    }
}
