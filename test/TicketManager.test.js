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

    // Set event date to 2 days from now to ensure enough time for tests
    const currentBlock = await ethers.provider.getBlock("latest");
    eventDate = currentBlock.timestamp + 172800; // 2 days in seconds

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
      const quantity = 2;

      await ticketManager.connect(buyer).buyTicket(quantity, {
        value: ticketPrice * BigInt(quantity),
      });

      const balance = await ticketManager.getTicketBalance(buyer.address);
      expect(balance).to.equal(quantity);
    });

    it("Should emit TicketsPurchased event", async function () {
      const quantity = 2;

      await expect(
        ticketManager.connect(buyer).buyTicket(quantity, {
          value: ticketPrice * BigInt(quantity),
        })
      )
        .to.emit(ticketManager, "TicketsPurchased")
        .withArgs(buyer.address, quantity);
    });

    it("Should not allow buying tickets with insufficient payment", async function () {
      const quantity = 2;

      await expect(
        ticketManager.connect(buyer).buyTicket(quantity, {
          value: ticketPrice * BigInt(quantity - 1),
        })
      ).to.be.revertedWith("Insufficient Ether sent");
    });

    it("Should not allow buying tickets after event date", async function () {
      // Fast forward time past event date
      await ethers.provider.send("evm_increaseTime", [172800 * 2]); // 4 days
      await ethers.provider.send("evm_mine");

      const quantity = 2;

      await expect(
        ticketManager.connect(buyer).buyTicket(quantity, {
          value: ticketPrice * BigInt(quantity),
        })
      ).to.be.revertedWith("Event has already occurred");
    });
  });

  // Test ticket transfer functionality
  describe("Ticket Transfer", function () {
    beforeEach(async function () {
      // Buy some tickets first
      const quantity = 2;

      await ticketManager.connect(buyer).buyTicket(quantity, {
        value: ticketPrice * BigInt(quantity),
      });
    });

    it("Should allow transferring tickets", async function () {
      const transferQuantity = 1;

      await ticketManager
        .connect(buyer)
        .transferTicket(transferQuantity, recipient.address);

      const buyerBalance = await ticketManager.getTicketBalance(buyer.address);
      const recipientBalance = await ticketManager.getTicketBalance(
        recipient.address
      );

      expect(buyerBalance).to.equal(1);
      expect(recipientBalance).to.equal(1);
    });

    it("Should emit TicketsTransferred event", async function () {
      const transferQuantity = 1;

      await expect(
        ticketManager
          .connect(buyer)
          .transferTicket(transferQuantity, recipient.address)
      )
        .to.emit(ticketManager, "TicketsTransferred")
        .withArgs(buyer.address, recipient.address, transferQuantity);
    });

    it("Should not allow transferring more tickets than owned", async function () {
      const transferQuantity = 3;

      await expect(
        ticketManager
          .connect(buyer)
          .transferTicket(transferQuantity, recipient.address)
      ).to.be.revertedWith("Insufficient tickets owned");
    });

    it("Should not allow transferring to zero address", async function () {
      const transferQuantity = 1;

      await expect(
        ticketManager
          .connect(buyer)
          .transferTicket(transferQuantity, ethers.ZeroAddress)
      ).to.be.revertedWith("Cannot transfer to zero address");
    });

    it("Should not allow transferring tickets after event date", async function () {
      // Fast forward time past event date
      await ethers.provider.send("evm_increaseTime", [172800 * 2]); // 4 days
      await ethers.provider.send("evm_mine");

      // Verify we're past the event date
      const currentBlock = await ethers.provider.getBlock("latest");
      expect(currentBlock.timestamp).to.be.greaterThan(eventDate);

      const transferQuantity = 1;

      // First verify the event date in the contract
      const contractEventDate = await eventCore.date();
      expect(currentBlock.timestamp).to.be.greaterThan(contractEventDate);

      // Now attempt the transfer
      await expect(
        ticketManager
          .connect(buyer)
          .transferTicket(transferQuantity, recipient.address)
      ).to.be.revertedWith("Event has already occurred");
    });
  });

  // Test ticket balance functionality
  describe("Ticket Balance", function () {
    it("Should return correct ticket balance", async function () {
      const quantity = 2;

      await ticketManager.connect(buyer).buyTicket(quantity, {
        value: ticketPrice * BigInt(quantity),
      });

      const balance = await ticketManager.getTicketBalance(buyer.address);
      expect(balance).to.equal(quantity);
    });
  });
});
