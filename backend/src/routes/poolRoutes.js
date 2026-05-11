const express = require("express");
const router = express.Router();

const poolController = require("../controllers/poolController");
const {
  authenticateToken,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");

router.get("/", authenticateToken, authorizeAdmin, poolController.getAllPools);

router.get("/me", authenticateToken, poolController.getMyPools);

router.post(
  "/",
  authenticateToken,
  authorizeAdmin,
  poolController.createPool
);

router.post("/join", authenticateToken, poolController.joinPoolByCode);

module.exports = router;