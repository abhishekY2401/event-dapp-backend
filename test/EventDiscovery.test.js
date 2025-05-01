/**
 * @file EventDiscovery.test.js
 * @description Test suite for the EventDiscovery contract
 * Tests event metadata management, categorization, featuring, and discovery functionality
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EventDiscovery", function () {
  // Test variables
  let eventDiscovery;
  let eventFactory;
  let eventCore;
  let owner;
  let organizer;
  let user1;
  let eventName = "Test Event";
  let eventDate;
  let ticketPrice = ethers.parseEther("0.1");
  let ticketCount = 100;

  // Setup before each test
  beforeEach(async function () {
    // Get test accounts
    [owner, organizer, user1] = await ethers.getSigners();
    
    // Set event date to 1 day from current block timestamp
    const latestBlock = await ethers.provider.getBlock('latest');
    eventDate = latestBlock.timestamp + 86400;

    // Deploy EventFactory
    const EventFactory = await ethers.getContractFactory("EventFactory");
    eventFactory = await EventFactory.deploy();
    await eventFactory.waitForDeployment();

    // Deploy EventDiscovery
    const EventDiscovery = await ethers.getContractFactory("EventDiscovery");
    eventDiscovery = await EventDiscovery.deploy(await eventFactory.getAddress());
    await eventDiscovery.waitForDeployment();

    // Create a test event
    const tx = await eventFactory.connect(organizer).createEvent(
      eventName,
      eventDate,
      ticketPrice,
      ticketCount
    );
    const receipt = await tx.wait();
    const eventContractAddress = await eventFactory.getEventContract(0);
    
    // Get EventCore instance
    const EventCore = await ethers.getContractFactory("EventCore");
    eventCore = EventCore.attach(eventContractAddress);
  });

  // Test event metadata functionality
  describe("Event Metadata", function () {
    it("Should allow adding event metadata", async function () {
      const category = 0; // Music
      const location = "New York";
      const description = "A great music event";
      const imageHash = "QmHash123";

      await eventDiscovery.connect(organizer).addEventMetadata(
        0,
        category,
        location,
        description,
        imageHash
      );

      const metadata = await eventDiscovery.getEventMetadata(0);
      expect(metadata[0]).to.equal(category);
      expect(metadata[1]).to.equal(location);
      expect(metadata[2]).to.equal(description);
      expect(metadata[3]).to.equal(imageHash);
    });

    it("Should emit EventMetadataAdded event", async function () {
      const category = 0; // Music
      const location = "New York";
      const description = "A great music event";
      const imageHash = "QmHash123";

      await expect(
        eventDiscovery.connect(organizer).addEventMetadata(
          0,
          category,
          location,
          description,
          imageHash
        )
      )
        .to.emit(eventDiscovery, "EventMetadataAdded")
        .withArgs(0, category);
    });

    it("Should not allow non-organizer to add metadata", async function () {
      const category = 0; // Music
      const location = "New York";
      const description = "A great music event";
      const imageHash = "QmHash123";

      await expect(
        eventDiscovery.connect(user1).addEventMetadata(
          0,
          category,
          location,
          description,
          imageHash
        )
      ).to.be.revertedWith("Only the organizer can add metadata");
    });
  });

  // Test event featuring functionality
  describe("Event Featuring", function () {
    beforeEach(async function () {
      // Add metadata first
      await eventDiscovery.connect(organizer).addEventMetadata(
        0,
        0, // Music
        "New York",
        "A great music event",
        "QmHash123"
      );
    });

    it("Should allow featuring an event", async function () {
      await eventDiscovery.connect(organizer).featureEvent(0);
      
      const metadata = await eventDiscovery.getEventMetadata(0);
      expect(metadata[5]).to.be.true; // isFeatured
    });

    it("Should emit EventFeatured event", async function () {
      await expect(eventDiscovery.connect(organizer).featureEvent(0))
        .to.emit(eventDiscovery, "EventFeatured")
        .withArgs(0);
    });

    it("Should allow unfeaturing an event", async function () {
      // First feature the event
      await eventDiscovery.connect(organizer).featureEvent(0);
      
      // Then unfeature it
      await eventDiscovery.connect(organizer).unfeatureEvent(0);
      
      const metadata = await eventDiscovery.getEventMetadata(0);
      expect(metadata[5]).to.be.false; // isFeatured
    });

    it("Should emit EventUnfeatured event", async function () {
      // First feature the event
      await eventDiscovery.connect(organizer).featureEvent(0);
      
      // Then unfeature it
      await expect(eventDiscovery.connect(organizer).unfeatureEvent(0))
        .to.emit(eventDiscovery, "EventUnfeatured")
        .withArgs(0);
    });

    it("Should not allow non-organizer to feature/unfeature", async function () {
      await expect(
        eventDiscovery.connect(user1).featureEvent(0)
      ).to.be.revertedWith("Only the organizer can feature this event");

      await expect(
        eventDiscovery.connect(user1).unfeatureEvent(0)
      ).to.be.revertedWith("Only the organizer can unfeature this event");
    });
  });

  // Test event discovery functionality
  describe("Event Discovery", function () {
    beforeEach(async function () {
      // Add metadata for multiple events
      await eventDiscovery.connect(organizer).addEventMetadata(
        0,
        0, // Music
        "New York",
        "A great music event",
        "QmHash123"
      );

      // Create and add metadata for a second event
      const tx = await eventFactory.connect(organizer).createEvent(
        "Sports Event",
        eventDate,
        ticketPrice,
        ticketCount
      );
      await tx.wait();

      await eventDiscovery.connect(organizer).addEventMetadata(
        1,
        1, // Sports
        "Los Angeles",
        "A great sports event",
        "QmHash456"
      );
    });

    it("Should get featured events", async function () {
      // Feature the first event
      await eventDiscovery.connect(organizer).featureEvent(0);
      
      const featuredEvents = await eventDiscovery.getFeaturedEvents(10);
      expect(featuredEvents.length).to.equal(1);
      expect(featuredEvents[0]).to.equal(0);
    });

    it("Should get events by category", async function () {
      const musicEvents = await eventDiscovery.getEventsByCategory(0, 10); // Music category
      const sportsEvents = await eventDiscovery.getEventsByCategory(1, 10); // Sports category
      
      expect(musicEvents.length).to.equal(1);
      expect(sportsEvents.length).to.equal(1);
      expect(musicEvents[0]).to.equal(0);
      expect(sportsEvents[0]).to.equal(1);
    });

    it("Should get correct category event count", async function () {
      const musicCount = await eventDiscovery.getCategoryEventCount(0); // Music category
      const sportsCount = await eventDiscovery.getCategoryEventCount(1); // Sports category
      
      expect(musicCount).to.equal(1);
      expect(sportsCount).to.equal(1);
    });
  });

  // Test event popularity functionality
  describe("Event Popularity", function () {
    beforeEach(async function () {
      // Add metadata first
      await eventDiscovery.connect(organizer).addEventMetadata(
        0,
        0, // Music
        "New York",
        "A great music event",
        "QmHash123"
      );
    });

    it("Should allow updating event popularity", async function () {
      const newPopularity = 100;
      await eventDiscovery.connect(organizer).updateEventPopularity(0, newPopularity);
      
      const metadata = await eventDiscovery.getEventMetadata(0);
      expect(metadata[6]).to.equal(newPopularity); // popularity
    });

    it("Should emit EventPopularityUpdated event", async function () {
      const newPopularity = 100;
      await expect(eventDiscovery.connect(organizer).updateEventPopularity(0, newPopularity))
        .to.emit(eventDiscovery, "EventPopularityUpdated")
        .withArgs(0, newPopularity);
    });

    it("Should not allow non-organizer to update popularity", async function () {
      await expect(
        eventDiscovery.connect(user1).updateEventPopularity(0, 100)
      ).to.be.revertedWith("Only the organizer can update popularity");
    });
  });
}); 