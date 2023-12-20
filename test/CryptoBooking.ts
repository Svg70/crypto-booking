import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { Block } from "ethers";
import { ethers, upgrades } from "hardhat";

describe("Crypto Booking", function() {
  async function dep() {
    const [ deployer, user1, user2, buyer ] = await ethers.getSigners();

    const ERC20 = await ethers.getContractFactory("MyToken");
    const erc20 = await ERC20.deploy(deployer.address);

    const CryptoBookingFactory = await ethers.getContractFactory("CryptoBooking");
    const cryptoBookingFactory = await upgrades.deployProxy(CryptoBookingFactory, [deployer.address, deployer.address, deployer.address, erc20.target], {
      initializer: 'initialize',
      kind: 'uups',
    });
    // await cryptoBookingFactory.deployed();

    return { cryptoBookingFactory, deployer, user1, user2, buyer, erc20 }
  }

  describe("Granting Roles", function () {
    it('works', async function() {
      const { cryptoBookingFactory, deployer, user1, user2, buyer } = await loadFixture(dep);

      const contract = await ethers.getContractAt("CryptoBooking", cryptoBookingFactory.target);
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      const CREATOR_ROLE = await contract.CREATOR_ROLE();

      // const res = await contract.connect(deployer).grantRole(ADMIN_ROLE, user1);
      // const res2 = await contract.connect(deployer).grantRole(CREATOR_ROLE, user2);

      await expect(contract.connect(deployer).grantRole(ADMIN_ROLE, user1)).to.be.fulfilled;
      await expect(contract.connect(deployer).grantRole(CREATOR_ROLE, user2)).to.be.fulfilled;
      // const res2 = await contract.connect(user1).grantCreatorRole(user2)
      // await expect(contract.connect(user1).grantRole(CREATOR_ROLE, user2)).to.be.revertedWith('AccessControl: caller is not an default admin');
      // await expect(contract.connect(user1).grantCreatorRole(user2)).to.be.fulfilled;

      // console.log(res)
      // console.log(res2, 'RES_2')

      // expect().to.eq(true);
    });
  });

  describe("Create events", function () {
    it('create event', async function() {
      const { cryptoBookingFactory, deployer, user1, user2, buyer } = await loadFixture(dep);

      const contract = await ethers.getContractAt("CryptoBooking", cryptoBookingFactory.target);
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      const CREATOR_ROLE = await contract.CREATOR_ROLE();

      // const res = await contract.connect(deployer).grantRole(ADMIN_ROLE, user1);
      // const res2 = await contract.connect(deployer).grantRole(CREATOR_ROLE, user2);

      await expect(contract.connect(deployer).grantRole(ADMIN_ROLE, user1)).to.be.fulfilled;
      await expect(contract.connect(deployer).grantRole(CREATOR_ROLE, user2)).to.be.fulfilled;


      // const provider = new ethers.JsonRpcProvider('https://eth-goerli.g.alchemy.com/v2/_vlhnTww_vEOPzr6Nq5khFMNcGA6DLrZ');
      // const latestBlockNumber = await provider.getBlockNumber();
      // const block = await provider.getBlock(latestBlockNumber);

      // //@ts-ignore
      // console.log(block.timestamp, 'block.timestamp')

      const eventForBookingData = {
        expiredIn: 1703209156,
        declined: false,
        creator: user2.address,
        title: "Sample Event",
        maxTickets: 10,
        ticketsBooked: 2,
        price: 100000000,
      };
      // uint expiredIn,string memory title, uint ticketsBooked, uint maxTickets, uint price, bytes memory eventId)
      // Create an event for booking
      await contract.connect(user2).createEventForBooking(eventForBookingData.expiredIn, eventForBookingData.title, eventForBookingData.ticketsBooked, eventForBookingData.maxTickets, eventForBookingData.price, ethers.encodeBytes32String("EventID"));

      // Check that the event was created
      const event = await contract.eventsForBooking(ethers.encodeBytes32String("EventID"));
      expect(event.expiredIn).to.equal(eventForBookingData.expiredIn);
      expect(event.declined).to.equal(eventForBookingData.declined);
      expect(event.creator).to.equal(eventForBookingData.creator);
      expect(event.title).to.equal(eventForBookingData.title); 
    });
    it('should revert wrong timestamp', async function() {
      const { cryptoBookingFactory, deployer, user1, user2, buyer } = await loadFixture(dep);

      const contract = await ethers.getContractAt("CryptoBooking", cryptoBookingFactory.target);
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      const CREATOR_ROLE = await contract.CREATOR_ROLE();
      await expect(contract.connect(deployer).grantRole(ADMIN_ROLE, user1)).to.be.fulfilled;
      await expect(contract.connect(deployer).grantRole(CREATOR_ROLE, user2)).to.be.fulfilled;
      const eventForBookingData = {
        expiredIn: 1603209156,
        declined: false,
        creator: user2.address,
        title: "Sample Event",
        maxTickets: 10,
        ticketsBooked: 2,
        price: 100000000,
      };
      await expect(contract.connect(user2).createEventForBooking(eventForBookingData.expiredIn, eventForBookingData.title, eventForBookingData.ticketsBooked, eventForBookingData.maxTickets, eventForBookingData.price, ethers.encodeBytes32String("EventID"))).to.be.revertedWith("Timetamp less then current");
    });
  });

  describe("Purchases", function () {
    it('Client book event with allowance', async function() {
      const { cryptoBookingFactory, deployer, user1, user2, buyer, erc20 } = await loadFixture(dep);

      const contract = await ethers.getContractAt("CryptoBooking", cryptoBookingFactory.target);
      const erc20Contract = await ethers.getContractAt("MyToken", erc20.target);
      const ADMIN_ROLE = await contract.ADMIN_ROLE();
      const CREATOR_ROLE = await contract.CREATOR_ROLE();

      await expect(contract.connect(deployer).grantRole(ADMIN_ROLE, user1)).to.be.fulfilled;
      await expect(contract.connect(deployer).grantRole(CREATOR_ROLE, user2)).to.be.fulfilled;

      const eventForBookingData = {
        expiredIn: 1703209156,
        declined: false,
        creator: user2.address,
        title: "Sample Event",
        maxTickets: 10,
        ticketsBooked: 2,
        price: 100000000,
      };

      // Create an event for booking
      await contract.connect(user2).createEventForBooking(eventForBookingData.expiredIn, eventForBookingData.title, eventForBookingData.ticketsBooked, eventForBookingData.maxTickets, eventForBookingData.price, ethers.encodeBytes32String("EventID"));

      // Check that the event was created
      const event = await contract.eventsForBooking(ethers.encodeBytes32String("EventID"));

      const countTickets = 2;
      const eventId = ethers.encodeBytes32String("EventID"); // Replace with a valid bytes value
      const addr = buyer.address; // Replace with a valid bytes value
      const userId = ethers.encodeBytes32String("TestUser");
      const pricePerTicket = 100000000; // Replace with the actual price per ticket
  
      // Mint some USDT tokens for the buyer
      const usdtAmount = ethers.parseUnits('1000', 6); // Minting 1000 USDT (assuming 6 decimal places)
      await erc20Contract.connect(deployer).mint(buyer.address, usdtAmount);
      await erc20Contract.connect(buyer).approve(await contract.getAddress(), countTickets * pricePerTicket);


      const allow = await erc20Contract.allowance(addr, await contract.getAddress());

      console.log(allow, "allow")

      const balanceBuyerBefore = await erc20Contract.balanceOf(addr);
      await contract.payment(countTickets, eventId, userId, addr);
      const booking = await contract.getBookings(ethers.encodeBytes32String("EventID"), userId);


      const balanceBuyerAfter = await erc20Contract.balanceOf(addr);
      const balanceContractAfter = await erc20Contract.balanceOf(await contract.getAddress());

      console.log(balanceBuyerBefore, balanceBuyerAfter, balanceContractAfter, "BALANCES")
      

      expect(booking).to.equal(countTickets);

    });

    // it('Client book event with permit', async function() {
    //   const { cryptoBookingFactory, deployer, user1, user2, buyer, erc20 } = await loadFixture(dep);

    //   const contract = await ethers.getContractAt("CryptoBooking", cryptoBookingFactory.target);
    //   const erc20Contract = await ethers.getContractAt("MyToken", erc20.target);
    //   const ADMIN_ROLE = await contract.ADMIN_ROLE();
    //   const CREATOR_ROLE = await contract.CREATOR_ROLE();

    //   await expect(contract.connect(deployer).grantRole(ADMIN_ROLE, user1)).to.be.fulfilled;
    //   await expect(contract.connect(deployer).grantRole(CREATOR_ROLE, user2)).to.be.fulfilled;

    //   const eventForBookingData = {
    //     expiredIn: 1703209156,
    //     declined: false,
    //     creator: user2.address,
    //     title: "Sample Event",
    //     maxTickets: 10,
    //     ticketsBooked: 2,
    //     price: 100000000,
    //   };

    //   // Create an event for booking
    //   await contract.connect(user2).createEventForBooking(eventForBookingData.expiredIn, eventForBookingData.title, eventForBookingData.ticketsBooked, eventForBookingData.maxTickets, eventForBookingData.price, ethers.encodeBytes32String("EventID"));

    //   // Check that the event was created
    //   const event = await contract.eventsForBooking(ethers.encodeBytes32String("EventID"));

    //   const countTickets = 2;
    //   const eventId = ethers.encodeBytes32String("EventID"); // Replace with a valid bytes value
    //   const addr = buyer.address; // Replace with a valid bytes value
    //   const userId = ethers.encodeBytes32String("TestUser");
    //   const pricePerTicket = 100000000; // Replace with the actual price per ticket
  
    //   // Mint some USDT tokens for the buyer
    //   const usdtAmount = ethers.parseUnits('1000', 6); // Minting 1000 USDT (assuming 6 decimal places)
    //   await erc20Contract.connect(deployer).mint(buyer.address, usdtAmount);
    //   // await erc20Contract.connect(buyer).approve(await contract.getAddress(), countTickets * pricePerTicket);
    //   // Mock permit function
    //   const permitParams = {
    //     owner: buyer.address,
    //     spender: await contract.address,
    //     value: eventForBookingData.price * countTickets,
    //     deadline: 1703209156, // Replace with a valid deadline
    //     v: 27, // Replace with a valid v value
    //     r: ethers.formatBytes32String("rValue"), // Replace with a valid r value
    //     s: ethers.utils.formatBytes32String("sValue"), // Replace with a valid s value
    //   };

    //   await erc20Contract.connect(buyer).mockPermit(
    //     permitParams.owner,
    //     permitParams.spender,
    //     permitParams.value,
    //     permitParams.deadline,
    //     permitParams.v,
    //     permitParams.r,
    //     permitParams.s
    //   );

    //   // const allow = await erc20Contract.allowance(addr, await contract.getAddress());

    //   // console.log(allow, "allow")

    //   const signature = '123';

    //   const balanceBuyerBefore = await erc20Contract.balanceOf(addr);
    //   await contract.paymentWithPermit(countTickets, eventId, userId, addr);
    //   const booking = await contract.getBookings(ethers.encodeBytes32String("EventID"), userId);


    //   const balanceBuyerAfter = await erc20Contract.balanceOf(addr);
    //   const balanceContractAfter = await erc20Contract.balanceOf(await contract.getAddress());

    //   console.log(balanceBuyerBefore, balanceBuyerAfter, balanceContractAfter, "BALANCES")
      

    //   expect(booking).to.equal(countTickets);

    // });
  });
});