const { ethers } = require("hardhat");
const { expect, use } = require("chai");
const { solidity } = require("ethereum-waffle");
const { time, constants } = require("@openzeppelin/test-helpers");

use(solidity);

describe("Pool", function () {
  let owner;
  let alice;
  let bob;
  let carol;
  let dave;
  let eve;

  let token;
  let pool;

  const daiAmount = ethers.utils.parseEther("25000");

  before(async () => {
    const Pool = await ethers.getContractFactory("Pool");
    const Token = await ethers.getContractFactory("Token");

    [owner, alice, bob, carol, dave, eve] = await ethers.getSigners();

    token = await Token.deploy();

    await Promise.all([
      token.mint(owner.address, daiAmount),
      token.mint(alice.address, daiAmount),
      token.mint(bob.address, daiAmount),
      token.mint(carol.address, daiAmount),
      token.mint(dave.address, daiAmount),
      token.mint(eve.address, daiAmount),
    ]);

    pool = await Pool.deploy(token.address);
  });

  describe("Staking", async () => {
    it("should stake and update mapping", async () => {
      let toTransfer = ethers.utils.parseEther("100");
      await token.connect(alice).approve(pool.address, toTransfer);
      await token.connect(bob).approve(pool.address, toTransfer);
      await token.connect(dave).approve(pool.address, toTransfer);

      expect(await pool.isStaking(alice.address)).to.eq(false);

      expect(await pool.connect(alice).stake(toTransfer)).to.be.ok;

      expect(await pool.connect(bob).stake(toTransfer)).to.be.ok;

      expect(await pool.connect(dave).stake(toTransfer)).to.be.ok;

      expect(await pool.stakingBalance(alice.address)).to.eq(toTransfer);

      expect(await pool.isStaking(alice.address)).to.eq(true);
    });

    it("should remove dai from user", async () => {
      res = await token.balanceOf(alice.address);
      const amountstake = ethers.utils.parseEther("100");
      expect(Number(res)).to.eq(Number(daiAmount) - Number(amountstake));
    });

    it("should update balance with multiple stakes", async () => {
      let toTransfer = ethers.utils.parseEther("100");
      await token.connect(eve).approve(pool.address, toTransfer);
      await pool.connect(eve).stake(toTransfer);
      res = await pool.totalPoolStakedBalance();
      const poolBalance = ethers.utils.parseEther("400");

      expect(Number(res)).to.eq(Number(poolBalance));
    });

    it("should revert stake with zero as staked amount", async () => {
      await expect(pool.connect(bob).stake(0)).to.be.revertedWith(
        "You cannot stake zero tokens"
      );
    });

    it("should revert stake without allowance", async () => {
      let toTransfer = ethers.utils.parseEther("50");
      await expect(pool.connect(bob).stake(toTransfer)).to.be.revertedWith(
        "ERC20: insufficient allowance"
      );
    });

    it("should revert with not enough funds", async () => {
      let toTransfer = ethers.utils.parseEther("1000000");
      await token.approve(pool.address, toTransfer);

      await expect(pool.connect(bob).stake(toTransfer)).to.be.revertedWith(
        "You cannot stake zero tokens"
      );
    });
  });
  describe("Unstaking", async () => {
    it("should not be able to unstack before due date", async () => {
      let toWithdraw = ethers.utils.parseEther("50");
      await expect(pool.connect(eve).unstake(toWithdraw)).to.be.revertedWith(
        "unstake not yet due"
      );
    });

    it("should be unable to unstake above staked balance and zero token", async () => {
      let toWithdraw = ethers.utils.parseEther("500");
      let zero = ethers.utils.parseEther("0");

      // Fast-forward time
      await time.increase(86400 * 15);

      await expect(pool.connect(eve).unstake(toWithdraw)).to.be.revertedWith(
        "You cannot unstake zero tokens"
      );
      await expect(pool.connect(eve).unstake(zero)).to.be.revertedWith(
        "You cannot unstake zero tokens"
      );
    });

    it("should unstake and update mapping", async () => {
      let toWithdraw = await pool.stakingBalance(eve.address);
      // let toWithdraw = ethers.utils.parseEther("50");

      expect(await pool.connect(eve).unstake(toWithdraw)).to.be.ok;
      let balance = await token.balanceOf(pool.address);
      res = await pool.totalPoolStakedBalance();
      expect(Number(res)).to.eq(Number(balance));
      expect(await pool.isStaking(eve.address)).to.eq(false);
      res = await pool.stakingBalance(eve.address);
      expect(Number(res)).to.eq(Number("0"));
    });
  });

  describe("Fund account", async () => {
    it("should fund account and update mapping and distribute yield", async () => {
      let toTransfer = ethers.utils.parseEther("1003");
      let newTransfer = ethers.utils.parseEther("1000");
      await token.connect(dave).approve(pool.address, toTransfer);

      expect(await pool.isBetting(dave.address)).to.eq(false);

      expect(await pool.connect(dave).fundAccount(newTransfer)).to.be.ok;

      expect(await pool.bettingBalance(dave.address)).to.eq(newTransfer);

      expect(await pool.isBetting(dave.address)).to.eq(true);

      console.log(await pool.yieldBalance(bob.address));
    });

    it("should be unable to fund with zero balance", async () => {
      let toTransfer = ethers.utils.parseEther("0");

      await token.connect(carol).approve(pool.address, toTransfer);

      expect(await pool.isBetting(carol.address)).to.eq(false);

      await expect(
        pool.connect(carol).fundAccount(toTransfer)
      ).to.be.revertedWith("You cannot fund zero tokens");
    });
  });
  describe("Withdraw yield", async () => {
    it("should withdraw yield and update mapping", async () => {
      let zero = ethers.utils.parseEther("0");

      expect(await pool.connect(bob).withdrawYield()).to.be.ok;

      expect(await pool.yieldBalance(bob.address)).to.eq(zero);

      console.log(await pool.yieldBalance(bob.address));
    });

    it("should be unable to withdraw zero yield", async () => {
      await expect(pool.connect(carol).withdrawYield()).to.be.revertedWith(
        "You cannot withdraw zero tokens"
      );
    });
  });
});
