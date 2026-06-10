const db = require("../database/database");

function isAdminUser(req) {
  return Number(req.user?.is_admin) === 1;
}

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

function validatePoolId(pool_id) {
  const poolIdNumber = Number(pool_id);

  if (!pool_id || Number.isNaN(poolIdNumber) || poolIdNumber <= 0) {
    return null;
  }

  return poolIdNumber;
}

function validateId(id) {
  const idNumber = Number(id);

  if (!id || Number.isNaN(idNumber) || idNumber <= 0) {
    return null;
  }

  return idNumber;
}

function validatePredictionScores(predicted_home_score, predicted_away_score) {
  const scores = [
    {
      field: "predicted_home_score",
      label: "predicted_home_score",
      value: predicted_home_score,
    },
    {
      field: "predicted_away_score",
      label: "predicted_away_score",
      value: predicted_away_score,
    },
  ];

  const normalizedScores = {};

  for (const score of scores) {
    const { field, label, value } = score;

    if (value === undefined || value === null || value === "") {
      return {
        valid: false,
        error: `${label} é obrigatório.`,
      };
    }

    if (typeof value !== "number" && typeof value !== "string") {
      return {
        valid: false,
        error: `${label} deve ser um número inteiro entre 0 e 99.`,
      };
    }

    if (typeof value === "string" && value.trim() === "") {
      return {
        valid: false,
        error: `${label} é obrigatório.`,
      };
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return {
        valid: false,
        error: `${label} deve ser um número válido.`,
      };
    }

    if (!Number.isInteger(numericValue)) {
      return {
        valid: false,
        error: `${label} deve ser um número inteiro.`,
      };
    }

    if (numericValue < 0) {
      return {
        valid: false,
        error: `${label} não pode ser negativo.`,
      };
    }

    if (numericValue > 99) {
      return {
        valid: false,
        error: `${label} deve ser menor ou igual a 99.`,
      };
    }

    normalizedScores[field] = numericValue;
  }

  return {
    valid: true,
    homeScore: normalizedScores.predicted_home_score,
    awayScore: normalizedScores.predicted_away_score,
  };
}

function dbGet(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(row);
    });
  });
}

function dbRun(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject(err);
        return;
      }

      resolve({
        lastID: this.lastID,
        changes: this.changes,
      });
    });
  });
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

function getDetailedPredictions(whereClause, params, res) {
  const query = `
    SELECT
      predictions.id,
      predictions.user_id,
      users.name AS user_name,
      users.email AS user_email,
      predictions.match_id,
      predictions.pool_id,
      pools.name AS pool_name,
      pools.code AS pool_code,
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
    LEFT JOIN pools ON pools.id = predictions.pool_id
    ${whereClause}
    ORDER BY predictions.created_at DESC
  `;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.json(rows);
  });
}

// Criar palpite usando o usuário logado e o bolão informado
exports.createPrediction = (req, res) => {
  const user_id = req.user.id;

  const {
    match_id,
    pool_id,
    predicted_home_score,
    predicted_away_score,
  } = req.body;

  const matchIdNumber = validateId(match_id);
  const poolIdNumber = validatePoolId(pool_id);

  if (
    !matchIdNumber ||
    !poolIdNumber ||
    predicted_home_score === undefined ||
    predicted_away_score === undefined
  ) {
    return res.status(400).json({
      error:
        "match_id, pool_id, predicted_home_score e predicted_away_score são obrigatórios.",
    });
  }

  const scoreValidation = validatePredictionScores(
    predicted_home_score,
    predicted_away_score
  );

  if (!scoreValidation.valid) {
    return res.status(400).json({
      error: scoreValidation.error,
    });
  }

  const getMatchQuery = `
    SELECT * FROM matches WHERE id = ?
  `;

  db.get(getMatchQuery, [matchIdNumber], (err, match) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!match) {
      return res.status(404).json({
        error: "Jogo não encontrado.",
      });
    }

    const predictionStatus = canUserPredict(match);

    if (!predictionStatus.allowed) {
      return res.status(403).json({
        error: predictionStatus.reason,
      });
    }

    checkUserInPool(user_id, poolIdNumber, (err, isMember) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!isMember && !isAdminUser(req)) {
        return res.status(403).json({
          error: "Usuário não participa deste bolão.",
        });
      }

      const checkExistingPredictionQuery = `
        SELECT * FROM predictions
        WHERE user_id = ? AND match_id = ? AND pool_id = ?
      `;

      db.get(
        checkExistingPredictionQuery,
        [user_id, matchIdNumber, poolIdNumber],
        (err, existingPrediction) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          if (existingPrediction) {
            return res.status(409).json({
              error:
                "Este usuário já fez um palpite para este jogo neste bolão. Edite o palpite existente.",
              predictionId: existingPrediction.id,
            });
          }

          const insertPredictionQuery = `
            INSERT INTO predictions
            (user_id, match_id, pool_id, predicted_home_score, predicted_away_score, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
          `;

          db.run(
            insertPredictionQuery,
            [
              user_id,
              matchIdNumber,
              poolIdNumber,
              scoreValidation.homeScore,
              scoreValidation.awayScore,
            ],
            function (err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              return res.status(201).json({
                message: "Palpite criado com sucesso.",
                predictionId: this.lastID,
              });
            }
          );
        }
      );
    });
  });
};

// Criar ou atualizar vários palpites de uma vez usando o usuário logado
exports.bulkUpsertPredictions = async (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req);

  const { pool_id, predictions } = req.body;

  const poolIdNumber = validatePoolId(pool_id);

  if (!poolIdNumber) {
    return res.status(400).json({
      error: "pool_id é obrigatório e deve ser um número válido.",
    });
  }

  if (!Array.isArray(predictions) || predictions.length === 0) {
    return res.status(400).json({
      error: "predictions deve ser uma lista com pelo menos um palpite.",
    });
  }

  if (predictions.length > 50) {
    return res.status(400).json({
      error: "Você só pode salvar até 50 palpites por vez.",
    });
  }

  const normalizedPredictions = [];
  const matchIds = new Set();

  for (const [index, prediction] of predictions.entries()) {
    const matchIdNumber = validateId(prediction.match_id);

    if (!matchIdNumber) {
      return res.status(400).json({
        error: `match_id inválido no item ${index + 1}.`,
      });
    }

    if (matchIds.has(matchIdNumber)) {
      return res.status(400).json({
        error: `O jogo ${matchIdNumber} foi enviado mais de uma vez.`,
      });
    }

    matchIds.add(matchIdNumber);

    const scoreValidation = validatePredictionScores(
      prediction.predicted_home_score,
      prediction.predicted_away_score
    );

    if (!scoreValidation.valid) {
      return res.status(400).json({
        error: `Erro no jogo ${matchIdNumber}: ${scoreValidation.error}`,
      });
    }

    normalizedPredictions.push({
      match_id: matchIdNumber,
      predicted_home_score: scoreValidation.homeScore,
      predicted_away_score: scoreValidation.awayScore,
    });
  }

  try {
    const pool = await dbGet(
      `
        SELECT * FROM pools WHERE id = ?
      `,
      [poolIdNumber]
    );

    if (!pool) {
      return res.status(404).json({
        error: "Bolão não encontrado.",
      });
    }

    if (!isAdmin) {
      const membership = await dbGet(
        `
          SELECT * FROM pool_users
          WHERE user_id = ? AND pool_id = ?
        `,
        [userId, poolIdNumber]
      );

      if (!membership) {
        return res.status(403).json({
          error: "Usuário não participa deste bolão.",
        });
      }
    }

    await dbRun("BEGIN TRANSACTION");

    const results = [];

    for (const prediction of normalizedPredictions) {
      const match = await dbGet(
        `
          SELECT * FROM matches WHERE id = ?
        `,
        [prediction.match_id]
      );

      if (!match) {
        throw {
          status: 404,
          message: `Jogo ${prediction.match_id} não encontrado.`,
        };
      }

      const predictionStatus = canUserPredict(match);

      if (!predictionStatus.allowed) {
        throw {
          status: 403,
          message: `Jogo ${match.match_number || match.id}: ${predictionStatus.reason}`,
        };
      }

      const existingPrediction = await dbGet(
        `
          SELECT * FROM predictions
          WHERE user_id = ? AND match_id = ? AND pool_id = ?
        `,
        [userId, prediction.match_id, poolIdNumber]
      );

      if (existingPrediction) {
        await dbRun(
          `
            UPDATE predictions
            SET predicted_home_score = ?, predicted_away_score = ?, points = 0
            WHERE id = ?
          `,
          [
            prediction.predicted_home_score,
            prediction.predicted_away_score,
            existingPrediction.id,
          ]
        );

        results.push({
          match_id: prediction.match_id,
          prediction_id: existingPrediction.id,
          action: "updated",
        });
      } else {
        const insertResult = await dbRun(
          `
            INSERT INTO predictions
            (user_id, match_id, pool_id, predicted_home_score, predicted_away_score, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
          `,
          [
            userId,
            prediction.match_id,
            poolIdNumber,
            prediction.predicted_home_score,
            prediction.predicted_away_score,
          ]
        );

        results.push({
          match_id: prediction.match_id,
          prediction_id: insertResult.lastID,
          action: "created",
        });
      }
    }

    await dbRun("COMMIT");

    return res.json({
      message: "Palpites salvos com sucesso.",
      saved_count: results.length,
      results,
    });
  } catch (err) {
    try {
      await dbRun("ROLLBACK");
    } catch {
      // Ignora erro de rollback para não esconder o erro principal.
    }

    return res.status(err.status || 500).json({
      error: err.message || "Não foi possível salvar os palpites em lote.",
    });
  }
};

// Listar palpites
// Admin vê todos. Usuário comum vê apenas os próprios.
exports.getPredictions = (req, res) => {
  const { pool_id } = req.query;
  const userId = req.user.id;
  const isAdmin = isAdminUser(req);

  if (pool_id) {
    const poolIdNumber = validatePoolId(pool_id);

    if (!poolIdNumber) {
      return res.status(400).json({
        error: "pool_id inválido.",
      });
    }

    if (isAdmin) {
      return getDetailedPredictions(
        "WHERE predictions.pool_id = ?",
        [poolIdNumber],
        res
      );
    }

    return checkUserInPool(userId, poolIdNumber, (err, isMember) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!isMember) {
        return res.status(403).json({
          error: "Usuário não participa deste bolão.",
        });
      }

      return getDetailedPredictions(
        "WHERE predictions.pool_id = ? AND predictions.user_id = ?",
        [poolIdNumber, userId],
        res
      );
    });
  }

  if (isAdmin) {
    return getDetailedPredictions("", [], res);
  }

  return getDetailedPredictions(
    "WHERE predictions.user_id = ?",
    [userId],
    res
  );
};

// Listar meus palpites
exports.getMyPredictions = (req, res) => {
  const userId = req.user.id;
  const { pool_id } = req.query;

  if (pool_id) {
    const poolIdNumber = validatePoolId(pool_id);

    if (!poolIdNumber) {
      return res.status(400).json({
        error: "pool_id inválido.",
      });
    }

    return getDetailedPredictions(
      "WHERE predictions.user_id = ? AND predictions.pool_id = ?",
      [userId, poolIdNumber],
      res
    );
  }

  return getDetailedPredictions(
    "WHERE predictions.user_id = ?",
    [userId],
    res
  );
};

// Editar palpite usando o usuário logado
exports.updatePrediction = (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  const isAdmin = isAdminUser(req);

  const { predicted_home_score, predicted_away_score } = req.body;

  const predictionIdNumber = validateId(id);

  if (!predictionIdNumber) {
    return res.status(400).json({
      error: "id do palpite inválido.",
    });
  }

  if (
    predicted_home_score === undefined ||
    predicted_away_score === undefined
  ) {
    return res.status(400).json({
      error: "predicted_home_score e predicted_away_score são obrigatórios.",
    });
  }

  const scoreValidation = validatePredictionScores(
    predicted_home_score,
    predicted_away_score
  );

  if (!scoreValidation.valid) {
    return res.status(400).json({
      error: scoreValidation.error,
    });
  }

  const getPredictionQuery = `
    SELECT * FROM predictions WHERE id = ?
  `;

  db.get(getPredictionQuery, [predictionIdNumber], (err, prediction) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!prediction) {
      return res.status(404).json({
        error: "Palpite não encontrado.",
      });
    }

    if (!isAdmin && prediction.user_id !== user_id) {
      return res.status(403).json({
        error: "Você não tem permissão para editar este palpite.",
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
          error: "Jogo não encontrado.",
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
        [
          scoreValidation.homeScore,
          scoreValidation.awayScore,
          predictionIdNumber,
        ],
        function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          return res.json({
            message: "Palpite atualizado com sucesso.",
          });
        }
      );
    });
  });
};