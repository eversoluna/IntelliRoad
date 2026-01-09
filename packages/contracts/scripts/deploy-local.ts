import { ethers } from 'hardhat';

async function main() {
  const Factory = await ethers.getContractFactory('AnchorRegistry');
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log('AnchorRegistry deployed to:', addr);
  console.log('Set this in apps/frontend/.env.local as VITE_CONTRACT_ADDRESS');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
