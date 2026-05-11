const express = require("express");
const router = express.Router();

const rankingController = require("../controllers/rankingController");
const { authenticateToken } = require("../middlewares/authMiddleware");

router.get("/", rankingController.getRanking);
router.get("/:poolId", authenticateToken, rankingController.getRankingByPool);

module.exports = router;