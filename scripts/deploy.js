// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

/**
 * Main deployment function - deploys the Lock contract to the network
 * This function handles the entire deployment process including:
 * - Setting up deployment parameters
 * - Deploying the contract
 * - Logging deployment information
 */
async function main() {
  // Calculate the current timestamp in seconds (Unix timestamp)
  const currentTimestampInSeconds = Math.round(Date.now() / 1000);
  
  // Set the unlock time to be 60 seconds (1 minute) from now
  // This will be passed as a constructor parameter to the Lock contract
  const unlockTime = currentTimestampInSeconds + 60;

  // Define the amount of ETH to be locked in the contract
  // parseEther converts from human-readable ETH (0.001) to wei (the smallest ETH unit)
  const lockedAmount = hre.ethers.parseEther("0.001");

  // Deploy the Lock contract with the unlock time parameter
  // The second argument is an array of constructor parameters
  // The value option sends ETH along with the deployment transaction
  const lock = await hre.ethers.deployContract("Lock", [unlockTime], {
    value: lockedAmount,
  });

  // Wait for the deployment transaction to be mined and confirmed
  // This ensures the contract is fully deployed before proceeding
  await lock.waitForDeployment();

  // Log deployment information to the console
  // - The amount of ETH locked in the contract
  // - The timestamp when the funds will be unlockable
  // - The deployed contract address (lock.target)
  console.log(
    `Lock with ${hre.ethers.formatEther(
      lockedAmount
    )}ETH and unlock timestamp ${unlockTime} deployed to ${lock.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
// This executes the main function and catches any errors that occur during deployment
main().catch((error) => {
  console.error(error);
  process.exitCode = 1; // Exit with error code if deployment fails
});// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
async function main() {
  const currentTimestampInSeconds = Math.round(Date.now() / 1000);
  const unlockTime = currentTimestampInSeconds + 60;

  const lockedAmount = hre.ethers.parseEther("0.001");

  const lock = await hre.ethers.deployContract("Lock", [unlockTime], {
    value: lockedAmount,
  });

  await lock.waitForDeployment();

  console.log(
    `Lock with ${hre.ethers.formatEther(
      lockedAmount
    )}ETH and unlock timestamp ${unlockTime} deployed to ${lock.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});