const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Event Management System", function () {
  let eventFactory;
  let eventDiscovery;
  let userTicketHub;
  let owner;
  let organizer;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, organizer, user1, user2] = await ethers.getSigners();

    // Deploy EventFactory
    const EventFactory = await ethers.getContractFactory("EventFactory");
    eventFactory = await EventFactory.deploy();
    await eventFactory.waitForDeployment();

    // Deploy EventDiscovery
    const EventDiscovery = await ethers.getContractFactory("EventDiscovery");
    eventDiscovery = await EventDiscovery.deploy(
      await eventFactory.getAddress()
    );
    await eventDiscovery.waitForDeployment();

    // Deploy UserTicketHub
    const UserTicketHub = await ethers.getContractFactory("UserTicketHub");
    userTicketHub = await UserTicketHub.deploy(await eventFactory.getAddress());
    await userTicketHub.waitForDeployment();
  });

  describe("Event Creation", function () {
    it("Should create a new event", async function () {
      const eventName = "Test Event";
      const eventDate = Math.floor(Date.now() / 1000) + 86400; // Tomorrow
      const ticketPrice = ethers.parseEther("0.1");
      const ticketCount = 100;

      await eventFactory
        .connect(organizer)
        .createEvent(eventName, eventDate, ticketPrice, ticketCount);

      const eventId = 0; // First event
      const eventAddress = await eventFactory.getEventContract(eventId);
      expect(eventAddress).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("User Registration", function () {
    it("Should register a new user", async function () {
      const userName = "Test User";
      const email = "test@example.com";

      await userTicketHub.connect(user1).registerUser(userName, email);

      const profile = await userTicketHub.getUserProfile(user1.address);
      expect(profile.userName).to.equal(userName);
      expect(profile.email).to.equal(email);
      expect(profile.isRegistered).to.be.true;
    });
  });

  describe("Ticket Purchase", function () {
    let eventId;
    const ticketPrice = ethers.parseEther("0.1");

    beforeEach(async function () {
      // Create an event
      const eventDate = Math.floor(Date.now() / 1000) + 86400;
      await eventFactory
        .connect(organizer)
        .createEvent("Test Event", eventDate, ticketPrice, 100);
      eventId = 0;

      // Register user
      await userTicketHub
        .connect(user1)
        .registerUser("Test User", "test@example.com");
    });

    it("Should allow user to buy tickets", async function () {
      const quantity = 2;
      const totalPrice = ticketPrice * BigInt(quantity);

      await userTicketHub.connect(user1).buyTickets(eventId, quantity, {
        value: totalPrice,
      });

      const ticketCount = await userTicketHub.getUserTicketCount(
        user1.address,
        eventId
      );
      expect(ticketCount).to.equal(quantity);
    });
  });

  describe("Ticket Transfer", function () {
    let eventId;
    const ticketPrice = ethers.parseEther("0.1");

    beforeEach(async function () {
      // Create an event
      const eventDate = Math.floor(Date.now() / 1000) + 86400;
      await eventFactory
        .connect(organizer)
        .createEvent("Test Event", eventDate, ticketPrice, 100);
      eventId = 0;

      // Register users
      await userTicketHub
        .connect(user1)
        .registerUser("User 1", "user1@example.com");
      await userTicketHub
        .connect(user2)
        .registerUser("User 2", "user2@example.com");

      // Buy tickets
      const quantity = 2;
      const totalPrice = ticketPrice * BigInt(quantity);
      await userTicketHub.connect(user1).buyTickets(eventId, quantity, {
        value: totalPrice,
      });
    });    it("Should allow transfer of tickets between users", async function () {
      const transferQuantity = 1;
      // We already have tickets from the beforeEach block, no need to buy more
      const initialBalance = await userTicketHub.getUserTicketCount(user1.address, eventId);

      await userTicketHub
        .connect(user1)
        .transferTickets(eventId, user2.address, transferQuantity, {
          value: ticketPrice * BigInt(transferQuantity)
        });

      const user1Tickets = await userTicketHub.getUserTicketCount(user1.address, eventId);
      const user2Tickets = await userTicketHub.getUserTicketCount(user2.address, eventId);      expect(Number(user1Tickets)).to.equal(Number(initialBalance) - transferQuantity);
      expect(Number(user2Tickets)).to.equal(transferQuantity);
    });
  });

  describe("Event Discovery", function () {
    let eventId;

    beforeEach(async function () {
      // Create an event
      const eventDate = Math.floor(Date.now() / 1000) + 86400;
      await eventFactory
        .connect(organizer)
        .createEvent("Test Event", eventDate, ethers.parseEther("0.1"), 100);
      eventId = 0;
    });

    it("Should add event metadata", async function () {
      await eventDiscovery.connect(organizer).addEventMetadata(
        eventId,
        0, // Music category
        "Test Location",
        "Test Description",
        "ipfs://test"
      );

      const metadata = await eventDiscovery.getEventMetadata(eventId);
      expect(metadata.location).to.equal("Test Location");
      expect(metadata.description).to.equal("Test Description");
    });

    it("Should feature an event", async function () {
      await eventDiscovery
        .connect(organizer)
        .addEventMetadata(
          eventId,
          0,
          "Test Location",
          "Test Description",
          "ipfs://test"
        );

      await eventDiscovery.connect(organizer).featureEvent(eventId);
      const featuredEvents = await eventDiscovery.getFeaturedEvents(10);
      expect(featuredEvents).to.include(BigInt(eventId));
    });
  });
});
