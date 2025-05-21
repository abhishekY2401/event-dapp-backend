// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.18;

import "./EventCore.sol";
import "./TicketManager.sol";
import "./EventFactory.sol";

/**
 * @title UserTicketHub
 * @dev Central contract for users to manage their ticket purchases and interactions
 */

contract UserTicketHub {
    // Contract Owner
    address public owner;

    // reference to EventFactory contract
    EventFactory public eventFactory;

    // User Profiles
    struct UserProfile {
        string userName;
        string email;
        bool isRegistered;
        uint totalTicketsOwned;
        uint[] attendingEvents; // Events which users are attending
    }

    // Mapping from user address to their profile
    mapping(address => UserProfile) public userProfiles;

    // Mapping from user address to their favorite events
    mapping(address => mapping(uint => bool)) public favoriteEvents;

    // Mapping to track user purchased tickets across all events
    // user address => eventId => ticketCount
    mapping(address => mapping(uint => uint)) public userTickets;

    // Add a new mapping to track pending transfers
    mapping(address => mapping(uint => mapping(address => uint))) public pendingTransfers; // from => eventId => to => quantity

    // Events
    event UserRegistered(address indexed user, string userName);
    event ProfileUpdated(address indexed user, string userName);
    event TicketsPurchased(
        address indexed user,
        uint indexed eventId,
        uint quantity
    );
    event TicketsTransferred(
        address indexed from,
        address indexed to,
        uint indexed eventId,
        uint quantity
    );
    event EventFavorited(address indexed user, uint indexed eventId);
    event EventUnfavorited(address indexed user, uint indexed eventId);
    event TransferInitiated(
        address indexed from,
        address indexed to,
        uint indexed eventId,
        uint quantity
    );

    /**
     * @dev Constructor to initialize the UserTicketHub with EventFactory
     * @param _eventFactoryAddress Address of the EventFactory contract
     */

    constructor(address _eventFactoryAddress) {
        owner = msg.sender;
        eventFactory = EventFactory(_eventFactoryAddress);
    }

    /**
     * @dev Register a new user profile
     * @param userName Display name for the user profile
     * @param email Optional email for notifications (can be empty)
     */

    function registerUser(
        string memory userName,
        string memory email
    ) external {
        require(
            !userProfiles[msg.sender].isRegistered,
            "User already registered"
        );

        userProfiles[msg.sender] = UserProfile({
            userName: userName,
            email: email,
            isRegistered: true,
            totalTicketsOwned: 0,
            attendingEvents: new uint[](0)
        });

        emit UserRegistered(msg.sender, userName);
    }

    /**
     * @dev Update user profile information
     * @param userName New display name
     * @param email New email address
     */
    function updateProfile(
        string memory userName,
        string memory email
    ) external {
        require(userProfiles[msg.sender].isRegistered, "User not registered");

        userProfiles[msg.sender].userName = userName;
        userProfiles[msg.sender].email = email;

        emit ProfileUpdated(msg.sender, userName);
    }

    /**
     * @dev Buy tickets for an event
     * @param eventId ID of the event to buy tickets for
     * @param quantity Number of tickets to buy
     */

    function buyTickets(uint eventId, uint quantity) external payable {
        // get the event contract address
        address eventAddress = eventFactory.getEventContract(eventId);
        require(eventAddress != address(0), "Event does not exist");

        // get the event details
        EventCore eventCore = EventCore(payable(eventAddress));
        (, , uint eventDate, uint ticketPrice, , uint ticketRemain) = eventCore
            .getEventDetails();

        // Validate event and payment
        require(block.timestamp < eventDate, "Event has already occurred");
        require(ticketRemain >= quantity, "Not enough tickets available");
        require(msg.value >= ticketPrice * quantity, "Insufficient Ether sent");

        // Get the ticket manager address and contract
        TicketManager ticketManager = eventCore.ticketManager();

        // Purchase the tickets through the TicketManager
        ticketManager.buyTicket{value: msg.value}(quantity);

        // Update user profile records
        userTickets[msg.sender][eventId] += quantity;
        userProfiles[msg.sender].totalTicketsOwned += quantity;

        // Add the event to the user's attending list if not already there
        bool eventFound = false;
        for (
            uint i = 0;
            i < userProfiles[msg.sender].attendingEvents.length;
            i++
        ) {
            if (userProfiles[msg.sender].attendingEvents[i] == eventId) {
                eventFound = true;
                break;
            }
        }

        if (!eventFound) {
            userProfiles[msg.sender].attendingEvents.push(eventId);
        }

        emit TicketsPurchased(msg.sender, eventId, quantity);
    }

    /**
     * @dev Transfer tickets to another user
     * @param eventId ID of the event
     * @param to Address to transfer tickets to
     * @param quantity Number of tickets to transfer
     */
    function transferTickets(uint eventId, address to, uint quantity) external payable {
        require(to != address(0), "Cannot transfer to zero address");
        require(to != msg.sender, "Cannot transfer to yourself");
        require(
            userTickets[msg.sender][eventId] >= quantity,
            "Insufficient tickets owned"
        );

        // Get the event and ticket manager contracts
        address eventAddress = eventFactory.getEventContract(eventId);
        require(eventAddress != address(0), "Event does not exist");

        EventCore eventCore = EventCore(payable(eventAddress));
        TicketManager ticketManager = eventCore.ticketManager();

        // Get event details to calculate transfer amount
        (, , uint eventDate, uint ticketPrice, , ) = eventCore.getEventDetails();
        require(block.timestamp < eventDate, "Event has already occurred");
        uint transferAmount = ticketPrice * quantity;

        // Validate payment from recipient
        require(msg.value >= transferAmount, "Insufficient payment from recipient");

        // Transfer the tickets using the TicketManager
        ticketManager.transferTicket{value: msg.value}(quantity, to);

        // Update user records
        userTickets[msg.sender][eventId] -= quantity;
        userTickets[to][eventId] += quantity;

        userProfiles[msg.sender].totalTicketsOwned -= quantity;

        // If recipient is registered, update their total count
        if (userProfiles[to].isRegistered) {
            userProfiles[to].totalTicketsOwned += quantity;
            
            // Add the event to the recipient's attending list if not already there
            bool eventFound = false;
            for (uint i = 0; i < userProfiles[to].attendingEvents.length; i++) {
                if (userProfiles[to].attendingEvents[i] == eventId) {
                    eventFound = true;
                    break;
                }
            }

            if (!eventFound) {
                userProfiles[to].attendingEvents.push(eventId);
            }
        }

        // Remove event from sender's attending list if they no longer have tickets
        if (userTickets[msg.sender][eventId] == 0) {
            _removeAttendingEvent(msg.sender, eventId);
        }

        emit TicketsTransferred(msg.sender, to, eventId, quantity);
    }

    /**
     * @dev Add an event to user's favorites
     * @param eventId ID of the event to favorite
     */
    function favoriteEvent(uint eventId) external {
        require(userProfiles[msg.sender].isRegistered, "User not registered");
        require(
            eventFactory.getEventContract(eventId) != address(0),
            "Event does not exist"
        );

        favoriteEvents[msg.sender][eventId] = true;
        emit EventFavorited(msg.sender, eventId);
    }

    /**
     * @dev Remove an event from user's favorites
     * @param eventId ID of the event to unfavorite
     */
    function unfavoriteEvent(uint eventId) external {
        require(userProfiles[msg.sender].isRegistered, "User not registered");

        favoriteEvents[msg.sender][eventId] = false;
        emit EventUnfavorited(msg.sender, eventId);
    }

    /**
     * @dev Check if a user has favorited an event
     * @param user Address of the user
     * @param eventId ID of the event
     * @return boolean indicating favorite status
     */
    function isEventFavorite(
        address user,
        uint eventId
    ) external view returns (bool) {
        return favoriteEvents[user][eventId];
    }

    /**
     * @dev Get user's ticket balance for a specific event
     * @param user Address of the user
     * @param eventId ID of the event
     * @return Number of tickets owned for the event
     */
    function getUserTicketCount(
        address user,
        uint eventId
    ) external view returns (uint) {
        return userTickets[user][eventId];
    }

    /**
     * @dev Get all events a user is attending
     * @param user Address of the user
     * @return Array of event IDs the user is attending
     */
    function getUserAttendingEvents(
        address user
    ) external view returns (uint[] memory) {
        return userProfiles[user].attendingEvents;
    }

    /**
     * @dev Get user profile information
     * @param user Address of the user
     * @return userName User's name
     * @return email User's email
     * @return isRegistered Whether user is registered
     * @return totalTicketsOwned Total tickets owned across all events
     */
    function getUserProfile(
        address user
    )
        external
        view
        returns (
            string memory userName,
            string memory email,
            bool isRegistered,
            uint totalTicketsOwned
        )
    {
        UserProfile memory profile = userProfiles[user];
        return (
            profile.userName,
            profile.email,
            profile.isRegistered,
            profile.totalTicketsOwned
        );
    }

    /**
     * @dev Remove an event from user's attending list (called when all tickets are transferred)
     * @param user Address of the user
     * @param eventId ID of the event to remove
     */
    function _removeAttendingEvent(address user, uint eventId) internal {
        uint[] storage attendingEvents = userProfiles[user].attendingEvents;
        for (uint i = 0; i < attendingEvents.length; i++) {
            if (attendingEvents[i] == eventId) {
                // Replace with the last element and pop
                attendingEvents[i] = attendingEvents[
                    attendingEvents.length - 1
                ];
                attendingEvents.pop();
                break;
            }
        }
    }

    /**
     * @dev Initiate a ticket transfer (without payment)
     * @param eventId ID of the event
     * @param to Address to transfer tickets to
     * @param quantity Number of tickets to transfer
     */
    function initiateTransfer(uint eventId, address to, uint quantity) external {
        require(to != address(0), "Cannot transfer to zero address");
        require(to != msg.sender, "Cannot transfer to yourself");
        require(
            userTickets[msg.sender][eventId] >= quantity,
            "Insufficient tickets owned"
        );

        // Get the event contract
        address eventAddress = eventFactory.getEventContract(eventId);
        require(eventAddress != address(0), "Event does not exist");

        EventCore eventCore = EventCore(payable(eventAddress));
        TicketManager ticketManager = eventCore.ticketManager();

        // Check if event has already occurred
        (, , uint eventDate, , , ) = eventCore.getEventDetails();
        require(block.timestamp < eventDate, "Event has already occurred");

        // Check if there's already a pending transfer in either direction
        require(
            pendingTransfers[msg.sender][eventId][to] == 0,
            "Transfer already initiated"
        );
        require(
            pendingTransfers[to][eventId][msg.sender] == 0,
            "Recipient has a pending transfer to sender"
        );

        // Store the pending transfer
        pendingTransfers[msg.sender][eventId][to] = quantity;

        emit TransferInitiated(msg.sender, to, eventId, quantity);
    }

    /**
     * @dev Accept and pay for a ticket transfer
     * @param from Address of the ticket owner
     * @param eventId ID of the event
     */
    function acceptTransfer(address from, uint eventId) external payable {
        uint quantity = pendingTransfers[from][eventId][msg.sender];
        require(quantity > 0, "No pending transfer found");

        // Get the event and ticket manager contracts
        address eventAddress = eventFactory.getEventContract(eventId);
        require(eventAddress != address(0), "Event does not exist");

        EventCore eventCore = EventCore(payable(eventAddress));
        TicketManager ticketManager = eventCore.ticketManager();

        // Get event details to calculate transfer amount
        (, , uint eventDate, uint ticketPrice, , ) = eventCore.getEventDetails();
        
        // Check if event has already occurred
        require(block.timestamp < eventDate, "Event has already occurred");

        // Check if sender still has enough tickets
        require(
            userTickets[from][eventId] >= quantity,
            "Sender no longer has enough tickets"
        );

        uint transferAmount = ticketPrice * quantity;

        // Validate payment from recipient
        require(msg.value >= transferAmount, "Insufficient payment from recipient");

        // Transfer the tickets using the TicketManager
        ticketManager.transferTicket{value: msg.value}(quantity, msg.sender);

        // Update user records
        userTickets[from][eventId] -= quantity;
        userTickets[msg.sender][eventId] += quantity;

        userProfiles[from].totalTicketsOwned -= quantity;

        // If recipient is registered, update their total count
        if (userProfiles[msg.sender].isRegistered) {
            userProfiles[msg.sender].totalTicketsOwned += quantity;
            
            // Add the event to the recipient's attending list if not already there
            bool eventFound = false;
            for (uint i = 0; i < userProfiles[msg.sender].attendingEvents.length; i++) {
                if (userProfiles[msg.sender].attendingEvents[i] == eventId) {
                    eventFound = true;
                    break;
                }
            }

            if (!eventFound) {
                userProfiles[msg.sender].attendingEvents.push(eventId);
            }
        }

        // Remove event from sender's attending list if they no longer have tickets
        if (userTickets[from][eventId] == 0) {
            _removeAttendingEvent(from, eventId);
        }

        // Clear the pending transfer
        delete pendingTransfers[from][eventId][msg.sender];

        emit TicketsTransferred(from, msg.sender, eventId, quantity);
    }
}
