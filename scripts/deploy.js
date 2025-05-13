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
const fs = require('fs');
const path = require('path');

/**
 * Main deployment function - deploys all contracts
 * This function handles the entire deployment process including:
 * - Deploying EventFactory contract
 * - Deploying UserTicketHub contract
 * - Verifying contracts on Etherscan (if not on local network)
 * - Logging deployment information and contract addresses
 */
async function main() {
  console.log("Starting deployment...");

  // Deploy EventFactory first
  const EventFactory = await hre.ethers.getContractFactory("EventFactory");
  const eventFactory = await EventFactory.deploy();
  await eventFactory.waitForDeployment();
  const eventFactoryAddress = await eventFactory.getAddress();
  console.log("EventFactory deployed to:", eventFactoryAddress);

  // Deploy EventDiscovery with EventFactory address
  const EventDiscovery = await hre.ethers.getContractFactory("EventDiscovery");
  const eventDiscovery = await EventDiscovery.deploy(eventFactoryAddress);
  await eventDiscovery.waitForDeployment();
  const eventDiscoveryAddress = await eventDiscovery.getAddress();
  console.log("EventDiscovery deployed to:", eventDiscoveryAddress);

  // Deploy UserTicketHub with EventFactory address
  const UserTicketHub = await hre.ethers.getContractFactory("UserTicketHub");
  const userTicketHub = await UserTicketHub.deploy(eventFactoryAddress);
  await userTicketHub.waitForDeployment();
  const userTicketHubAddress = await userTicketHub.getAddress();
  console.log("UserTicketHub deployed to:", userTicketHubAddress);

  // Save contract addresses
  const addresses = {
    eventCore: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // First contract deployed by Hardhat
    eventFactory: eventFactoryAddress,
    eventDiscovery: eventDiscoveryAddress,
    ticketManager: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9", // Fourth contract
    userTicketHub: userTicketHubAddress
  };

  // Create the contract addresses file content
  const fileContent = `// This file is auto-generated. Do not edit manually.
// Generated for network: ${hre.network.name}

export const CONTRACT_ADDRESSES = ${JSON.stringify(addresses, null, 2)};
`;

  // Ensure the directory exists
  const frontendPath = path.join(__dirname, '../../frontend/src/utils');
  if (!fs.existsSync(frontendPath)) {
    console.log('Creating directory:', frontendPath);
    fs.mkdirSync(frontendPath, { recursive: true });
  }

  // Write to the frontend contract addresses file
  const filePath = path.join(frontendPath, 'contractAddresses.js');
  fs.writeFileSync(filePath, fileContent);

  console.log('Contract addresses saved to:', filePath);
  console.log('\nDeployment Summary:');
  console.log('------------------');
  console.log('EventFactory:', eventFactoryAddress);
  console.log('EventDiscovery:', eventDiscoveryAddress);
  console.log('UserTicketHub:', userTicketHubAddress);

  // Verify contracts on Etherscan if not on local network
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await eventFactory.deploymentTransaction().wait(6); // Wait for 6 block confirmations before verification

    console.log("\nVerifying contracts on Etherscan...");

    // Verify EventFactory contract
    await hre.run("verify:verify", {
      address: await eventFactory.getAddress(),
      constructorArguments: [],
    });

    // Verify UserTicketHub contract
    await hre.run("verify:verify", {
      address: await userTicketHub.getAddress(),
      constructorArguments: [await eventFactory.getAddress()],
    });
  }
}

// Execute main function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
