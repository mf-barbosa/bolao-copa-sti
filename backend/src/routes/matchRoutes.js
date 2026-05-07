const express = require("express");
const router = express.Router();

const matchController = require("../controllers/matchController");
const {
  authenticateToken,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");

router.get("/", matchController.getMatches);

router.post(
  "/",
  authenticateToken,
  authorizeAdmin,
  matchController.createMatch
);

router.put(
  "/:id/result",
  authenticateToken,
  authorizeAdmin,
  matchController.updateMatchResult
);

module.exports = router;