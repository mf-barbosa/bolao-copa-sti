const userRoutes = require("./routes/userRoutes");
const matchRoutes = require("./routes/matchRoutes");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/matches", matchRoutes);
app.use("/users", userRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Backend do Bolão da Copa STI rodando!",
  });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

