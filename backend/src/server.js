require("dotenv").config();

const express = require("express");
const cors = require("cors");

const matchRoutes = require("./routes/matchRoutes");
const userRoutes = require("./routes/userRoutes");
const predictionRoutes = require("./routes/predictionRoutes");
const rankingRoutes = require("./routes/rankingRoutes");
const poolRoutes = require("./routes/poolRoutes");

const app = express();

const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origem não permitida pelo CORS."));
  },
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/matches", matchRoutes);
app.use("/users", userRoutes);
app.use("/predictions", predictionRoutes);
app.use("/ranking", rankingRoutes);
app.use("/pools", poolRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Backend do Bolão da Copa STI rodando!",
    environment: process.env.NODE_ENV || "development",
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});