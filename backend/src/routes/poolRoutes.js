const express = require("express");
const router = express.Router();

const poolController = require("../controllers/poolController");
const {
  authenticateToken,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");

router.get("/", authenticateToken, authorizeAdmin, poolController.getAllPools);

router.get("/me", authenticateToken, poolController.getMyPools);

router.get(
  "/:poolId/users",
  authenticateToken,
  authorizeAdmin,
  poolController.getPoolUsers
);

router.post(
  "/",
  authenticateToken,
  authorizeAdmin,
  poolController.createPool
);

router.post("/join", authenticateToken, poolController.joinPoolByCode);

router.delete(
  "/:poolId/users/:userId",
  authenticateToken,
  authorizeAdmin,
  poolController.removeUserFromPool
);

router.delete(
  "/:poolId",
  authenticateToken,
  authorizeAdmin,
  poolController.deletePool
);

module.exports = router;