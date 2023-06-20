const express = require("express");

const pgcontroller = require("../controllers/pgcontroller");
const authcontroller = require("./../controllers/authController");
const reviewRouter = require("./reviewRouter");

const router = express.Router();

router
  .route("/")
  .post(
    authcontroller.protect,
    // authcontroller.restrictTo("pgOwner", "admin"),
    pgcontroller.upload.array("images", 50),
    pgcontroller.createPg,
    pgcontroller.uploadPics
  )
  .get(pgcontroller.getAllPgs);

router
  .route("/:id")
  .get(pgcontroller.getPgById)
  .patch(
    authcontroller.protect,
    authcontroller.restrictTo("pgOwner", "admin"),
    pgcontroller.updatePgById
  )
  .delete(
    authcontroller.protect,
    authcontroller.restrictTo("pgOwner", "admin"),
    pgcontroller.deletePgById
  );

router.route("/search").post(pgcontroller.searchPg);

router.use("/:pgId/reviews", reviewRouter);

router
  .route("/upload")
  .post(pgcontroller.upload.array("images", 50), pgcontroller.uploadPics);

module.exports = router;
