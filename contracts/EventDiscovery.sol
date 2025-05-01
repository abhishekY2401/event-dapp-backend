// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.18;

import "./EventFactory.sol";
import "./EventCore.sol";

/**
 * @title EventDiscovery
 * @dev Contract for users to discover and filter events
 */
contract EventDiscovery {
    // Reference to the EventFactory contract
    EventFactory public eventFactory;

    // Event categories
    enum Category {
        Music,
        Sports,
        Arts,
        Technology,
        Business,
        Other
    }

    // Event metadata
    struct EventMetadata {
        uint eventId;
        Category category;
        string location;
        string description;
        string imageHash; // IPFS hash for event image
        uint createdAt;
        bool isFeatured;
        uint popularity; // Simple popularity metric (can be updated)
    }

    // Mapping from event ID to its metadata
    mapping(uint => EventMetadata) public eventMetadata;

    // Featured events
    uint[] public featuredEvents;

    // Events by category
    mapping(uint => uint[]) public eventsByCategory;

    // Events
    event EventMetadataAdded(uint indexed eventId, Category category);
    event EventFeatured(uint indexed eventId);
    event EventUnfeatured(uint indexed eventId);
    event EventPopularityUpdated(uint indexed eventId, uint newPopularity);

    /**
     * @dev Constructor to initialize the EventDiscovery with EventFactory
     * @param _eventFactoryAddress Address of the EventFactory contract
     */
    constructor(address _eventFactoryAddress) {
        eventFactory = EventFactory(_eventFactoryAddress);
    }

    /**
     * @dev Add metadata for an event
     * @param eventId ID of the event
     * @param category Event category
     * @param location Event location
     * @param description Event description
     * @param imageHash IPFS hash for event image
     */
    function addEventMetadata(
        uint eventId,
        Category category,
        string memory location,
        string memory description,
        string memory imageHash
    ) external {
        // Verify event exists
        address eventAddress = eventFactory.getEventContract(eventId);
        require(eventAddress != address(0), "Event does not exist");

        // Get event details to verify organizer
        EventCore eventCore = EventCore(payable(eventAddress));
        (address organizer, , , , , ) = eventCore.getEventDetails();

        // Only organizer can add metadata
        require(msg.sender == organizer, "Only the organizer can add metadata");

        // Create metadata
        eventMetadata[eventId] = EventMetadata({
            eventId: eventId,
            category: category,
            location: location,
            description: description,
            imageHash: imageHash,
            createdAt: block.timestamp,
            isFeatured: false,
            popularity: 0
        });

        // Add to category mapping
        eventsByCategory[uint(category)].push(eventId);

        emit EventMetadataAdded(eventId, category);
    }

    /**
     * @dev Feature an event (only owner can call)
     * @param eventId ID of the event to feature
     */
    function featureEvent(uint eventId) external {
        // Verify event exists
        address eventAddress = eventFactory.getEventContract(eventId);
        require(eventAddress != address(0), "Event does not exist");

        // Verify metadata exists
        require(
            eventMetadata[eventId].eventId == eventId,
            "Event metadata does not exist"
        );

        // Get event details to verify organizer
        EventCore eventCore = EventCore(payable(eventAddress));
        (address organizer, , , , , ) = eventCore.getEventDetails();

        // Only organizer can feature their event
        require(
            msg.sender == organizer,
            "Only the organizer can feature this event"
        );

        // Mark as featured if not already
        if (!eventMetadata[eventId].isFeatured) {
            eventMetadata[eventId].isFeatured = true;
            featuredEvents.push(eventId);
            emit EventFeatured(eventId);
        }
    }

    /**
     * @dev Unfeature an event
     * @param eventId ID of the event to unfeature
     */
    function unfeatureEvent(uint eventId) external {
        // Verify event exists
        address eventAddress = eventFactory.getEventContract(eventId);
        require(eventAddress != address(0), "Event does not exist");

        // Get event details to verify organizer
        EventCore eventCore = EventCore(payable(eventAddress));
        (address organizer, , , , , ) = eventCore.getEventDetails();

        // Only organizer can unfeature their event
        require(
            msg.sender == organizer,
            "Only the organizer can unfeature this event"
        );

        // Mark as not featured if currently featured
        if (eventMetadata[eventId].isFeatured) {
            eventMetadata[eventId].isFeatured = false;

            // Remove from featured events array
            for (uint i = 0; i < featuredEvents.length; i++) {
                if (featuredEvents[i] == eventId) {
                    featuredEvents[i] = featuredEvents[
                        featuredEvents.length - 1
                    ];
                    featuredEvents.pop();
                    break;
                }
            }

            emit EventUnfeatured(eventId);
        }
    }

    /**
     * @dev Update event popularity (internal function, called by interaction contract)
     * @param eventId ID of the event
     * @param newPopularity New popularity score
     */
    function updateEventPopularity(uint eventId, uint newPopularity) external {
        // Verify event exists
        address eventAddress = eventFactory.getEventContract(eventId);
        require(eventAddress != address(0), "Event does not exist");

        // Get event details to verify organizer
        EventCore eventCore = EventCore(payable(eventAddress));
        (address organizer, , , , , ) = eventCore.getEventDetails();

        // Only organizer can update popularity
        require(
            msg.sender == organizer,
            "Only the organizer can update popularity"
        );

        eventMetadata[eventId].popularity = newPopularity;
        emit EventPopularityUpdated(eventId, newPopularity);
    }

    /**
     * @dev Get featured events
     * @param count Maximum number of events to return
     * @return Array of featured event IDs
     */
    function getFeaturedEvents(
        uint count
    ) external view returns (uint[] memory) {
        uint resultCount = count < featuredEvents.length
            ? count
            : featuredEvents.length;
        uint[] memory result = new uint[](resultCount);

        for (uint i = 0; i < resultCount; i++) {
            result[i] = featuredEvents[i];
        }

        return result;
    }

    /**
     * @dev Get events by category
     * @param category Event category
     * @param count Maximum number of  events to return
     * @return Array of event IDs in the specified category
     */
    function getEventsByCategory(
        Category category,
        uint count
    ) external view returns (uint[] memory) {
        uint[] storage categoryEvents = eventsByCategory[uint(category)];
        uint resultCount = count < categoryEvents.length
            ? count
            : categoryEvents.length;
        uint[] memory result = new uint[](resultCount);

        for (uint i = 0; i < resultCount; i++) {
            result[i] = categoryEvents[i];
        }

        return result;
    }

    /**
     * @dev Get event metadata
     * @param eventId ID of the event
     * @return category Event category
     * @return location Event location
     * @return description Event description
     * @return imageHash IPFS hash for event image
     * @return createdAt Timestamp when metadata was created
     * @return isFeatured Whether the event is featured
     * @return popularity Event popularity score
     */
    function getEventMetadata(
        uint eventId
    )
        external
        view
        returns (
            Category category,
            string memory location,
            string memory description,
            string memory imageHash,
            uint createdAt,
            bool isFeatured,
            uint popularity
        )
    {
        EventMetadata memory metadata = eventMetadata[eventId];
        require(metadata.eventId == eventId, "Event metadata does not exist");

        return (
            metadata.category,
            metadata.location,
            metadata.description,
            metadata.imageHash,
            metadata.createdAt,
            metadata.isFeatured,
            metadata.popularity
        );
    }

    /**
     * @dev Get total number of events by category
     * @param category Event category
     * @return Count of events in the category
     */
    function getCategoryEventCount(
        Category category
    ) external view returns (uint) {
        return eventsByCategory[uint(category)].length;
    }
}
