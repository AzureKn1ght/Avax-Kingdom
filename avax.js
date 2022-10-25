/*
- Kingdom Cash - 
For automatic daily claims!  

URLs: 
https://www.avaxkingdom.xyz/?p=0xaB951EC23283eE00AE0A575B89dDF40Df28e23Ab
https://www.optkingdom.xyz/?p=0xaB951EC23283eE00AE0A575B89dDF40Df28e23Ab
https://www.matickingdom.xyz/?p=0xaB951EC23283eE00AE0A575B89dDF40Df28e23Ab
https://www.kingdomcash.xyz/?p=0xaB951EC23283eE00AE0A575B89dDF40Df28e23Ab
*/

// Import required node modules
const { ethers, BigNumber } = require("ethers");
const scheduler = require("node-schedule");
const nodemailer = require("nodemailer");
const figlet = require("figlet");
const ABI = require("./abi");
require("dotenv").config();
const fs = require("fs");

// Import wallet
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

// Import chain detail
const initNetworks = (n) => {
  let networks = [];
  for (let i = 1; i <= n; i++) {
    const chain = {
      index: i,
      rpc: process.env["RPC_" + i],
      contract: process.env["CONTRACT_" + i],
    };
    networks.push(chain);
  }
  return networks;
};

// Ethers connect on each wallet
const connect = async (network) => {
  let connection = {};

  // Add connection properties
  connection.provider = new ethers.providers.JsonRpcProvider(network.rpc);
  connection.wallet = new ethers.Wallet(wallet.key, connection.provider);
  connection.contract = new ethers.Contract(
    network.contract,
    ABI,
    connection.wallet
  );

  // connection established
  await connection.provider.getBalance(wallet.address);
  return connection;
};

// Gold Claim Function
const GoldClaim = async () => {
  // start function
  console.log("\n");
  console.log(
    figlet.textSync("KingdomCash", {
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

  // get network detail from .env
  const networks = initNetworks(4);

  // storage array for sending reports
  let report = ["Kingdom Report " + todayDate()];
  const URLs = {
    CHAIN_1: "https://www.avaxkingdom.xyz",
    CHAIN_2: "https://www.matickingdom.xyz",
    CHAIN_3: "https://www.kingdomcash.xyz",
    CHAIN_4: "https://www.optkingdom.xyz",
  };

  // loop through for each chain
  for (const chain of networks) {
    // start
    try {
      // connect to the current chain
      const connection = connect(chain);

      // claim and withdraw out rewards
      const gold = await claimRewards(1, connection);
      const result = await withdrawGold(gold, connection);

      // get user wallet current balance
      const b = await connection.provider.getBalance(wallet.address);
      const balance = ethers.utils.formatEther(b);

      // check contract balance amount
      const c = await connection.provider.getBalance(chain.contract);
      const tvl = ethers.utils.formatEther(c);

      // succeeded
      const success = {
        chain: chain.index,
        gold: gold.toString(),
        withdrawn: result,
        balance: balance,
        contract_tvl: tvl,
        URL: URLs["CHAIN_" + chain.index],
      };

      report.push(success);
    } catch (error) {
      console.log(`Daily claim failed!`);
      console.error(error);

      // failed
      const fail = {
        index: chain.index,
        claimed: false,
      };

      report.push(fail);
    }
  }

  // report status daily
  report.push(claims);
  sendReport(report);
};

// Withdraw Function
const withdrawGold = async (gold, connection) => {
  console.log("Withdrawing Funds...");
  await delay();

  // fetch if amount didn't come through
  if (!gold) {
    const t = await connection.contract.towers(wallet.address);
    gold = BigNumber.from(t.money);
  }

  try {
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
const claimRewards = async (tries, connection) => {
  try {
    // limit to maximum 3 tries
    if (tries > 3) return false;
    console.log(`Try #${tries}...`);
    console.log("Claiming Rewards...");
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
  const ms = getRandomNum(75025, 196418);
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

// Current Date function
const todayDate = () => {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// Send Report Function
const sendReport = async (report) => {
  // get the formatted date
  const today = todayDate();
  console.log(report);

  // configure email server
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_ADDR,
      pass: process.env.EMAIL_PW,
    },
  });

  // setup mail params
  const mailOptions = {
    from: process.env.EMAIL_ADDR,
    to: process.env.RECIPIENT,
    subject: "Kingdom Report: " + today,
    text: JSON.stringify(report, null, 2),
  };

  // send the email message
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

main();
