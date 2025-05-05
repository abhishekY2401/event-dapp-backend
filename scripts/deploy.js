/**
 * @file deploy.js
 * @description Deployment script for the Event DApp contracts
 * This script handles the deployment of EventFactory and UserTicketHub contracts.
 * It also includes contract verification on Etherscan.
 */

// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

/**
 * Main deployment function - deploys all contracts
 * This function handles the entire deployment process including:
 * - Deploying EventFactory contract
 * - Deploying UserTicketHub contract
 * - Verifying contracts on Etherscan (if not on local network)
 * - Logging deployment information and contract addresses
 */
async function main() {
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy EventFactory contract
  console.log("\nDeploying EventFactory...");
  const EventFactory = await hre.ethers.getContractFactory("EventFactory");
  const eventFactory = await EventFactory.deploy();
  await eventFactory.waitForDeployment();
  const eventFactoryAddress = await eventFactory.getAddress();
  console.log("EventFactory deployed to:", eventFactoryAddress);

  // Deploy UserTicketHub contract
  console.log("\nDeploying UserTicketHub...");
  const UserTicketHub = await hre.ethers.getContractFactory("UserTicketHub");
  const userTicketHub = await UserTicketHub.deploy(eventFactoryAddress);
  await userTicketHub.waitForDeployment();
  const userTicketHubAddress = await userTicketHub.getAddress();
  console.log("UserTicketHub deployed to:", userTicketHubAddress);

  // Verify contracts on Etherscan if not on local network
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await eventFactory.deployTransaction.wait(6); // Wait for 6 block confirmations before verification

    console.log("\nVerifying contracts on Etherscan...");
    
    // Verify EventFactory contract
    await hre.run("verify:verify", {
      address: eventFactoryAddress,
      constructorArguments: [],
    });

    // Verify UserTicketHub contract
    await hre.run("verify:verify", {
      address: userTicketHubAddress,
      constructorArguments: [eventFactoryAddress],
    });
  }

  // Print deployment summary
  console.log("\nDeployment Summary:");
  console.log("------------------");
  console.log("EventFactory:", eventFactoryAddress);
  console.log("UserTicketHub:", userTicketHubAddress);

  // Write addresses to frontend/src/config/addresses.json
  const fs = require("fs");
  const path = require("path");
  const addressesPath = path.resolve(__dirname, "../../frontend/src/config/addresses.json");
  const addresses = {
    factory: eventFactoryAddress,
    userHub: userTicketHubAddress,
    discovery: "" // Add EventDiscovery address here if deployed
  };
  fs.mkdirSync(path.dirname(addressesPath), { recursive: true });
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("\nContract addresses written to:", addressesPath);
}

// Execute main function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });