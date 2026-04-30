const db = require("../database/database");

// Criar palpite
exports.createPrediction = (req, res) => {
  const {
    user_id,
    match_id,
    predicted_home_score,
    predicted_away_score,
  } = req.body;

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