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
    event TicketsTransferred(
        address indexed from,
        address indexed to,
        uint quantity,
        uint amount
    );

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
    function buyTicket(uint quantity) external payable {
        // Get event details
        (, , uint eventDate, uint ticketPrice, , ) = eventCore
            .getEventDetails();

        // Validate event and payment
        require(block.timestamp < eventDate, "Event has already occurred");
        require(msg.value >= ticketPrice * quantity, "Insufficient Ether sent");

        // Update ticket count in event contract
        bool success = eventCore.decreaseTicketRemain(quantity);
        require(success, "Failed to update ticket count");

        // Update buyer's ticket count
        tickets[msg.sender] += quantity;

        // Transfer payment to the event contract
        (bool sent, ) = payable(address(eventCore)).call{value: msg.value}("");
        require(sent, "Failed to send Ether");

        // Emit event
        emit TicketsPurchased(msg.sender, quantity);
    }

    /**
     * @dev Allows the current owner to transfer tickets to another address
     * @param quantity Number of tickets to transfer
     * @param to Address to transfer tickets to
     */
    function transferTicket(uint quantity, address to) external payable {
        // Get event details
        (, , uint eventDate, uint ticketPrice, , ) = eventCore.getEventDetails();

        // Validate event date and transfer
        require(block.timestamp < eventDate, "Event has already occurred");
        require(msg.sender != address(0), "Invalid sender address");
        require(to != address(0), "Cannot transfer to zero address");
        require(msg.sender != to, "Sender and recipient cannot be the same");
        require(tickets[msg.sender] >= quantity, "Insufficient tickets owned");

        // Calculate the total amount for the transfer
        uint transferAmount = ticketPrice * quantity;

        // Validate payment from recipient
        require(msg.value >= transferAmount, "Insufficient payment from recipient");

        // Transfer the payment to the event contract
        (bool sent, ) = payable(address(eventCore)).call{value: transferAmount}("");
        require(sent, "Failed to transfer payment to event contract");

        // Update ticket counts
        tickets[msg.sender] -= quantity;
        tickets[to] += quantity;

        // Emit event with payment information
        emit TicketsTransferred(msg.sender, to, quantity, msg.value);
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
