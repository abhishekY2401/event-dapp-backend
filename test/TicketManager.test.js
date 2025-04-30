/**
 * @file TicketManager.test.js
 * @description Test suite for the TicketManager contract
 * Tests ticket purchase, transfer, and balance functionality
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TicketManager", function () {
  // Test variables
  let ticketManager;
  let eventCore;
  let organizer;
  let buyer;
  let recipient;
  let eventName = "Test Event";
  let eventDate;
  let ticketPrice = ethers.parseEther("0.1");
  let ticketCount = 100;

  // Setup before each test
  beforeEach(async function () {
    // Get test accounts
    [organizer, buyer, recipient] = await ethers.getSigners();
    
    // Set event date to 1 day from current block timestamp
    const latestBlock = await ethers.provider.getBlock('latest');
    eventDate = latestBlock.timestamp + 86400;

    // Deploy EventCore contract
    const EventCore = await ethers.getContractFactory("EventCore");
    eventCore = await EventCore.deploy(
      organizer.address,
      eventName,
      eventDate,
      ticketPrice,
      ticketCount
    );
    await eventCore.waitForDeployment();

    // Get and attach TicketManager contract
    const ticketManagerAddress = await eventCore.ticketManager();
    const TicketManager = await ethers.getContractFactory("TicketManager");
    ticketManager = TicketManager.attach(ticketManagerAddress);
  });

  // Test ticket purchase functionality
  describe("Ticket Purchase", function () {
    it("Should allow buying tickets", async function () {
      // Buy multiple tickets and verify balance
      const quantity = 2;
      await ticketManager.connect(buyer).buyTicket(quantity, { value: ticketPrice * BigInt(quantity) });
      
      expect(await ticketManager.tickets(buyer.address)).to.equal(quantity);
    });

    it("Should emit TicketsPurchased event", async function () {
      // Buy ticket and verify event emission
      const quantity = 1;
      await expect(ticketManager.connect(buyer).buyTicket(quantity, { value: ticketPrice }))
        .to.emit(ticketManager, "TicketsPurchased")
        .withArgs(buyer.address, quantity);
    });

    it("Should not allow buying tickets with insufficient payment", async function () {
      // Attempt to buy ticket with less than required payment
      await expect(
        ticketManager.connect(buyer).buyTicket(1, { value: ticketPrice - BigInt(1) })
      ).to.be.revertedWith("Insufficient Ether sent");
    });

    it("Should not allow buying tickets after event date", async function () {
      // Fast forward time past event date
      await ethers.provider.send("evm_increaseTime", [86400 * 2]);
      await ethers.provider.send("evm_mine");

      // Attempt to buy ticket after event date
      await expect(
        ticketManager.connect(buyer).buyTicket(1, { value: ticketPrice })
      ).to.be.revertedWith("Event has already occurred");
    });
  });

  // Test ticket transfer functionality
  describe("Ticket Transfer", function () {
    // Setup: Buy tickets before each transfer test
    beforeEach(async function () {
      await ticketManager.connect(buyer).buyTicket(2, { value: ticketPrice * BigInt(2) });
    });

    it("Should allow transferring tickets", async function () {
      // Transfer ticket and verify balances
      const quantity = 1;
      await ticketManager.connect(buyer).transferTicket(quantity, recipient.address);
      
      expect(await ticketManager.tickets(buyer.address)).to.equal(1);
      expect(await ticketManager.tickets(recipient.address)).to.equal(1);
    });

    it("Should emit TicketsTransferred event", async function () {
      // Transfer ticket and verify event emission
      const quantity = 1;
      await expect(ticketManager.connect(buyer).transferTicket(quantity, recipient.address))
        .to.emit(ticketManager, "TicketsTransferred")
        .withArgs(buyer.address, recipient.address, quantity);
    });

    it("Should not allow transferring more tickets than owned", async function () {
      // Attempt to transfer more tickets than owned
      await expect(
        ticketManager.connect(buyer).transferTicket(3, recipient.address)
      ).to.be.revertedWith("Insufficient tickets owned");
    });

    it("Should not allow transferring to zero address", async function () {
      // Attempt to transfer to zero address
      await expect(
        ticketManager.connect(buyer).transferTicket(1, ethers.ZeroAddress)
      ).to.be.revertedWith("Cannot transfer to zero address");
    });

    it("Should not allow transferring tickets after event date", async function () {
      // Fast forward time past event date
      await ethers.provider.send("evm_increaseTime", [86400 * 2]);
      await ethers.provider.send("evm_mine");

      // Attempt to transfer ticket after event date
      await expect(
        ticketManager.connect(buyer).transferTicket(1, recipient.address)
      ).to.be.revertedWith("Event has already occurred");
    });
  });

  // Test ticket balance functionality
  describe("Ticket Balance", function () {
    it("Should return correct ticket balance", async function () {
      // Buy tickets and verify balance
      const quantity = 3;
      await ticketManager.connect(buyer).buyTicket(quantity, { value: ticketPrice * BigInt(quantity) });
      
      expect(await ticketManager.getTicketBalance(buyer.address)).to.equal(quantity);
    });
  });
}); 