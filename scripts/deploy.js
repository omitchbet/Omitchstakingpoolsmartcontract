// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy();
  const Pool = await hre.ethers.getContractFactory("Pool");
  const pool = await Pool.deploy(token.address);

  await pool.deployed();
  await token.deployed();

  console.log("Pool deployed to:", pool.address);
  console.log("Token deployed to:", token.address);

  saveFrontendFiles(token, pool);
}

function saveFrontendFiles(token, pool) {
  const fs = require("fs");
  const contractsDir = __dirname + "/../frontend/src/abis";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + "/contract-addresses.json",
    JSON.stringify({ Token: token.address, Pool: pool.address }, undefined, 2)
  );

  const TokenArtifact = artifacts.readArtifactSync("Token");
  const PoolArtifact = artifacts.readArtifactSync("Pool");

  fs.writeFileSync(
    contractsDir + "/Token.json",
    JSON.stringify(TokenArtifact, null, 2)
  );
  fs.writeFileSync(
    contractsDir + "/Pool.json",
    JSON.stringify(PoolArtifact, null, 2)
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
