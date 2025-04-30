// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "./EventCore.sol";

/**
 * @title EventFactory
 * @dev Contract for creating new events
 */

contract EventFactory {
    uint public nextEventId;
    address public owner;

    //mapping to tract deployed event contracts
    mapping(uint => address) public eventContracts;

    //events
    event EventCreated(uint indexed eventId, address indexed eventContract, address indexed organizer, string name);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Created a new event contract
     * @param name name of the event
     * @param date Date of the event (unix timetamp)
     * @param price Price of the event
     * @param ticketCount Total number of tickets available
     * @return eventId ID of the newly created event
     */

    function createEvent(
        string calldata name,
        uint date, uint price,
        uint ticketCount
    ) external returns (uint eventId) {
        require(date > block.timestamp, "Event date must be in the future");
        require(ticketCount > 0, "Ticket count must be greater than 0");

        //Create new event contract
        EventCore newEvent = new EventCore(
            msg.sender,
            name,
            date,
            price,
            ticketCount
        );

        //Store the event contract address
        eventId = nextEventId;
        eventContracts[eventId] = address(newEvent);

        //increment the event ID counter
        nextEventId++;

        //emit event
        emit EventCreated(eventId, address(newEvent), msg.sender, name);

        return eventId;
    }

    /**
     * @dev Gets an event contract address by event ID
     * @param eventId ID of the event
     * @return eventContract Address of the event contract
     */

    function getEventContract(uint eventId) external view returns (address) {
        require(eventContracts[eventId] != address(0), "Event does not exist"); 
        return eventContracts[eventId];
    }
}
