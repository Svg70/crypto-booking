// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract CryptoBookingV2 is Initializable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    struct EventForBooking {
        uint256 expiredIn;
        bool declined;
        bytes32 creator;
        string title;
        uint maxTickets;
        uint ticketsBooked;
        uint price;
        mapping(bytes32 => uint) bookings;

        //
        string metainfo;
    }

    struct User {
        address addr;
        // bool banned;
    }

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    mapping(bytes32 => User) public users;
    mapping(bytes32 => EventForBooking) public eventsForBooking;
    mapping(bytes32 => address) public creators;

    address public usdtAddress;
    IERC20 public usdtToken;

    event UserCreated(bytes32 userId, address addr);
    event EventForBookingCreated(bytes32 eventId);
    event EventForBookingUpdated(bytes32 eventId);
    event BookingCreated(bytes32 eventId, bytes32 userId, uint count);

    modifier onlyDefaultAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "AccessControl: caller is not an default admin");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, _msgSender()), "AccessControl: caller is not an admin_____111");
        _;
    }

    modifier onlyCreator(bytes32 key) {
        require(creators[key] == msg.sender, "You are not creator");
        _;
    }

    function addCreator(bytes32 key, address creator) external onlyDefaultAdmin {
        creators[key] = creator;
    }

    function removeCreator(bytes32 key) external onlyDefaultAdmin {
        delete creators[key];
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address defaultAdmin, address pauser, address upgrader, address _usdtAddress)
        initializer public
    {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, pauser);
        _grantRole(UPGRADER_ROLE, upgrader);

        usdtAddress = _usdtAddress;
        usdtToken = IERC20(_usdtAddress);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}

    function createUser(bytes32 userId, address addr) external onlyAdmin {
        _createUser(userId, addr);
    }
    
    function _createUser(bytes32 userId, address addr) internal {
        // Check if the user already exists
        require(users[userId].addr == address(0), "User already exists");

        // Create a new user
        User storage newUser = users[userId];
        newUser.addr =  addr;

        emit UserCreated(userId, addr);
    }

    function createEventForBooking(
        bytes32 eventId,
        uint expiredIn,
        bytes32 creatorId,
        string memory title,
        uint ticketsBooked,
        uint maxTickets,
        uint price
    ) external onlyCreator(creatorId) {
        require(block.timestamp < expiredIn, "Timetamp less then current");
        require(price > 0, "Price should be bigger then zero");

        // Create an event for booking
        EventForBooking storage newEvent = eventsForBooking[eventId];
        newEvent.expiredIn = expiredIn;

        newEvent.declined = false;
        newEvent.creator = creatorId;
        newEvent.title = title;
        newEvent.ticketsBooked = ticketsBooked;
        newEvent.maxTickets = maxTickets;
        newEvent.price = price;

        emit EventForBookingCreated(eventId);
    }

//should creat new event! - in case of new price?
//
    function updateEventForBooking(
        bytes32 eventId,
        uint expiredIn,
        string memory title,
        uint ticketsBooked,
        uint maxTickets,
        uint price
    ) external {
        require(eventsForBooking[eventId].expiredIn != 0, "Event not exist");

        require(creators[eventsForBooking[eventId].creator] ==  msg.sender, "You are not creator of this event");

        require(expiredIn == 0 || block.timestamp < expiredIn, "Timestamp is less than current");

        // Update only non-zero fields
        EventForBooking storage existingEvent = eventsForBooking[eventId];
        if (expiredIn != 0) {
            existingEvent.expiredIn = expiredIn;
        }
        if (bytes(title).length != 0) {
            existingEvent.title = title;
        }
        if (ticketsBooked != 0) {
            existingEvent.ticketsBooked = ticketsBooked;
        }
        if (maxTickets != 0) {
            existingEvent.maxTickets = maxTickets;
        }
        if (price != 0) {
            existingEvent.price = price;
        }

        emit EventForBookingUpdated(eventId);
    }

    function declinedEvent(bytes32 eventId) external {
        require(creators[eventsForBooking[eventId].creator] ==  msg.sender, "You are not creator of this event");
        EventForBooking storage existingEvent = eventsForBooking[eventId];

        existingEvent.declined = true;
    }

    function switchEvent(bytes32 eventId) external {
        require(creators[eventsForBooking[eventId].creator] ==  msg.sender, "You are not creator of this event");
        EventForBooking storage existingEvent = eventsForBooking[eventId];

        existingEvent.declined = false;
    }

    function payment(uint countTickets, bytes32 eventId, bytes32 userId, address addr) external {
        // Check if the user exists, and create the user if not
        if (users[userId].addr == address(0))
        {
            _createUser(userId, addr);
        } else {

            require(users[userId].addr == msg.sender, 'Wrong user address');
        }
        
        require(!eventsForBooking[eventId].declined, "Event declined");

        require(eventsForBooking[eventId].bookings[userId] <= countTickets, string(abi.encodePacked("User has already booked ", countTickets, " tickets for this event")));

        require(eventsForBooking[eventId].expiredIn > block.timestamp, "Event already expired");

        require(eventsForBooking[eventId].maxTickets > eventsForBooking[eventId].ticketsBooked + countTickets, string(abi.encodePacked("This count of tickets is not available")));

        // Check if the user has approved the contract to spend the required amount of tokens
        require(usdtToken.allowance(addr, address(this)) >= eventsForBooking[eventId].price * countTickets, "Insufficient allowance");
        require(usdtToken.transferFrom(addr, address(this), eventsForBooking[eventId].price * countTickets), "USDT transfer failed");

        // If all checks pass, create the booking
        // users[userId].bookings[eventId] = countTickets;
        // eventsForBooking[eventId].ticketsBooked += countTickets;
        eventsForBooking[eventId].ticketsBooked += countTickets;
        eventsForBooking[eventId].bookings[userId] += countTickets;

        emit BookingCreated(eventId, userId, countTickets);
    }

    function getBookings(bytes32 eventId, bytes32 userId) external view returns (uint) {
        return eventsForBooking[eventId].bookings[userId];
    }

    function withdrawAllUSD() external onlyDefaultAdmin {
        uint256 contractBalance = usdtToken.balanceOf(address(this));
        require(contractBalance > 0, "No funds available for withdrawal");

        // Transfer USDT to the default admin
        usdtToken.transfer(tx.origin, contractBalance);
    }

    function withdrawAll() external onlyDefaultAdmin {
        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "No funds available for withdrawal");
        payable(tx.origin).transfer(contractBalance);
    }
}
