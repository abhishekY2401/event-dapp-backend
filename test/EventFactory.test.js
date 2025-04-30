/**
 * @file EventFactory.test.js
 * @description Test suite for the EventFactory contract
 * Tests the deployment, event creation, and various validation scenarios
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EventFactory", function () {
  // Test variables
  let eventFactory;
  let owner;
  let organizer;
  let eventName = "Test Event";
  let eventDate;
  let ticketPrice = ethers.parseEther("0.1");
  let ticketCount = 100;

  // Setup before each test
  beforeEach(async function () {
    // Get test accounts
    [owner, organizer] = await ethers.getSigners();
    
    // Set event date to 1 day from current block timestamp
    const latestBlock = await ethers.provider.getBlock('latest');
    eventDate = latestBlock.timestamp + 86400;

    // Deploy fresh EventFactory contract for each test
    const EventFactory = await ethers.getContractFactory("EventFactory");
    eventFactory = await EventFactory.deploy();
    await eventFactory.waitForDeployment();
  });

  // Test deployment scenarios
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await eventFactory.owner()).to.equal(owner.address);
    });

    it("Should start with nextEventId as 0", async function () {
      expect(await eventFactory.nextEventId()).to.equal(0);
    });
  });

  // Test event creation functionality
  describe("Event Creation", function () {
    it("Should create a new event", async function () {
      // Create event and verify contract deployment
      const tx = await eventFactory.connect(organizer).createEvent(
        eventName,
        eventDate,
        ticketPrice,
        ticketCount
      );

      const receipt = await tx.wait();
      const event = receipt.logs[0];
      
      // Verify event ID increment and contract address storage
      expect(await eventFactory.nextEventId()).to.equal(1);
      expect(await eventFactory.getEventContract(0)).to.not.equal(ethers.ZeroAddress);
    });

    it("Should emit EventCreated event", async function () {
      // Create first event to increment event ID
      const tx1 = await eventFactory.connect(organizer).createEvent(
        eventName,
        eventDate,
        ticketPrice,
        ticketCount
      );
      await tx1.wait();

      // Create second event and verify event emission
      const tx2 = await eventFactory.connect(organizer).createEvent(
        eventName,
        eventDate,
        ticketPrice,
        ticketCount
      );
      const receipt = await tx2.wait();
      const eventContractAddress = await eventFactory.getEventContract(1);

      // Verify event emission with correct parameters
      await expect(tx2)
        .to.emit(eventFactory, "EventCreated")
        .withArgs(1, eventContractAddress, organizer.address, eventName);
    });

    it("Should not allow creating event with past date", async function () {
      // Attempt to create event with past date
      const pastDate = (await ethers.provider.getBlock('latest')).timestamp - 86400;
      await expect(
        eventFactory.connect(organizer).createEvent(
          eventName,
          pastDate,
          ticketPrice,
          ticketCount
        )
      ).to.be.revertedWith("Event date must be in the future");
    });

    it("Should not allow creating event with zero tickets", async function () {
      // Attempt to create event with zero tickets
      await expect(
        eventFactory.connect(organizer).createEvent(
          eventName,
          eventDate,
          ticketPrice,
          0
        )
      ).to.be.revertedWith("Ticket count must be greater than 0");
    });
  });
}); 