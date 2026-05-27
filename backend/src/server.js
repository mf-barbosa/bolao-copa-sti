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

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes("*")) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    console.warn(`Origem bloqueada pelo CORS: ${origin}`);

    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

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
    cors_origin: process.env.CORS_ORIGIN || "not_configured",
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});