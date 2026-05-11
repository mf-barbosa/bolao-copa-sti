const db = require("../database/database");
const { calcularPontuacao } = require("../services/scoreService");

const ALLOWED_STATUSES = ["scheduled", "postponed", "live", "finished", "cancelled"];

function isAdminUser(req) {
  return Number(req.user?.is_admin) === 1;
}

function validatePoolId(pool_id) {
  const poolIdNumber = Number(pool_id);

  if (!pool_id || Number.isNaN(poolIdNumber)) {
    return null;
  }

  return poolIdNumber;
}

function checkUserInPool(userId, poolId, callback) {
  const query = `
    SELECT * FROM pool_users
    WHERE user_id = ? AND pool_id = ?
  `;

  db.get(query, [userId, poolId], (err, membership) => {
    if (err) {
      return callback(err);
    }

    return callback(null, Boolean(membership));
  });
}

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

// Listar jogos com filtros opcionais
exports.getMatches = (req, res) => {
  const { group_name, status } = req.query;

  const filters = [];
  const params = [];

  if (group_name) {
    filters.push("group_name = ?");
    params.push(group_name);
  }

  if (status) {
    filters.push("status = ?");
    params.push(status);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

  const query = `
    SELECT *
    FROM matches
    ${whereClause}
    ORDER BY match_date ASC
  `;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.json(rows);
  });
};

// Listar resumo dos grupos
exports.getGroupsSummary = (req, res) => {
  const query = `
    SELECT
      group_name,
      COUNT(*) AS matches_count,
      SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled_count,
      SUM(CASE WHEN status = 'postponed' THEN 1 ELSE 0 END) AS postponed_count,
      SUM(CASE WHEN status = 'live' THEN 1 ELSE 0 END) AS live_count,
      SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END) AS finished_count,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
    FROM matches
    GROUP BY group_name
    ORDER BY group_name ASC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.json(rows);
  });
};

// Listar progresso de palpites por grupo para o usuário logado em um bolão
exports.getGroupsProgress = (req, res) => {
  const { pool_id } = req.query;
  const userId = req.user.id;
  const isAdmin = isAdminUser(req);

  const poolIdNumber = validatePoolId(pool_id);

  if (!poolIdNumber) {
    return res.status(400).json({
      error: "pool_id é obrigatório e deve ser um número válido.",
    });
  }

  const getPoolQuery = `
    SELECT * FROM pools WHERE id = ?
  `;

  db.get(getPoolQuery, [poolIdNumber], (err, pool) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!pool) {
      return res.status(404).json({
        error: "Bolão não encontrado.",
      });
    }

    const buildProgress = () => {
      const query = `
        SELECT
          matches.group_name,
          COUNT(matches.id) AS matches_count,
          COUNT(predictions.id) AS predictions_count,
          COUNT(matches.id) - COUNT(predictions.id) AS missing_predictions_count,
          SUM(CASE WHEN matches.status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled_count,
          SUM(CASE WHEN matches.status = 'postponed' THEN 1 ELSE 0 END) AS postponed_count,
          SUM(CASE WHEN matches.status = 'live' THEN 1 ELSE 0 END) AS live_count,
          SUM(CASE WHEN matches.status = 'finished' THEN 1 ELSE 0 END) AS finished_count,
          SUM(CASE WHEN matches.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
        FROM matches
        LEFT JOIN predictions
          ON predictions.match_id = matches.id
          AND predictions.pool_id = ?
          AND predictions.user_id = ?
        GROUP BY matches.group_name
        ORDER BY matches.group_name ASC
      `;

      db.all(query, [poolIdNumber, userId], (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const progress = rows.map((group) => ({
          ...group,
          completed: group.matches_count === group.predictions_count,
        }));

        return res.json({
          pool: {
            id: pool.id,
            name: pool.name,
            code: pool.code,
          },
          progress,
        });
      });
    };

    if (isAdmin) {
      return buildProgress();
    }

    checkUserInPool(userId, poolIdNumber, (err, isMember) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!isMember) {
        return res.status(403).json({
          error: "Usuário não participa deste bolão.",
        });
      }

      return buildProgress();
    });
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