const db = require("../database/database");
const { calcularPontuacao } = require("../services/scoreService");

const ALLOWED_STATUSES = ["scheduled", "postponed", "live", "finished", "cancelled"];

// Criar jogo
exports.createMatch = (req, res) => {
  const { home_team, away_team, match_date, group_name } = req.body;

  if (!home_team || !away_team || !match_date || !group_name) {
    return res.status(400).json({
      error: "home_team, away_team, match_date e group_name são obrigatórios.",
    });
  }

  const query = `
    INSERT INTO matches (home_team, away_team, match_date, group_name, status)
    VALUES (?, ?, ?, ?, 'scheduled')
  `;

  db.run(query, [home_team, away_team, match_date, group_name], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.status(201).json({
      message: "Jogo criado com sucesso.",
      matchId: this.lastID,
    });
  });
};

// Listar jogos
exports.getMatches = (req, res) => {
  const query = `
    SELECT * FROM matches
    ORDER BY match_date ASC
  `;

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

  if (home_score === undefined || away_score === undefined) {
    return res.status(400).json({
      error: "home_score e away_score são obrigatórios.",
    });
  }

  const homeScoreNumber = Number(home_score);
  const awayScoreNumber = Number(away_score);

  if (Number.isNaN(homeScoreNumber) || Number.isNaN(awayScoreNumber)) {
    return res.status(400).json({
      error: "home_score e away_score devem ser números.",
    });
  }

  const updateMatchQuery = `
    UPDATE matches
    SET home_score = ?, away_score = ?, status = 'finished'
    WHERE id = ?
  `;

  db.run(updateMatchQuery, [homeScoreNumber, awayScoreNumber, id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        error: "Jogo não encontrado.",
      });
    }

    const getPredictionsQuery = `
      SELECT * FROM predictions WHERE match_id = ?
    `;

    db.all(getPredictionsQuery, [id], (err, predictions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (predictions.length === 0) {
        return res.json({
          message:
            "Resultado atualizado, jogo finalizado e nenhum palpite encontrado para pontuar.",
        });
      }

      let updatedPredictions = 0;
      let hasError = false;

      predictions.forEach((prediction) => {
        const points = calcularPontuacao(prediction, {
          home_score: homeScoreNumber,
          away_score: awayScoreNumber,
        });

        const updatePointsQuery = `
          UPDATE predictions
          SET points = ?
          WHERE id = ?
        `;

        db.run(updatePointsQuery, [points, prediction.id], (err) => {
          if (hasError) {
            return;
          }

          if (err) {
            hasError = true;
            return res.status(500).json({ error: err.message });
          }

          updatedPredictions += 1;

          if (updatedPredictions === predictions.length) {
            return res.json({
              message: "Resultado atualizado, jogo finalizado e pontuações calculadas.",
            });
          }
        });
      });
    });
  });
};

// Atualizar status do jogo
exports.updateMatchStatus = (req, res) => {
  const { id } = req.params;
  const { status, match_date } = req.body;

  if (!status) {
    return res.status(400).json({
      error: "status é obrigatório.",
    });
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Status inválido. Use um destes: ${ALLOWED_STATUSES.join(", ")}.`,
    });
  }

  let query = "";
  let params = [];

  if (match_date) {
    query = `
      UPDATE matches
      SET status = ?, match_date = ?
      WHERE id = ?
    `;

    params = [status, match_date, id];
  } else {
    query = `
      UPDATE matches
      SET status = ?
      WHERE id = ?
    `;

    params = [status, id];
  }

  db.run(query, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        error: "Jogo não encontrado.",
      });
    }

    return res.json({
      message: "Status do jogo atualizado com sucesso.",
    });
  });
};