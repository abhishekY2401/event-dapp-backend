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
     * @dev Allows a recipient to pay and receive tickets from another address
     * @param quantity Number of tickets to transfer
     * @param from Address to transfer tickets from (the current owner)
     */
    function transferTicket(uint quantity, address from) external payable {
        // Get event details
        (, , uint eventDate, uint ticketPrice, , ) = eventCore.getEventDetails();

        // Validate event date and transfer
        require(block.timestamp < eventDate, "Event has already occurred");
        require(from != address(0), "Invalid sender address");
        require(msg.sender != from, "Sender and recipient cannot be the same");
        require(tickets[from] >= quantity, "Insufficient tickets owned");

        // Calculate the total amount for the transfer
        uint transferAmount = ticketPrice * quantity;

        // Payment must be exact
        require(msg.value >= transferAmount, "Insufficient payment for transfer");

        // Transfer the payment to the original ticket owner
        (bool sent, ) = payable(from).call{value: transferAmount}("");
        require(sent, "Failed to transfer payment to original owner");

        // Update ticket counts
        tickets[from] -= quantity;
        tickets[msg.sender] += quantity;

        // Emit event with payment information
        emit TicketsTransferred(from, msg.sender, quantity, msg.value);
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
