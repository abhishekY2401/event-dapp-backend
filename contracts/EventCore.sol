// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.18;

import "./TicketManager.sol";

/**
 * @title EventCore
 * @dev Core contract containing event details and ownership
 */
contract EventCore {
    // Event details
    address payable public organizer;
    string public name;
    uint public date;
    uint public price;
    uint public ticketCount;
    uint public ticketRemain;

    // Ticket management contract
    TicketManager public ticketManager;

    // Events
    event TicketsManaged(address ticketManager);
    event PaymentReceived(address from, uint amount);
    event PaymentForwarded(address to, uint amount);

    /**
     * @dev Constructor for creating a new event
     * @param _organizer Address of the event organizer
     * @param _name Name of the event
     * @param _date Date of the event (unix timestamp)
     * @param _price Price of each ticket in wei
     * @param _ticketCount Total number of tickets available
     */
    constructor(
        address _organizer,
        string memory _name,
        uint _date,
        uint _price,
        uint _ticketCount
    ) {
        organizer = payable(_organizer);
        name = _name;
        date = _date;
        price = _price;
        ticketCount = _ticketCount;
        ticketRemain = _ticketCount;

        // Create a new ticket manager for this event
        ticketManager = new TicketManager(address(this));
        emit TicketsManaged(address(ticketManager));
    }

    /**
     * @dev Modifier to check if sender is the organizer
     */
    modifier onlyOrganizer() {
        require(
            msg.sender == organizer,
            "Only the organizer can call this function"
        );
        _;
    }

    /**
     * @dev Modifier to check if the event is still active
     */
    modifier eventActive() {
        require(block.timestamp < date, "Event has already occurred");
        _;
    }

    /**
     * @dev Updates the number of remaining tickets
     * @param quantity The number of tickets to decrease
     * @return success Whether the update was successful
     */
    function decreaseTicketRemain(
        uint quantity
    ) external returns (bool success) {
        require(
            msg.sender == address(ticketManager),
            "Only ticket manager can update ticket count"
        );
        require(ticketRemain >= quantity, "Not enough tickets available");

        ticketRemain -= quantity;
        return true;
    }

    /**
     * @dev Gets event details
     * @return _organizer Address of the event organizer
     * @return _name Name of the event
     * @return _date Date of the event
     * @return _price Price of each ticket
     * @return _ticketCount Total number of tickets
     * @return _ticketRemain Number of remaining tickets
     */
    function getEventDetails()
        external
        view
        returns (
            address _organizer,
            string memory _name,
            uint _date,
            uint _price,
            uint _ticketCount,
            uint _ticketRemain
        )
    {
        return (organizer, name, date, price, ticketCount, ticketRemain);
    }

    /**
     * @dev Function to receive Ether
     */
    receive() external payable {
        emit PaymentReceived(msg.sender, msg.value);
        // Forward payment to organizer
        (bool sent,) = organizer.call{value: msg.value}("");
        require(sent, "Failed to forward payment to organizer");
        emit PaymentForwarded(organizer, msg.value);
    }
}
