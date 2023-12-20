import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@openzeppelin/hardhat-upgrades';
import 'dotenv/config';

//npx hardhat run scripts/deploy.js --network mumbai
//npx hardhat verify --network mumbai 0x101fcA239DF3104f454AF34AE642b2F7Ae9289F9

const config: HardhatUserConfig = {
  solidity: { 
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    goerli: {
      url: `${process.env.ALCHEMY_GOERLI_URL}`,
      accounts: [`0x${process.env.GOERLI_PRIVITE_KEY}`],
    },
    mumbai: {
      url: `${process.env.INFURA_API_KEY}`,
      accounts: [`${process.env.MUMBAI_PRIVITE_KEY}`],
    },
  },
  etherscan: {
    apiKey: `${process.env.ETHERSCAN_KEY}`
  }
};

export default config;

// import { HardhatUserConfig } from "hardhat/config";
// import "@nomicfoundation/hardhat-toolbox";
// import '@openzeppelin/hardhat-upgrades';

// const config: HardhatUserConfig = {
//   solidity: "0.8.20",
// };

// export default config;
