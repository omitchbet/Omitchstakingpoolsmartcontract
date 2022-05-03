//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

contract Pool {
    // userAddress => stakingBalance
    mapping(address => uint256) public stakingBalance;
    // userAddress => isStaking boolean
    mapping(address => bool) public isStaking;
    // userAddress => isStaking boolean
    mapping(address => bool) public hasStaked;
    // userAddress => timeStamp
    mapping(address => uint256) public dueTime;
    // userAddress => yields
    mapping(address => uint256) public yieldBalance;
    // userAddress => betting balance
    mapping(address => uint256) public bettingBalance;
    // userAddress => isBetting boolean
    mapping(address => bool) public isBetting;

    uint256 public totalPoolStakedBalance;

    // betters userAddress Array
    address[] public betters;
    // stakers userAddress Array
    address[] public stakers;

    IERC20 public daiToken;

    event Stake(address indexed from, uint256 amount);
    event Unstake(address indexed from, uint256 amount);
    event YieldWithdraw(address indexed to, uint256 amount);
    event FundAccount(address indexed to, uint256 amount);
    event CliamReward(address indexed to, uint256 amount);
    event UpdateWinning(address indexed to, uint256 amount);
    event UpdateLoss(address indexed to, uint256 amount);

    constructor(IERC20 _daiToken) {
        daiToken = _daiToken;
    }

    function stake(uint256 _amount) external {
        require(
            _amount > 0 && daiToken.balanceOf(msg.sender) >= _amount,
            "You cannot stake zero tokens"
        );

        daiToken.transferFrom(msg.sender, address(this), _amount);
        totalPoolStakedBalance += _amount;
        stakingBalance[msg.sender] += _amount;
        dueTime[msg.sender] = block.timestamp + 15 days;
        isStaking[msg.sender] = true;
        if (hasStaked[msg.sender] == false) {
            stakers.push(msg.sender);
        }
        hasStaked[msg.sender] = true;
        emit Stake(msg.sender, _amount);
    }

    function distributeTransactionFee(uint256 _amount) private {
        require(_amount > 0, "You cannot add zero tokens");

        for (uint256 i = 0; i < stakers.length; i++) {
            if (isStaking[stakers[i]]) {
                uint256 balance = stakingBalance[stakers[i]];
                uint256 poolRatio = balance * _amount;
                uint256 yield = poolRatio / totalPoolStakedBalance;
                yieldBalance[stakers[i]] += yield;
            }
        }
    }

    function unstake(uint256 _amount) external {
        require(block.timestamp > dueTime[msg.sender], "unstake not yet due");

        require(
            _amount > 0 && stakingBalance[msg.sender] >= _amount,
            "You cannot unstake zero tokens"
        );

        dueTime[msg.sender] = block.timestamp;
        uint256 balTransfer = _amount;
        _amount = 0;
        stakingBalance[msg.sender] -= balTransfer;
        totalPoolStakedBalance -= balTransfer;
        if (stakingBalance[msg.sender] == 0) {
            isStaking[msg.sender] = false;
        }
        daiToken.transfer(msg.sender, balTransfer);
        emit Unstake(msg.sender, balTransfer);
    }

    function withdrawYield() external {
        require(
            yieldBalance[msg.sender] > 0 && hasStaked[msg.sender],
            "You cannot withdraw zero tokens"
        );

        uint256 balance = yieldBalance[msg.sender];
        yieldBalance[msg.sender] = 0;
        daiToken.transfer(msg.sender, balance);
        emit YieldWithdraw(msg.sender, balance);
    }

    function fundAccount(uint256 _amount) external {
        require(
            _amount > 0 && daiToken.balanceOf(msg.sender) >= _amount,
            "You cannot fund zero tokens"
        );

        uint256 transactionFee;
        (transactionFee) = calculateTransactionFee(_amount);
        uint256 totalAmount = transactionFee + _amount;

        daiToken.transferFrom(msg.sender, address(this), totalAmount);

        bettingBalance[msg.sender] += _amount;
        isBetting[msg.sender] = true;
        betters.push(msg.sender);
        emit FundAccount(msg.sender, _amount);

        distributeTransactionFee(transactionFee);
    }

    function calculateTransactionFee(uint256 _amount)
        public
        pure
        returns (uint256)
    {
        //get transaction fee
        uint256 fraction = _amount * 3;
        return fraction / 1000;
    }

    function updateWinning(uint256 _amount, address _userAddress) external {
        require(
            _amount > 0 && isBetting[_userAddress],
            "You cannot update zero tokens"
        );

        uint256 _amountTrafer = _amount;
        _amount = 0;
        bettingBalance[_userAddress] += _amountTrafer;

        emit UpdateWinning(_userAddress, _amount);
    }

    function updateLoss(uint256 _amount, address _userAddress) external {
        require(
            _amount > 0 && isBetting[_userAddress],
            "You cannot update zero tokens"
        );

        uint256 _amountTrafer = _amount;
        _amount = 0;
        bettingBalance[_userAddress] -= _amountTrafer;

        emit UpdateLoss(_userAddress, _amount);
    }

    function claimReward(uint256 _amount) external {
        require(
            _amount > 0 && bettingBalance[msg.sender] >= _amount,
            "You cannot claim zero tokens"
        );

        uint256 balTransfer = _amount;
        _amount = 0;
        bettingBalance[msg.sender] -= balTransfer;
        if (bettingBalance[msg.sender] == 0) {
            isBetting[msg.sender] = false;
        }
        daiToken.transfer(msg.sender, balTransfer);
        emit CliamReward(msg.sender, balTransfer);
    }
}
