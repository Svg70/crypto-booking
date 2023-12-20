import { ethers, upgrades } from "hardhat";

async function main() {
  // const ERC20 = await ethers.getContractFactory("MyToken");
  // const erc20 = await ERC20.deploy('0x8aa6025aAA6436b378E68D7bCFbc9f519a63e066');

  // console.log('contract deployed', erc20);


  const erc20 = '0x872c1A3078125446C2FF979C28A15249A689AcAc';
  // const deployer = {address: '0x8aa6025aAA6436b378E68D7bCFbc9f519a63e066'};

  // const CryptoBookingFactory = await ethers.getContractFactory("CryptoBookingV2");
  // const cryptoBookingFactory = await upgrades.deployProxy(CryptoBookingFactory, [deployer.address, deployer.address, deployer.address, erc20], {
  //   initializer: 'initialize',
  //   kind: 'uups',
  // });
    // const proxyAddr = '0x34b2A8b7712f118DB148A0931D59d940f8AdFD95';
    const proxyAddr = '0x7C8dc7722bD67b7586c33E76D429c85D3D1EfB72'


  const contract1 = await ethers.getContractAt("CryptoBooking", proxyAddr);
  const Factoryv2 = await ethers.getContractFactory("CryptoBookingV2");

  const contract2 = await upgrades.upgradeProxy(contract1, Factoryv2);

  console.log('contract deployed', contract2);


  // const contract = await ethers.getContractAt("CryptoBooking", proxyAddr);
  // console.log(ethers.encodeBytes32String("EventID"), ethers.encodeBytes32String("UserId"), 'ethers.encodeBytes32String("EventID")')
      // const ADMIN_ROLE = await contract.ADMIN_ROLE();
      // const CREATOR_ROLE = await contract.CREATOR_ROLE();

      // const tx = await contract.grantRole(ADMIN_ROLE, '0x8aa6025aAA6436b378E68D7bCFbc9f519a63e066');
      // await tx.wait();

      // const tx2 = await contract.grantRole(CREATOR_ROLE, '0x8aa6025aAA6436b378E68D7bCFbc9f519a63e066')
      // await tx2.wait();

      // const eventForBookingData = {
      //   expiredIn: 1703209156,
      //   declined: false,
      //   creator: '0x8aa6025aAA6436b378E68D7bCFbc9f519a63e066',
      //   title: "Sample Event",
      //   maxTickets: 10,
      //   ticketsBooked: 2,
      //   price: 100000000,
      // };

      // // Create an event for booking
      // const tx3 = await contract.createEventForBooking(eventForBookingData.expiredIn, eventForBookingData.title, eventForBookingData.ticketsBooked, eventForBookingData.maxTickets, eventForBookingData.price, ethers.encodeBytes32String("EventID"));

      // console.log(tx3, 'TX')

    

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
