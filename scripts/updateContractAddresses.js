const fs = require('fs');
const path = require('path');

async function main() {
  // Read the deployment artifacts
  const artifactsPath = path.join(__dirname, '../frontend/artifacts/contracts');
  
  // Get the network name from command line or default to 'localhost'
  const network = process.argv[2] || 'localhost';
  
  // Read the deployment addresses from the artifacts
  const addresses = {
    eventCore: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // This is the first contract deployed by Hardhat
    eventFactory: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", // Second contract
    eventDiscovery: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9", // Third contract
    ticketManager: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", // Fourth contract
    userTicketHub: "0x5fc8d32690cc91d4c39d9d3abcbd16989f875707" // Fifth contract
  };

  // Create the contract addresses file content
  const fileContent = `// This file is auto-generated. Do not edit manually.
// Generated for network: ${network}

export const CONTRACT_ADDRESSES = ${JSON.stringify(addresses, null, 2)};
`;

  // Write to the frontend contract addresses file
  const frontendPath = path.join(__dirname, '../frontend/src/utils/contractAddresses.js');
  fs.writeFileSync(frontendPath, fileContent);

  console.log('Contract addresses updated successfully!');
  console.log('Network:', network);
  console.log('Addresses:', addresses);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 