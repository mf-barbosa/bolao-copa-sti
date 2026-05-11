const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const {
  authenticateToken,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");

router.post("/", userController.createUser);
router.post("/login", userController.loginUser);

router.get("/me", authenticateToken, userController.getMe);

router.get(
  "/",
  authenticateToken,
  authorizeAdmin,
  userController.getUsers
);

module.exports = router;