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
      reason:
        "Palpites encerrados para este jogo. O limite é 30 minutos antes da partida.",
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

    const checkExistingPredictionQuery = `
      SELECT * FROM predictions
      WHERE user_id = ? AND match_id = ?
    `;

    db.get(
      checkExistingPredictionQuery,
      [user_id, match_id],
      (err, existingPrediction) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (existingPrediction) {
          return res.status(409).json({
            error:
              "Este usuário já fez um palpite para este jogo. Edite o palpite existente.",
            predictionId: existingPrediction.id,
          });
        }

        const insertPredictionQuery = `
          INSERT INTO predictions
          (user_id, match_id, predicted_home_score, predicted_away_score, created_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `;

        db.run(
          insertPredictionQuery,
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
      }
    );
  });
};

// Listar palpites com dados do usuário e do jogo
exports.getPredictions = (req, res) => {
  const query = `
    SELECT
      predictions.id,
      predictions.user_id,
      users.name AS user_name,
      users.email AS username,
      predictions.match_id,
      matches.home_team,
      matches.away_team,
      matches.match_date,
      matches.group_name,
      matches.status AS match_status,
      matches.home_score,
      matches.away_score,
      predictions.predicted_home_score,
      predictions.predicted_away_score,
      predictions.points,
      predictions.created_at
    FROM predictions
    LEFT JOIN users ON users.id = predictions.user_id
    LEFT JOIN matches ON matches.id = predictions.match_id
    ORDER BY predictions.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.json(rows);
  });
};

// Editar palpite
exports.updatePrediction = (req, res) => {
  const { id } = req.params;
  const { predicted_home_score, predicted_away_score } = req.body;

  const getPredictionQuery = `
    SELECT * FROM predictions WHERE id = ?
  `;

  db.get(getPredictionQuery, [id], (err, prediction) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!prediction) {
      return res.status(404).json({
        error: "Palpite não encontrado",
      });
    }

    const getMatchQuery = `
      SELECT * FROM matches WHERE id = ?
    `;

    db.get(getMatchQuery, [prediction.match_id], (err, match) => {
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

      const updatePredictionQuery = `
        UPDATE predictions
        SET predicted_home_score = ?, predicted_away_score = ?, points = 0
        WHERE id = ?
      `;

      db.run(
        updatePredictionQuery,
        [predicted_home_score, predicted_away_score, id],
        function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          return res.json({
            message: "Palpite atualizado com sucesso",
          });
        }
      );
    });
  });
};