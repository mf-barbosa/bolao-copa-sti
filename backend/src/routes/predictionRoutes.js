const express = require("express");
const router = express.Router();

const predictionController = require("../controllers/predictionController");

router.post("/", predictionController.createPrediction);
router.get("/", predictionController.getPredictions);

module.exports = router;