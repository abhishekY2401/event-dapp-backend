/**
 * @file UserTicketHub.test.js
 * @description Test suite for the UserTicketHub contract
 * Tests user registration, profile management, ticket operations, and event interactions
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UserTicketHub", function () {
  // Test variables
  let userTicketHub;
  let eventFactory;
  let eventCore;
  let ticketManager;
  let owner;
  let organizer;
  let user1;
  let user2;
  let eventName = "Test Event";
  let eventDate;
  let ticketPrice = ethers.parseEther("0.1");
  let ticketCount = 100;

  // Setup before each test
  beforeEach(async function () {
    // Get test accounts
    [owner, organizer, user1, user2] = await ethers.getSigners();
    
    // Set event date to 1 day from current block timestamp
    const latestBlock = await ethers.provider.getBlock('latest');
    eventDate = latestBlock.timestamp + 86400;

    // Deploy EventFactory
    const EventFactory = await ethers.getContractFactory("EventFactory");
    eventFactory = await EventFactory.deploy();
    await eventFactory.waitForDeployment();

    // Deploy UserTicketHub
    const UserTicketHub = await ethers.getContractFactory("UserTicketHub");
    userTicketHub = await UserTicketHub.deploy(await eventFactory.getAddress());
    await userTicketHub.waitForDeployment();

    // Create a test event
    const tx = await eventFactory.connect(organizer).createEvent(
      eventName,
      eventDate,
      ticketPrice,
      ticketCount
    );
    const receipt = await tx.wait();
    const eventContractAddress = await eventFactory.getEventContract(0);
    
    // Get EventCore and TicketManager instances
    const EventCore = await ethers.getContractFactory("EventCore");
    eventCore = EventCore.attach(eventContractAddress);
    const ticketManagerAddress = await eventCore.ticketManager();
    const TicketManager = await ethers.getContractFactory("TicketManager");
    ticketManager = TicketManager.attach(ticketManagerAddress);
  });

  // Test user registration functionality
  describe("User Registration", function () {
    it("Should allow user registration", async function () {
      const userName = "TestUser";
      const email = "test@example.com";
      
      await userTicketHub.connect(user1).registerUser(userName, email);
      
      const profile = await userTicketHub.getUserProfile(user1.address);
      expect(profile[0]).to.equal(userName);
      expect(profile[1]).to.equal(email);
      expect(profile[2]).to.be.true;
      expect(profile[3]).to.equal(0);
    });

    it("Should not allow duplicate registration", async function () {
      const userName = "TestUser";
      const email = "test@example.com";
      
      await userTicketHub.connect(user1).registerUser(userName, email);
      
      await expect(
        userTicketHub.connect(user1).registerUser(userName, email)
      ).to.be.revertedWith("User already registered");
    });

    it("Should emit UserRegistered event", async function () {
      const userName = "TestUser";
      const email = "test@example.com";
      
      await expect(userTicketHub.connect(user1).registerUser(userName, email))
        .to.emit(userTicketHub, "UserRegistered")
        .withArgs(user1.address, userName);
    });
  });

  // Test profile management functionality
  describe("Profile Management", function () {
    beforeEach(async function () {
      await userTicketHub.connect(user1).registerUser("TestUser", "test@example.com");
    });

    it("Should allow profile updates", async function () {
      const newUserName = "UpdatedUser";
      const newEmail = "updated@example.com";
      
      await userTicketHub.connect(user1).updateProfile(newUserName, newEmail);
      
      const profile = await userTicketHub.getUserProfile(user1.address);
      expect(profile[0]).to.equal(newUserName);
      expect(profile[1]).to.equal(newEmail);
    });

    it("Should emit ProfileUpdated event", async function () {
      const newUserName = "UpdatedUser";
      const newEmail = "updated@example.com";
      
      await expect(userTicketHub.connect(user1).updateProfile(newUserName, newEmail))
        .to.emit(userTicketHub, "ProfileUpdated")
        .withArgs(user1.address, newUserName);
    });

    it("Should not allow updates for unregistered users", async function () {
      await expect(
        userTicketHub.connect(user2).updateProfile("NewUser", "new@example.com")
      ).to.be.revertedWith("User not registered");
    });
  });

  // Test ticket operations
  describe("Ticket Operations", function () {
    beforeEach(async function () {
      await userTicketHub.connect(user1).registerUser("TestUser", "test@example.com");
      await userTicketHub.connect(user2).registerUser("TestUser2", "test2@example.com");
    });

    it("Should allow buying tickets", async function () {
      const quantity = 2;
      await userTicketHub.connect(user1).buyTickets(0, quantity, { value: ticketPrice * BigInt(quantity) });
      
      const ticketCount = await userTicketHub.getUserTicketCount(user1.address, 0);
      expect(ticketCount).to.equal(quantity);
    });

    it("Should emit TicketsPurchased event", async function () {
      const quantity = 1;
      await expect(userTicketHub.connect(user1).buyTickets(0, quantity, { value: ticketPrice }))
        .to.emit(userTicketHub, "TicketsPurchased")
        .withArgs(user1.address, 0, quantity);
    });

    it("Should allow transferring tickets", async function () {
      // First buy tickets
      const quantity = 2;
      await userTicketHub.connect(user1).buyTickets(0, quantity, { value: ticketPrice * BigInt(quantity) });

      // Ensure user1 has enough tickets
      const initialUser1Balance = await userTicketHub.getUserTicketCount(user1.address, 0);
      expect(initialUser1Balance).to.be.gte(1);      // Then transfer one ticket
      await userTicketHub.connect(user1).transferTickets(0, user2.address, 1, {
        value: ticketPrice
      });      expect(Number(await userTicketHub.getUserTicketCount(user1.address, 0))).to.equal(Number(initialUser1Balance) - 1);
      expect(Number(await userTicketHub.getUserTicketCount(user2.address, 0))).to.equal(1);
    });

    it("Should emit TicketsTransferred event", async function () {
      // First buy tickets
      await userTicketHub.connect(user1).buyTickets(0, 1, { value: ticketPrice });      // Then transfer ticket
      await expect(userTicketHub.connect(user1).transferTickets(0, user2.address, 1, {
        value: ticketPrice
      }))
        .to.emit(userTicketHub, "TicketsTransferred")
        .withArgs(user1.address, user2.address, 0, 1);
    });

    it("Should not allow transferring to zero address", async function () {
      // First buy tickets
      await userTicketHub.connect(user1).buyTickets(0, 1, { value: ticketPrice });

      // Attempt transfer to zero address
      await expect(
        userTicketHub.connect(user1).transferTickets(0, ethers.ZeroAddress, 1)
      ).to.be.revertedWith("Cannot transfer to zero address");
    });

    it("Should not allow transferring more tickets than owned", async function () {
      await userTicketHub.connect(user1).buyTickets(0, 1, { value: ticketPrice });
      
      await expect(
        userTicketHub.connect(user1).transferTickets(0, user2.address, 2)
      ).to.be.revertedWith("Insufficient tickets owned");
    });
  });

  // Test event interactions
  describe("Event Interactions", function () {
    beforeEach(async function () {
      await userTicketHub.connect(user1).registerUser("TestUser", "test@example.com");
    });

    it("Should allow favoriting events", async function () {
      await userTicketHub.connect(user1).favoriteEvent(0);
      
      expect(await userTicketHub.isEventFavorite(user1.address, 0)).to.be.true;
    });

    it("Should emit EventFavorited event", async function () {
      await expect(userTicketHub.connect(user1).favoriteEvent(0))
        .to.emit(userTicketHub, "EventFavorited")
        .withArgs(user1.address, 0);
    });

    it("Should allow unfavoriting events", async function () {
      await userTicketHub.connect(user1).favoriteEvent(0);
      await userTicketHub.connect(user1).unfavoriteEvent(0);
      
      expect(await userTicketHub.isEventFavorite(user1.address, 0)).to.be.false;
    });

    it("Should emit EventUnfavorited event", async function () {
      await userTicketHub.connect(user1).favoriteEvent(0);
      
      await expect(userTicketHub.connect(user1).unfavoriteEvent(0))
        .to.emit(userTicketHub, "EventUnfavorited")
        .withArgs(user1.address, 0);
    });

    it("Should track attending events", async function () {
      await userTicketHub.connect(user1).buyTickets(0, 1, { value: ticketPrice });
      
      const attendingEvents = await userTicketHub.getUserAttendingEvents(user1.address);
      expect(attendingEvents.length).to.equal(1);
      expect(attendingEvents[0]).to.equal(0);
    });
  });

  // Test transfer functionality
  describe("Transfer Operations", function () {
    beforeEach(async function () {
      await userTicketHub.connect(user1).registerUser("TestUser", "test@example.com");
      await userTicketHub.connect(user2).registerUser("TestUser2", "test2@example.com");
      
      // Buy tickets for user1
      const quantity = 2;
      await userTicketHub.connect(user1).buyTickets(0, quantity, { value: ticketPrice * BigInt(quantity) });
    });

    it("Should allow initiating a transfer", async function () {
      const quantity = 1;
      await userTicketHub.connect(user1).initiateTransfer(0, user2.address, quantity);
      
      const pendingQty = await userTicketHub.pendingTransfers(user1.address, 0, user2.address);
      expect(pendingQty).to.equal(quantity);
    });

    it("Should emit TransferInitiated event", async function () {
      const quantity = 1;
      await expect(userTicketHub.connect(user1).initiateTransfer(0, user2.address, quantity))
        .to.emit(userTicketHub, "TransferInitiated")
        .withArgs(user1.address, user2.address, 0, quantity);
    });

    it("Should not allow initiating transfer to self", async function () {
      await expect(
        userTicketHub.connect(user1).initiateTransfer(0, user1.address, 1)
      ).to.be.revertedWith("Cannot transfer to yourself");
    });

    it("Should not allow initiating transfer with insufficient tickets", async function () {
      await expect(
        userTicketHub.connect(user1).initiateTransfer(0, user2.address, 3)
      ).to.be.revertedWith("Insufficient tickets owned");
    });

    it("Should not allow duplicate pending transfers", async function () {
      await userTicketHub.connect(user1).initiateTransfer(0, user2.address, 1);
      
      await expect(
        userTicketHub.connect(user1).initiateTransfer(0, user2.address, 1)
      ).to.be.revertedWith("Transfer already initiated");
    });

    it("Should allow accepting a transfer", async function () {
      const quantity = 1;
      await userTicketHub.connect(user1).initiateTransfer(0, user2.address, quantity);
      
      await userTicketHub.connect(user2).acceptTransfer(user1.address, 0, {
        value: ticketPrice * BigInt(quantity)
      });
      
      const user1Tickets = await userTicketHub.getUserTicketCount(user1.address, 0);
      const user2Tickets = await userTicketHub.getUserTicketCount(user2.address, 0);
      
      expect(user1Tickets).to.equal(1); // 2 - 1
      expect(user2Tickets).to.equal(1);
    });

    it("Should emit TicketsTransferred event on acceptance", async function () {
      const quantity = 1;
      await userTicketHub.connect(user1).initiateTransfer(0, user2.address, quantity);
      
      await expect(userTicketHub.connect(user2).acceptTransfer(user1.address, 0, {
        value: ticketPrice * BigInt(quantity)
      }))
        .to.emit(userTicketHub, "TicketsTransferred")
        .withArgs(user1.address, user2.address, 0, quantity);
    });

    it("Should not allow accepting non-existent transfer", async function () {
      await expect(
        userTicketHub.connect(user2).acceptTransfer(user1.address, 0, {
          value: ticketPrice
        })
      ).to.be.revertedWith("No pending transfer found");
    });

    it("Should not allow accepting transfer with insufficient payment", async function () {
      await userTicketHub.connect(user1).initiateTransfer(0, user2.address, 1);
      
      await expect(
        userTicketHub.connect(user2).acceptTransfer(user1.address, 0, {
          value: ticketPrice / BigInt(2) // Half the required amount
        })
      ).to.be.revertedWith("Insufficient payment from recipient");
    });

    it("Should clear pending transfer after acceptance", async function () {
      const quantity = 1;
      await userTicketHub.connect(user1).initiateTransfer(0, user2.address, quantity);
      
      await userTicketHub.connect(user2).acceptTransfer(user1.address, 0, {
        value: ticketPrice * BigInt(quantity)
      });
      
      const pendingQty = await userTicketHub.pendingTransfers(user1.address, 0, user2.address);
      expect(pendingQty).to.equal(0);
    });

    it("Should not allow accepting transfer if sender no longer has enough tickets", async function () {
      // First transfer one ticket to owner to leave user1 with exactly 1 ticket
      await userTicketHub.connect(user1).transferTickets(0, owner.address, 1, {
        value: ticketPrice
      });

      // Initiate transfer of the last ticket
      await userTicketHub.connect(user1).initiateTransfer(0, user2.address, 1);
      
      // Transfer the last ticket to someone else
      const tx = await userTicketHub.connect(user1).transferTickets(0, owner.address, 1, {
        value: ticketPrice
      });
      
      // Wait for the transfer transaction to be mined
      await tx.wait();
      
      // Try to accept the pending transfer
      await expect(
        userTicketHub.connect(user2).acceptTransfer(user1.address, 0, {
          value: ticketPrice
        })
      ).to.be.revertedWith("Sender no longer has enough tickets");
    });
  });
});