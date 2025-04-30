/**
 * @file EventCore.test.js
 * @description Test suite for the EventCore contract
 * Tests the deployment, event details, and ticket management functionality
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EventCore", function () {
  // Test variables
  let eventCore;
  let organizer;
  let attendee;
  let eventName = "Test Event";
  let eventDate;
  let ticketPrice = ethers.parseEther("0.1");
  let ticketCount = 100;

  // Setup before each test
  beforeEach(async function () {
    // Get test accounts
    [organizer, attendee] = await ethers.getSigners();
    
    // Set event date to 1 day from current block timestamp
    const latestBlock = await ethers.provider.getBlock('latest');
    eventDate = latestBlock.timestamp + 86400;

    // Deploy fresh EventCore contract for each test
    const EventCore = await ethers.getContractFactory("EventCore");
    eventCore = await EventCore.deploy(
      organizer.address,
      eventName,
      eventDate,
      ticketPrice,
      ticketCount
    );
    await eventCore.waitForDeployment();
  });

  // Test deployment scenarios
  describe("Deployment", function () {
    it("Should set the right organizer", async function () {
      expect(await eventCore.organizer()).to.equal(organizer.address);
    });

    it("Should set the correct event details", async function () {
      // Verify all event details are set correctly
      const details = await eventCore.getEventDetails();
      expect(details[0]).to.equal(organizer.address);
      expect(details[1]).to.equal(eventName);
      expect(details[2]).to.equal(eventDate);
      expect(details[3]).to.equal(ticketPrice);
      expect(details[4]).to.equal(ticketCount);
      expect(details[5]).to.equal(ticketCount);
    });

    it("Should create a ticket manager", async function () {
      // Verify ticket manager contract is deployed
      const ticketManager = await eventCore.ticketManager();
      expect(ticketManager).to.not.equal(ethers.ZeroAddress);
    });
  });

  // Test ticket management functionality
  describe("Ticket Management", function () {
    it("Should allow ticket manager to decrease remaining tickets", async function () {
      // Get ticket manager contract
      const ticketManager = await eventCore.ticketManager();
      const TicketManager = await ethers.getContractFactory("TicketManager");
      const ticketManagerContract = TicketManager.attach(ticketManager);

      // Buy a ticket and verify remaining tickets decrease
      await ticketManagerContract.connect(attendee).buyTicket(1, { value: ticketPrice });
      
      const details = await eventCore.getEventDetails();
      expect(details[5]).to.equal(ticketCount - 1);
    });

    it("Should not allow non-ticket manager to decrease remaining tickets", async function () {
      // Attempt to decrease tickets directly through EventCore
      await expect(
        eventCore.connect(attendee).decreaseTicketRemain(1)
      ).to.be.revertedWith("Only ticket manager can update ticket count");
    });

    it("Should not allow decreasing more tickets than available", async function () {
      // Get ticket manager contract
      const ticketManager = await eventCore.ticketManager();
      const TicketManager = await ethers.getContractFactory("TicketManager");
      const ticketManagerContract = TicketManager.attach(ticketManager);

      // Attempt to buy more tickets than available
      await expect(
        ticketManagerContract.connect(attendee).buyTicket(ticketCount + 1, { value: ticketPrice * BigInt(ticketCount + 1) })
      ).to.be.revertedWith("Not enough tickets available");
    });
  });
}); 