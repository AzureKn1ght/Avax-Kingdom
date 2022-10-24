/*
- Avax Kingdom - 
For automatic daily claims!  
URL: https://www.avaxkingdom.xyz/?p=0xaB951EC23283eE00AE0A575B89dDF40Df28e23Ab
*/

// Import required node modules
const scheduler = require("node-schedule");
const { ethers, BigNumber } = require("ethers");
const figlet = require("figlet");
const ABI = require("./abi");
require("dotenv").config();
const fs = require("fs");

// Import the environment variables
const VAULT = process.env.CONTRACT_ADR;
const RPC_URL = process.env.AVAX_RPC;
const wallet = {
  address: process.env["ADR"],
  key: process.env["PVK"],
};

// Storage obj
var claims = {
  previousClaim: "",
  nextClaim: "",
};

// Main Function
const main = async () => {
  let claimExists = false;
  try {
    // check if claims file exists
    if (!fs.existsSync("./claims.json")) await storedData();

    // get stored values from file
    const storedData = JSON.parse(fs.readFileSync("./claims.json"));

    // not first launch, check data
    if ("nextClaim" in storedData) {
      const nextClaim = new Date(storedData.nextClaim);

      // restore claims schedule
      if (nextClaim > new Date()) {
        console.log("Restored Claim: " + nextClaim);
        scheduler.scheduleJob(nextClaim, GoldClaim);
        claimExists = true;
      }
    }
  } catch (error) {
    console.error(error);
  }

  // first time, no previous launch
  if (!claimExists) GoldClaim();
};

// Ethers connect on each wallet
const connect = async (wallet) => {
  let connection = {};

  // Add connection properties
  connection.provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  connection.wallet = new ethers.Wallet(wallet.key, connection.provider);
  connection.contract = new ethers.Contract(VAULT, ABI, connection.wallet);

  // connection established
  await connection.provider.getBalance(wallet.address);
  return connection;
};

// Gold Claim Function
const GoldClaim = async () => {
  // start function
  console.log("\n");
  console.log(
    figlet.textSync("AvaxKingdom", {
      font: "Standard",
      horizontalLayout: "default",
      verticalLayout: "default",
      width: 80,
      whitespaceBreak: true,
    })
  );

  // store last claim, and schedule the next
  claims.previousClaim = new Date().toString();
  scheduleNext(new Date());

  // start
  try {
    // claim - 3 tries on fail
    const gold = await claimRewards(1);

    // withdraw claimed amount
    return withdrawGold(gold);
  } catch (error) {
    console.log(`Daily claim failed!`);
    console.error(error);
  }
};

// Withdraw Function
const withdrawGold = async (gold) => {
  console.log("Withdrawing Funds...");

  // initialize blockchain connections
  const connection = await connect(wallet);
  await delay();

  // fetch if amount didn't come through
  if (!gold) {
    const t = await connection.contract.towers(wallet.address);
    gold = BigNumber.from(t.money);
  }

  try
  {
    // execute the withdrawal transaction
    const w = await connection.contract.withdrawMoney(gold);
    const receipt = await w.wait();

    // wait for transaction to complete
    if (receipt) {
      console.log("WITHDRAW SUCCESSFUL");

      // get the user wallet AVAX balance
      const b = await connection.provider.getBalance(wallet.address);
      const balance = ethers.utils.formatEther(b);
      console.log(`Wallet: ${balance} AVAX`);
      console.log("-----");
      return true;
    }
  } catch (error) {
    console.error(error);
    console.log("Withdrawal Failed!");
    return false;
  }
};

// Claims Function
const claimRewards = async (tries) => {
  try {
    // limit to maximum 3 tries
    if (tries > 3) return false;
    console.log(`Try #${tries}...`);
    console.log("Claiming Rewards...");

    // initialize blockchain connections
    const connection = await connect(wallet);

    // apply delay
    await delay();

    // execute the claiming transaction
    const claim = await connection.contract.collectMoney();
    const receipt = await claim.wait();

    // wait for transaction to complete
    if (receipt) {
      console.log("CLAIM SUCCESSFUL");

      // get user account rewards data
      const t = await connection.contract.towers(wallet.address);
      const balance = BigNumber.from(t.money).toString();
      console.log(`Balance: ${balance} gold`);

      return t.money;
    }
  } catch (error) {
    // failed try again
    console.error(error);
    console.log("Claim Attempt Failed!");
    console.log("reconnecting...");
    return await claimRewards(++tries);
  }

  return false;
};

// Job Scheduler Function
const scheduleNext = async (nextDate) => {
  // set next job to be 24hrs from now
  nextDate.setHours(nextDate.getHours() + 24);
  claims.nextClaim = nextDate.toString();
  console.log("Next Claim: ", nextDate);

  // schedule next restake
  scheduler.scheduleJob(nextDate, GoldClaim);
  storeData();
  return;
};

// Data Storage Function
const storeData = async () => {
  const data = JSON.stringify(claims);
  fs.writeFile("./claims.json", data, (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log("Data stored:", claims);
    }
  });
};

// Random Time Delay Function
const delay = () => {
  const ms = getRandomNum(196418, 317811);
  console.log(`delay(${ms})`);
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Generate random num Function
const getRandomNum = (min, max) => {
  try {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  } catch (error) {
    console.error(error);
  }
  return max;
};

main();
