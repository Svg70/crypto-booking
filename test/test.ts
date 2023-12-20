import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("Upgradeable token", function() {
  async function dep() {
    const [ deployer ] = await ethers.getSigners();
    console.log(deployer, 'DEPLOYER')

    const NFTFactory = await ethers.getContractFactory("MyToken");

    console.log(NFTFactory, 'FACTORY')
    const token = await upgrades.deployProxy(NFTFactory, [deployer.address], {
      initializer: 'initialize',
      kind: 'uups',
    });
    console.log(token, 'TOKEN_DEPLYED')

    await token.waitForDeployment();

    return { token, deployer }
  }

  it('works', async function() {
    const { token, deployer } = await loadFixture(dep);
    console.log(token, deployer, 'RES')

    const mintTx = await token.safeMint(deployer.address, 123);
    await mintTx.wait();

    expect(await token.balanceOf(deployer.address)).to.eq(1);

    const NFTFactoryv2 = await ethers.getContractFactory("MyTokenV2");

    const token2 = await upgrades.upgradeProxy(token, NFTFactoryv2);

    expect(await token2.balanceOf(deployer.address)).to.eq(1);
    expect(await token2.demo()).to.be.true;
    console.log(token);
    console.log(token2);
  });
});