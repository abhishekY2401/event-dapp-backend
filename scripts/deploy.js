/**
 * @file deploy.js
 * @description Deployment script for the Event DApp contracts
 * This script handles the deployment of EventFactory, EventCore, TicketManager, and UserTicketHub contracts
 * and creates a test event. It also includes contract verification on Etherscan.
 */

// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

/**
 * Main deployment function - deploys all contracts and creates a test event
 * This function handles the entire deployment process including:
 * - Deploying EventFactory contract
 * - Deploying UserTicketHub contract
 * - Creating a test event (which deploys EventCore and TicketManager)
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

  // Create a test event to demonstrate functionality
  console.log("\nCreating test event...");
  const eventName = "Test Event";
  const eventDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
  const ticketPrice = hre.ethers.parseEther("0.1");
  const ticketCount = 100;

  // Create event which will deploy EventCore and TicketManager contracts
  const tx = await eventFactory.createEvent(
    eventName,
    eventDate,
    ticketPrice,
    ticketCount
  );
  const receipt = await tx.wait();

  // Get deployed contract addresses
  const eventContractAddress = await eventFactory.getEventContract(0);
  console.log("EventCore deployed at:", eventContractAddress);

  // Get TicketManager contract address from EventCore
  const EventCore = await hre.ethers.getContractFactory("EventCore");
  const eventCore = EventCore.attach(eventContractAddress);
  const ticketManagerAddress = await eventCore.ticketManager();
  console.log("TicketManager deployed at:", ticketManagerAddress);

  // Verify contracts on Etherscan if not on local network
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await receipt.wait(6); // Wait for 6 block confirmations before verification

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

    // Verify EventCore contract with constructor arguments
    await hre.run("verify:verify", {
      address: eventContractAddress,
      constructorArguments: [
        deployer.address,
        eventName,
        eventDate,
        ticketPrice,
        ticketCount
      ],
    });

    // Verify TicketManager contract
    await hre.run("verify:verify", {
      address: ticketManagerAddress,
      constructorArguments: [eventContractAddress],
    });
  }

  // Print deployment summary
  console.log("\nDeployment Summary:");
  console.log("------------------");
  console.log("EventFactory:", eventFactoryAddress);
  console.log("UserTicketHub:", userTicketHubAddress);
  console.log("EventCore:", eventContractAddress);
  console.log("TicketManager:", ticketManagerAddress);
  console.log("\nTest Event Details:");
  console.log("------------------");
  console.log("Name:", eventName);
  console.log("Date:", new Date(eventDate * 1000).toLocaleString());
  console.log("Ticket Price:", hre.ethers.formatEther(ticketPrice), "ETH");
  console.log("Total Tickets:", ticketCount);
}

// Execute main function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });