const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment on:", hre.network.name);

  // Deploy EventFactory
  const EventFactory = await hre.ethers.getContractFactory("EventFactory");
  const eventFactory = await EventFactory.deploy();
  await eventFactory.waitForDeployment();
  const eventFactoryAddress = await eventFactory.getAddress();
  console.log("✅ EventFactory deployed at:", eventFactoryAddress);

  // Deploy EventDiscovery
  const EventDiscovery = await hre.ethers.getContractFactory("EventDiscovery");
  const eventDiscovery = await EventDiscovery.deploy(eventFactoryAddress);
  await eventDiscovery.waitForDeployment();
  const eventDiscoveryAddress = await eventDiscovery.getAddress();
  console.log("✅ EventDiscovery deployed at:", eventDiscoveryAddress);

  // Deploy UserTicketHub
  const UserTicketHub = await hre.ethers.getContractFactory("UserTicketHub");
  const userTicketHub = await UserTicketHub.deploy(eventFactoryAddress);
  await userTicketHub.waitForDeployment();
  const userTicketHubAddress = await userTicketHub.getAddress();
  console.log("✅ UserTicketHub deployed at:", userTicketHubAddress);

  // Save contract addresses to frontend
  const addresses = {
    eventFactory: eventFactoryAddress,
    eventDiscovery: eventDiscoveryAddress,
    userTicketHub: userTicketHubAddress,
  };

  const frontendPath = path.join(__dirname, "../../frontend/src/utils");
  if (!fs.existsSync(frontendPath)) fs.mkdirSync(frontendPath, { recursive: true });

  const fileContent = `// Auto-generated on ${new Date().toISOString()}
// Network: ${hre.network.name}

export const CONTRACT_ADDRESSES = ${JSON.stringify(addresses, null, 2)};
`;

  fs.writeFileSync(path.join(frontendPath, "contractAddresses.js"), fileContent);
  console.log("📁 Contract addresses saved to frontend.");

  // Etherscan verification (for testnets/mainnet only)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("⏳ Waiting for 6 block confirmations...");
    await eventFactory.deploymentTransaction().wait(6);

    console.log("🔍 Verifying on Etherscan...");

    try {
      await hre.run("verify:verify", {
        address: eventFactoryAddress,
        constructorArguments: [],
      });
    } catch (e) {
      console.log("⚠️ EventFactory verification skipped or failed:", e.message);
    }

    try {
      await hre.run("verify:verify", {
        address: userTicketHubAddress,
        constructorArguments: [eventFactoryAddress],
      });
    } catch (e) {
      console.log("⚠️ UserTicketHub verification skipped or failed:", e.message);
    }

    try {
      await hre.run("verify:verify", {
        address: eventDiscoveryAddress,
        constructorArguments: [eventFactoryAddress],
      });
    } catch (e) {
      console.log("⚠️ EventDiscovery verification skipped or failed:", e.message);
    }
  }
}

main()
  .then(() => console.log("✅ All done!"))
  .catch((err) => {
    console.error("❌ Deployment failed:", err);
    process.exit(1);
  });
