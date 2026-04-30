const db = require("../database/database");
const { calcularPontuacao } = require("../services/scoreService");

// Criar jogo
exports.createMatch = (req, res) => {
  const { home_team, away_team, match_date, group_name } = req.body;

  const query = `
    INSERT INTO matches (home_team, away_team, match_date, group_name)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [home_team, away_team, match_date, group_name], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.status(201).json({
      message: "Jogo criado com sucesso",
      matchId: this.lastID,
    });
  });
};

// Listar jogos
exports.getMatches = (req, res) => {
  const query = `SELECT * FROM matches`;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.json(rows);
  });
};

// Atualizar resultado do jogo e calcular pontos
exports.updateMatchResult = (req, res) => {
  const { id } = req.params;
  const { home_score, away_score } = req.body;

  const updateMatchQuery = `
    UPDATE matches
    SET home_score = ?, away_score = ?
    WHERE id = ?
  `;

  db.run(updateMatchQuery, [home_score, away_score, id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const getPredictionsQuery = `
      SELECT * FROM predictions WHERE match_id = ?
    `;

    db.all(getPredictionsQuery, [id], (err, predictions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      predictions.forEach((prediction) => {
        const pontos = calcularPontuacao(prediction, {
          home_score,
          away_score,
        });

        const updatePointsQuery = `
          UPDATE predictions
          SET points = ?
          WHERE id = ?
        `;

        db.run(updatePointsQuery, [pontos, prediction.id]);
      });

      return res.json({
        message: "Resultado atualizado e pontuações calculadas",
      });
    });
  });
};