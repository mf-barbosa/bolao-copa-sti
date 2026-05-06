const express = require("express");
const router = express.Router();

const predictionController = require("../controllers/predictionController");
const { authenticateToken } = require("../middlewares/authMiddleware");

router.get("/", predictionController.getPredictions);
router.post("/", authenticateToken, predictionController.createPrediction);
router.put("/:id", authenticateToken, predictionController.updatePrediction);

module.exports = router;