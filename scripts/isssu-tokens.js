const Staking = artifacts.require();

module.exports = async function issueRewards(callback) {
  let staking = await Staking.deploy();
  await staking.issueTokens();
  console.log("Tokens have been issued successfully");
  callback();
};
