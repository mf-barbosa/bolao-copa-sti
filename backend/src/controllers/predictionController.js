const db = require("../database/database");

function canUserPredict(match) {
  const status = match.status || "scheduled";

  if (status === "postponed") {
    return {
      allowed: true,
    };
  }

  if (status !== "scheduled") {
    return {
      allowed: false,
      reason: "Não é possível palpitar neste jogo por causa do status atual.",
    };
  }

  const matchDate = new Date(match.match_date.replace(" ", "T"));
  const predictionDeadline = new Date(matchDate.getTime() - 30 * 60 * 1000);
  const now = new Date();

  if (now >= predictionDeadline) {
    return {
      allowed: false,
      reason: "Palpites encerrados para este jogo. O limite é 30 minutos antes da partida.",
    };
  }

  return {
    allowed: true,
  };
}

// Criar palpite
exports.createPrediction = (req, res) => {
  const {
    user_id,
    match_id,
    predicted_home_score,
    predicted_away_score,
  } = req.body;

  const getMatchQuery = `
    SELECT * FROM matches WHERE id = ?
  `;

  db.get(getMatchQuery, [match_id], (err, match) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!match) {
      return res.status(404).json({
        error: "Jogo não encontrado",
      });
    }

    const predictionStatus = canUserPredict(match);

    if (!predictionStatus.allowed) {
      return res.status(403).json({
        error: predictionStatus.reason,
      });
    }

    const query = `
      INSERT INTO predictions 
      (user_id, match_id, predicted_home_score, predicted_away_score, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `;

    db.run(
      query,
      [user_id, match_id, predicted_home_score, predicted_away_score],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        return res.status(201).json({
          message: "Palpite criado com sucesso",
          predictionId: this.lastID,
        });
      }
    );
  });
};

// Listar palpites
exports.getPredictions = (req, res) => {
  const query = `SELECT * FROM predictions`;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.json(rows);
  });
};