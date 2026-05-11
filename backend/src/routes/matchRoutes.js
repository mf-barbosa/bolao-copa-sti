const express = require("express");
const router = express.Router();

const matchController = require("../controllers/matchController");
const {
  authenticateToken,
  authorizeAdmin,
} = require("../middlewares/authMiddleware");

router.get("/", matchController.getMatches);
router.get("/groups", matchController.getGroupsSummary);
router.get(
  "/groups/progress",
  authenticateToken,
  matchController.getGroupsProgress
);

router.get(
  "/group/:groupName",
  authenticateToken,
  matchController.getMatchesByGroupWithPredictions
);

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

router.put(
  "/:id/status",
  authenticateToken,
  authorizeAdmin,
  matchController.updateMatchStatus
);

module.exports = router;