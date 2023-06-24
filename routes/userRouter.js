const express = require("express");

const userController = require("./../controllers/userControlller");
const authController = require("./../controllers/authController");

const router = express.Router();

router.get("/isLoggedIn", authController.isLoggedIn);

router.post("/signup", authController.signup);
router.post("/login", authController.logIn);
router.get("/logout", authController.logout);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token&:email", authController.resetPassword);

router.patch("/updateMe", authController.protect, userController.updateMe);
router.get("/me", authController.protect, userController.getMe);

router.patch(
  "/updatePassword",
  authController.protect,
  authController.updatePassword
);

router.use(authController.protect, authController.restrictTo("admin"));
router
  .route("/")
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route("/:id")
  .get(userController.getUserById)
  .patch(userController.updateUserById)
  .delete(userController.deleteUserById);

module.exports = router;
