const fs = require("fs");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const PG = require("../models/pgmodel.js");

dotenv.config({ path: "./config.env" });

const DB = process.env.DATABASE.replace(
  "<password>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Database connection established"));

const pgs = JSON.parse(fs.readFileSync(`${__dirname}/pgs.json`, "utf-8"));
// console.log(pgs);
const importData = async () => {
  try {
    await PG.create(pgs);
    console.log("Data imported successfully");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};
importData();
