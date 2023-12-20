// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract CryptoBooking is Initializable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    struct EventForBooking {
        uint256 expiredIn;
        bool declined;
        //nee update creator 
        address creator;
        // bytes32 creator;
        string title;
        uint maxTickets;
        uint ticketsBooked;
        uint price;
        mapping(bytes32 => uint) bookings;
    }

    struct User {
        // mapping(bytes => uint) bookings;
        //-?
        address addr;
        // bool banned;
    }

//should remove CREATOR_ROLE
    struct Creator {
        // bytes32[] events;
        // bool banned;
        address addr;
    }

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    //
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");

    mapping(bytes32 => User) public users;
    mapping(bytes32 => EventForBooking) public eventsForBooking;

    address public usdtAddress;
    IERC20 public usdtToken;

    event UserCreated(bytes32 userId, address addr);
    event EventForBookingCreated(bytes32 eventId);
    event BookingCreated(bytes32 eventId, bytes32 userId, uint count);

    modifier onlyDefaultAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "AccessControl: caller is not an default admin");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, _msgSender()), "AccessControl: caller is not an admin_____111");
        _;
    }
    
    modifier onlyCreator() {
        require(hasRole(CREATOR_ROLE, _msgSender()), "AccessControl: caller is not an creator");
        _;
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

    function createEventForBooking(uint expiredIn, string memory title, uint ticketsBooked, uint maxTickets, uint price, bytes32 eventId) external onlyCreator {
        
     //require(creators[creatorId] == address(msg.sender), "Incorrect creator Id");
        //check for timestamp
        require(block.timestamp < expiredIn, string(abi.encodePacked("Timetamp less then current")));

        // Create an event for booking
        EventForBooking storage newEvent = eventsForBooking[eventId];
        newEvent.expiredIn = expiredIn;

        newEvent.declined = false;
        newEvent.creator = msg.sender;
        newEvent.title = title;
        newEvent.ticketsBooked = ticketsBooked;
        newEvent.maxTickets = maxTickets;
        newEvent.price = price;

        emit EventForBookingCreated(eventId);
    }

    // function updateEventForBooking(EventForBooking memory item, bytes memory eventId) external onlyCreator {
    //     eventsForBooking[eventId];
    //     newEvent.expiredIn = item.expiredIn;

    //     newEvent.declined = item.declined;
    //     newEvent.creator = msg.sender;
    //     newEvent.title = item.title;
    //     newEvent.ticketsBooked = item.ticketsBooked;
    //     newEvent.maxTickets = item.maxTickets;

    //     emit EventForBookingCreated(eventId, newEvent);
    // }

    //Ned to update for approved usdt transfer
    //require(usdtToken.transferFrom(msg.sender, address(this), totalCostInUSDT), "USDT transfer failed");
    function payment(uint countTickets, bytes32 eventId, bytes32 userId, address addr) external {
        // Check if the user exists, and create the user if not
        if (users[userId].addr == address(0))
        {
            _createUser(userId, addr);
        }

        // require(users[userId].bookings[eventId] <= countTickets, string(abi.encodePacked("User has already booked ", countTickets, " tickets for this event")));

       require(eventsForBooking[eventId].bookings[userId] <= countTickets, string(abi.encodePacked("User has already booked ", countTickets, " tickets for this event")));


        require(eventsForBooking[eventId].expiredIn > block.timestamp, "Event already expired");

        require(eventsForBooking[eventId].maxTickets > eventsForBooking[eventId].ticketsBooked + countTickets, string(abi.encodePacked("This count of tickets is not available")));

            // Check if the user has approved the contract to spend the required amount of tokens
        require(usdtToken.allowance(addr, address(this)) >= eventsForBooking[eventId].price * countTickets, "Insufficient allowance");

        // require(eventsForBooking[eventId].price * countTickets == msg.value, "Incorrect amount ");

        require(usdtToken.transferFrom(addr, address(this), eventsForBooking[eventId].price * countTickets), "USDT transfer failed");

        // If all checks pass, create the booking
        // users[userId].bookings[eventId] = countTickets;
        // eventsForBooking[eventId].ticketsBooked += countTickets;
        eventsForBooking[eventId].ticketsBooked += countTickets;
        eventsForBooking[eventId].bookings[userId] = countTickets;

        emit BookingCreated(eventId, userId, countTickets);
    }



    function paymentWithPermit(
        uint countTickets,
        bytes32 eventId,
        bytes32 userId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // Check if the user exists, and create the user if not
        if (users[userId].addr == address(0)) {
            _createUser(userId, msg.sender);
        }

        require(eventsForBooking[eventId].bookings[userId] <= countTickets, "User has already booked tickets for this event");
        require(eventsForBooking[eventId].expiredIn > block.timestamp, "Event already expired");
        require(eventsForBooking[eventId].maxTickets > eventsForBooking[eventId].ticketsBooked + countTickets, "This count of tickets is not available");

        // Check if the user has approved the contract to spend the required amount of tokens using permit
        IERC20Permit(address(usdtToken)).permit(msg.sender, address(this), eventsForBooking[eventId].price * countTickets, deadline, v, r, s);


        // Transfer tokens using permit
        require(usdtToken.transferFrom(msg.sender, address(this), eventsForBooking[eventId].price * countTickets), "USDT transfer failed");

        // If all checks pass, create the booking
        eventsForBooking[eventId].ticketsBooked += countTickets;
        eventsForBooking[eventId].bookings[userId] = countTickets;

        emit BookingCreated(eventId, userId, countTickets);
    }


    function getBookings(bytes32 eventId, bytes32 userId) external view returns (uint) {
        return eventsForBooking[eventId].bookings[userId];
    }

    function withdrawAll() external onlyDefaultAdmin {
        // uint256 contractBalance = address(this).balance;
        // require(contractBalance > 0, "No funds available for withdrawal");
        // payable(tx.origin).transfer(contractBalance);
        uint256 contractBalance = usdtToken.balanceOf(address(this));
        require(contractBalance > 0, "No funds available for withdrawal");

        // Transfer USDT to the default admin
        usdtToken.transfer(tx.origin, contractBalance);
    }
    // function grantRole(bytes32 role, address account) public override onlyDefaultAdmin {
    //     super.grantRole(role, account);
    // }

    // function grantCreatorRole(address account) external onlyAdmin {
    //     super.grantRole(CREATOR_ROLE, account);
    // }

    // function revokeRole(bytes32 role, address account) public override onlyDefaultAdmin {
    //     super.revokeRole(role, account);
    // }
    // function revokeCreatorRole(address account) external onlyAdmin {
    //     super.revokeRole(CREATOR_ROLE, account);
    // }

    //This all exist grantRole/revokeRole - AccessControlUpgradeable
    //-override
    //create Admin
    //create Creator
    //remove Admin
    //remove Creator
}
