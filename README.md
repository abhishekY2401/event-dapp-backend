# event-dapp-backend

## Running the Hardhat Project

This project uses [Hardhat](https://hardhat.org/) for Ethereum smart contract development, testing, and deployment.

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or later recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### 1. Install Dependencies
Navigate to the project directory and install the required dependencies:

```bash
npm install
```

### 2. Compile Contracts
To compile the smart contracts:

```bash
npx hardhat compile
```

### 3. Run Tests
To run the test suite:

```bash
npx hardhat test
```

### 4. Run a Local Hardhat Node
To start a local Ethereum node for development:

```bash
npx hardhat node
```

This will start a local blockchain instance. You can deploy contracts to this network and interact with them.

### 5. Deploy Contracts
To deploy contracts to the local Hardhat node (in a separate terminal):

```bash
npx hardhat run scripts/deploy.js --network localhost
```

> **Note:** If you use Hardhat Ignition for deployment, refer to the [Ignition documentation](https://hardhat.org/ignition) and your `ignition/modules` folder for deployment scripts.

### 6. Interact with Contracts
You can use Hardhat tasks, scripts, or the Hardhat console:

```bash
npx hardhat console --network localhost
```

### Additional Resources
- [Hardhat Documentation](https://hardhat.org/getting-started/)
- [Hardhat Ignition](https://hardhat.org/ignition)

---


