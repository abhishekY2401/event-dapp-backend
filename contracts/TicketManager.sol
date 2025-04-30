// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.18;

import "./EventCore.sol";

/**
 * @title TicketManager
 * @dev Contract for managing tickets, including buying and transferring
 */
contract TicketManager {
    // Reference to the associated event contract
    EventCore public eventCore;
    
    // Mapping to track ticket ownership
    mapping(address => uint) public tickets;
    
    // Events
    event TicketsPurchased(address indexed buyer, uint quantity);
    event TicketsTransferred(address indexed from, address indexed to, uint quantity);
    
    /**
     * @dev Modifier to check if the event is still active
     */
    modifier eventActive() {
        (,, uint eventDate,,, ) = eventCore.getEventDetails();
        require(block.timestamp < eventDate, "Event has already occurred");
        _;
    }
    
    /**
     * @dev Constructor to initialize the ticket manager with an event
     * @param _eventCore Address of the associated event contract
     */
    constructor(address _eventCore) {
        eventCore = EventCore(payable(_eventCore));
    }
    
    /**
     * @dev Allows a user to buy tickets
     * @param quantity Number of tickets to buy
     */
    function buyTicket(uint quantity) external payable eventActive {
        // Get event details
        (,, uint eventDate, uint ticketPrice,, ) = eventCore.getEventDetails();
        
        // Validate event and payment
        require(eventDate != 0, "Event does not exist");
        require(msg.value >= ticketPrice * quantity, "Insufficient Ether sent");
        
        // Update ticket count in event contract
        bool success = eventCore.decreaseTicketRemain(quantity);
        require(success, "Failed to update ticket count");
        
        // Update buyer's ticket count
        tickets[msg.sender] += quantity;
        
        // Transfer payment to the event contract
        (bool sent,) = payable(address(eventCore)).call{value: msg.value}("");
        require(sent, "Failed to send Ether");
        
        // Emit event
        emit TicketsPurchased(msg.sender, quantity);
    }
    
    /**
     * @dev Allows a ticket owner to transfer tickets to another address
     * @param quantity Number of tickets to transfer
     * @param to Address to transfer tickets to
     */
    function transferTicket(uint quantity, address to) external eventActive {
        require(to != address(0), "Cannot transfer to zero address");
        require(tickets[msg.sender] >= quantity, "Insufficient tickets owned");
        
        // Update ticket counts
        tickets[msg.sender] -= quantity;
        tickets[to] += quantity;
        
        // Emit event
        emit TicketsTransferred(msg.sender, to, quantity);
    }
    
    /**
     * @dev Gets the number of tickets owned by an address
     * @param owner The address to check
     * @return The number of tickets owned
     */
    function getTicketBalance(address owner) external view returns (uint) {
        return tickets[owner];
    }
}