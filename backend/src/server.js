const express = require("express");
const cors = require("cors");

const matchRoutes = require("./routes/matchRoutes");
const userRoutes = require("./routes/userRoutes");
const predictionRoutes = require("./routes/predictionRoutes");
const rankingRoutes = require("./routes/rankingRoutes");
const poolRoutes = require("./routes/poolRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/matches", matchRoutes);
app.use("/users", userRoutes);
app.use("/predictions", predictionRoutes);
app.use("/ranking", rankingRoutes);
app.use("/pools", poolRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Backend do Bolão da Copa STI rodando!",
  });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

