import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Block } from "ethers";
import { ethers, upgrades } from "hardhat";

describe("Crypto Booking V2", function() {
  async function dep() {
    const [ deployer, user1, creator, buyer, wrongBuyer ] = await ethers.getSigners();
  
    const ERC20 = await ethers.getContractFactory("MyToken");
    const erc20 = await ERC20.deploy(deployer.address);
    const erc20Contract = await ethers.getContractAt("MyToken", erc20.target);

    const CryptoBookingFactory = await ethers.getContractFactory("CryptoBookingV2");
    const cryptoBookingFactory = await upgrades.deployProxy(CryptoBookingFactory, [deployer.address, deployer.address, deployer.address, erc20.target], {
      initializer: 'initialize',
      kind: 'uups',
    });
    // await cryptoBookingFactory.deployed();

    const contract = await ethers.getContractAt("CryptoBookingV2", cryptoBookingFactory.target);

    const ADMIN_ROLE = await contract.ADMIN_ROLE();
    const CREATOR_MOCKED_ID = ethers.encodeBytes32String("CreatorID");
    const EVENT_MOCKED_ID = ethers.encodeBytes32String("EventID");
    const USER_MOCKED_ID = ethers.encodeBytes32String("UserID");

    return {
      cryptoBookingFactory,
      deployer,
      user1,
      creator,
      buyer,
      wrongBuyer,
      erc20Contract,
      contract,
      ADMIN_ROLE,
      CREATOR_MOCKED_ID,
      EVENT_MOCKED_ID,
      USER_MOCKED_ID,
    };
  }

  describe("Granting Roles", function () {
    it('works', async function() {
      const {
        user1,
        creator,
        contract,
        ADMIN_ROLE,
        CREATOR_MOCKED_ID,
      } = await loadFixture(dep);

      await expect(contract.grantRole(ADMIN_ROLE, user1)).to.be.fulfilled;
      await expect(contract.addCreator(CREATOR_MOCKED_ID, creator)).to.be.fulfilled;

      expect(await contract.creators(CREATOR_MOCKED_ID)).to.be.equal(creator.address);
      await expect(contract.removeCreator(CREATOR_MOCKED_ID)).to.be.fulfilled;

      expect(await contract.creators(CREATOR_MOCKED_ID)).to.equal(0n);
    });
  });

  describe("Create events", function () {
    it('create event', async function() {
      const {
        user1,
        creator,
        contract,
        ADMIN_ROLE,
        CREATOR_MOCKED_ID,
        EVENT_MOCKED_ID,
      } = await loadFixture(dep);

      await expect(contract.grantRole(ADMIN_ROLE, user1)).to.be.fulfilled;
      await expect(contract.addCreator(CREATOR_MOCKED_ID, creator)).to.be.fulfilled;

      const eventForBookingData = {
        expiredIn: 1703209156,
        declined: false,
        creator: CREATOR_MOCKED_ID,
        title: "Sample Event",
        maxTickets: 10,
        ticketsBooked: 2,
        price: 100000000,
      };

      // Create an event for booking
      await contract.connect(creator).createEventForBooking(
        EVENT_MOCKED_ID,
        eventForBookingData.expiredIn,
        CREATOR_MOCKED_ID,
        eventForBookingData.title,
        eventForBookingData.ticketsBooked,
        eventForBookingData.maxTickets,
        eventForBookingData.price,
      );

      // Check that the event was created
      const event = await contract.eventsForBooking(EVENT_MOCKED_ID);
      expect(event.expiredIn).to.equal(eventForBookingData.expiredIn);
      expect(event.declined).to.equal(eventForBookingData.declined);
      expect(event.creator).to.equal(eventForBookingData.creator);
      expect(event.title).to.equal(eventForBookingData.title); 
    });
    it('should revert wrong timestamp', async function() {
      const {
        user1,
        creator,
        contract,
        ADMIN_ROLE,
        CREATOR_MOCKED_ID,
        EVENT_MOCKED_ID,
      } = await loadFixture(dep);

      await expect(contract.grantRole(ADMIN_ROLE, user1)).to.be.fulfilled;
      await expect(contract.addCreator(CREATOR_MOCKED_ID, creator)).to.be.fulfilled;

      const eventForBookingData = {
        expiredIn: 1603209156,
        declined: false,
        creator: CREATOR_MOCKED_ID,
        title: "Sample Event",
        maxTickets: 10,
        ticketsBooked: 2,
        price: 100000000,
      };
      await expect(contract.connect(creator).createEventForBooking(
        EVENT_MOCKED_ID,
        eventForBookingData.expiredIn,
        CREATOR_MOCKED_ID,
        eventForBookingData.title,
        eventForBookingData.ticketsBooked,
        eventForBookingData.maxTickets,
        eventForBookingData.price
      )).to.be.revertedWith("Timetamp less then current");
    });

    it('events update', async function() {
      const {
        user1,
        creator,
        contract,
        ADMIN_ROLE,
        CREATOR_MOCKED_ID,
        EVENT_MOCKED_ID,
      } = await loadFixture(dep);

      await expect(contract.grantRole(ADMIN_ROLE, user1)).to.be.fulfilled;
      await expect(contract.addCreator(CREATOR_MOCKED_ID, creator)).to.be.fulfilled;

      const eventForBookingData = {
        expiredIn: 1703209156,
        declined: false,
        creator: CREATOR_MOCKED_ID,
        title: "Sample Event",
        maxTickets: 10,
        ticketsBooked: 2,
        price: 100000000,
      };

      // Create an event for booking
      await contract.connect(creator).createEventForBooking(
        EVENT_MOCKED_ID,
        eventForBookingData.expiredIn,
        CREATOR_MOCKED_ID,
        eventForBookingData.title,
        eventForBookingData.ticketsBooked,
        eventForBookingData.maxTickets,
        eventForBookingData.price,
      );

      await contract.connect(creator).updateEventForBooking(
        EVENT_MOCKED_ID,
        0,
        "New super title",
        5,
        0,
        200000000,
      );

      // Check that the event was updated
      const event = await contract.eventsForBooking(EVENT_MOCKED_ID);
      expect(event.expiredIn).to.equal(eventForBookingData.expiredIn);

      expect(event.title).to.equal("New super title"); 
      expect(event.ticketsBooked).to.equal(5n); 
    });

    it('events update - should declined for wrong creator', async function() {
      const {
        user1,
        creator,
        buyer,
        contract,
        ADMIN_ROLE,
        CREATOR_MOCKED_ID,
        EVENT_MOCKED_ID,
      } = await loadFixture(dep);

      await expect(contract.grantRole(ADMIN_ROLE, user1)).to.be.fulfilled;
      await expect(contract.addCreator(CREATOR_MOCKED_ID, creator)).to.be.fulfilled;

      const ANOTHER_CREATOR_MOCKED_ID = ethers.encodeBytes32String("ANOTHER_CREATOR_MOCKED_ID");
      await expect(contract.addCreator(ANOTHER_CREATOR_MOCKED_ID, buyer)).to.be.fulfilled;

      const eventForBookingData = {
        expiredIn: 1703209156,
        declined: false,
        creator: CREATOR_MOCKED_ID,
        title: "Sample Event",
        maxTickets: 10,
        ticketsBooked: 2,
        price: 100000000,
      };

      // Create an event for booking
      await contract.connect(creator).createEventForBooking(
        EVENT_MOCKED_ID,
        eventForBookingData.expiredIn,
        CREATOR_MOCKED_ID,
        eventForBookingData.title,
        eventForBookingData.ticketsBooked,
        eventForBookingData.maxTickets,
        eventForBookingData.price,
      );

      await expect(contract.connect(buyer).updateEventForBooking(
        EVENT_MOCKED_ID,
        0,
        "New super title",
        5,
        0,
        200000000,
      )).to.be.rejectedWith('You are not creator of this event');
    });
  });

  describe("Purchases", function () {
    it('Client book event with allowance', async function() {
      const {
        deployer,
        user1,
        creator,
        buyer,
        erc20Contract,
        contract,
        ADMIN_ROLE,
        CREATOR_MOCKED_ID,
        EVENT_MOCKED_ID,
        USER_MOCKED_ID,
      } = await loadFixture(dep);

      await expect(contract.grantRole(ADMIN_ROLE, user1)).to.be.fulfilled;
      await expect(contract.addCreator(CREATOR_MOCKED_ID, creator)).to.be.fulfilled;

      const eventForBookingData = {
        expiredIn: 1703209156,
        declined: false,
        creator: CREATOR_MOCKED_ID,
        title: "Sample Event",
        maxTickets: 10,
        ticketsBooked: 2,
        price: 100000000,
      };

      // Create an event for booking
      await contract.connect(creator).createEventForBooking(
        EVENT_MOCKED_ID,
        eventForBookingData.expiredIn,
        CREATOR_MOCKED_ID,
        eventForBookingData.title,
        eventForBookingData.ticketsBooked,
        eventForBookingData.maxTickets,
        eventForBookingData.price,
      );
      // Check that the event was created
      const event = await contract.eventsForBooking(EVENT_MOCKED_ID);

      const countTickets = 2;
      const addr = buyer.address; // Replace with a valid bytes value
      const pricePerTicket = 100000000; // Replace with the actual price per ticket
  
      // Mint some USDT tokens for the buyer
      const usdtAmount = ethers.parseUnits('1000', 6); // Minting 1000 USDT (assuming 6 decimal places)
      await erc20Contract.connect(deployer).mint(buyer.address, usdtAmount);
      await erc20Contract.connect(buyer).approve(await contract.getAddress(), countTickets * pricePerTicket);

      const allow = await erc20Contract.allowance(addr, await contract.getAddress());

      const balanceBuyerBefore = await erc20Contract.balanceOf(addr);
      await contract.connect(buyer).payment(countTickets, EVENT_MOCKED_ID, USER_MOCKED_ID, addr);
      const booking = await contract.getBookings(EVENT_MOCKED_ID, USER_MOCKED_ID);


      const balanceBuyerAfter = await erc20Contract.balanceOf(addr);
      const balanceContractAfter = await erc20Contract.balanceOf(await contract.getAddress());

      console.log(balanceBuyerBefore, balanceBuyerAfter, balanceContractAfter, "BALANCES")
      

      expect(booking).to.equal(countTickets);

    });

    it('Client book event should revert with wrong address', async function() {
      const {
        deployer,
        user1,
        creator,
        buyer,
        wrongBuyer,
        erc20Contract,
        contract,
        ADMIN_ROLE,
        CREATOR_MOCKED_ID,
        EVENT_MOCKED_ID,
        USER_MOCKED_ID,
      } = await loadFixture(dep);

      await expect(contract.grantRole(ADMIN_ROLE, user1)).to.be.fulfilled;
      await expect(contract.addCreator(CREATOR_MOCKED_ID, creator)).to.be.fulfilled;

      const eventForBookingData = {
        expiredIn: 1703209156,
        declined: false,
        creator: CREATOR_MOCKED_ID,
        title: "Sample Event",
        maxTickets: 10,
        ticketsBooked: 2,
        price: 100000000,
      };

      // Create an event for booking
      await contract.connect(creator).createEventForBooking(
        EVENT_MOCKED_ID,
        eventForBookingData.expiredIn,
        CREATOR_MOCKED_ID,
        eventForBookingData.title,
        eventForBookingData.ticketsBooked,
        eventForBookingData.maxTickets,
        eventForBookingData.price,
      );
      // Check that the event was created
      const event = await contract.eventsForBooking(EVENT_MOCKED_ID);

      const countTickets = 2;

      const pricePerTicket = 100000000; // Replace with the actual price per ticket
  
      // Mint some USDT tokens for the buyer
      const usdtAmount = ethers.parseUnits('1000', 6); // Minting 1000 USDT (assuming 6 decimal places)
      await erc20Contract.connect(deployer).mint(wrongBuyer.address, usdtAmount);
      await erc20Contract.connect(deployer).mint(buyer.address, usdtAmount);
      
      await contract.connect(user1).createUser(USER_MOCKED_ID, buyer.address);

      await erc20Contract.connect(wrongBuyer).approve(await contract.getAddress(), countTickets * pricePerTicket);

      const allow = await erc20Contract.allowance(wrongBuyer.address, await contract.getAddress());

      await expect(contract.connect(wrongBuyer).payment(countTickets, EVENT_MOCKED_ID, USER_MOCKED_ID, wrongBuyer.address)).to.be.rejectedWith('Wrong user address');
    });
  });
  //   // it('Client book event with permit', async function() {
  //   //   const { cryptoBookingFactory, deployer, user1, user2, buyer, erc20 } = await loadFixture(dep);

  //   //   const contract = await ethers.getContractAt("CryptoBooking", cryptoBookingFactory.target);
  //   //   const erc20Contract = await ethers.getContractAt("MyToken", erc20.target);
  //   //   const ADMIN_ROLE = await contract.ADMIN_ROLE();
  //   //   const CREATOR_ROLE = await contract.CREATOR_ROLE();

  //   //   await expect(contract.connect(deployer).grantRole(ADMIN_ROLE, user1)).to.be.fulfilled;
  //   //   await expect(contract.connect(deployer).grantRole(CREATOR_ROLE, user2)).to.be.fulfilled;

  //   //   const eventForBookingData = {
  //   //     expiredIn: 1703209156,
  //   //     declined: false,
  //   //     creator: user2.address,
  //   //     title: "Sample Event",
  //   //     maxTickets: 10,
  //   //     ticketsBooked: 2,
  //   //     price: 100000000,
  //   //   };

  //   //   // Create an event for booking
  //   //   await contract.connect(user2).createEventForBooking(eventForBookingData.expiredIn, eventForBookingData.title, eventForBookingData.ticketsBooked, eventForBookingData.maxTickets, eventForBookingData.price, ethers.encodeBytes32String("EventID"));

  //   //   // Check that the event was created
  //   //   const event = await contract.eventsForBooking(ethers.encodeBytes32String("EventID"));

  //   //   const countTickets = 2;
  //   //   const eventId = ethers.encodeBytes32String("EventID"); // Replace with a valid bytes value
  //   //   const addr = buyer.address; // Replace with a valid bytes value
  //   //   const userId = ethers.encodeBytes32String("TestUser");
  //   //   const pricePerTicket = 100000000; // Replace with the actual price per ticket
  
  //   //   // Mint some USDT tokens for the buyer
  //   //   const usdtAmount = ethers.parseUnits('1000', 6); // Minting 1000 USDT (assuming 6 decimal places)
  //   //   await erc20Contract.connect(deployer).mint(buyer.address, usdtAmount);
  //   //   // await erc20Contract.connect(buyer).approve(await contract.getAddress(), countTickets * pricePerTicket);
  //   //   // Mock permit function
  //   //   const permitParams = {
  //   //     owner: buyer.address,
  //   //     spender: await contract.address,
  //   //     value: eventForBookingData.price * countTickets,
  //   //     deadline: 1703209156, // Replace with a valid deadline
  //   //     v: 27, // Replace with a valid v value
  //   //     r: ethers.formatBytes32String("rValue"), // Replace with a valid r value
  //   //     s: ethers.utils.formatBytes32String("sValue"), // Replace with a valid s value
  //   //   };

  //   //   await erc20Contract.connect(buyer).mockPermit(
  //   //     permitParams.owner,
  //   //     permitParams.spender,
  //   //     permitParams.value,
  //   //     permitParams.deadline,
  //   //     permitParams.v,
  //   //     permitParams.r,
  //   //     permitParams.s
  //   //   );

  //   //   // const allow = await erc20Contract.allowance(addr, await contract.getAddress());

  //   //   // console.log(allow, "allow")

  //   //   const signature = '123';

  //   //   const balanceBuyerBefore = await erc20Contract.balanceOf(addr);
  //   //   await contract.paymentWithPermit(countTickets, eventId, userId, addr);
  //   //   const booking = await contract.getBookings(ethers.encodeBytes32String("EventID"), userId);


  //   //   const balanceBuyerAfter = await erc20Contract.balanceOf(addr);
  //   //   const balanceContractAfter = await erc20Contract.balanceOf(await contract.getAddress());

  //   //   console.log(balanceBuyerBefore, balanceBuyerAfter, balanceContractAfter, "BALANCES")
      

  //   //   expect(booking).to.equal(countTickets);

  //   // });
  // });
});