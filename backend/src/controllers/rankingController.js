const db = require("../database/database");

function isAdminUser(req) {
  return Number(req.user?.is_admin) === 1;
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

// Ranking global antigo
exports.getRanking = (req, res) => {
  const query = `
    SELECT 
      users.id,
      users.name,
      users.email,
      COALESCE(SUM(predictions.points), 0) AS total_points
    FROM users
    LEFT JOIN predictions ON users.id = predictions.user_id
    GROUP BY users.id
    ORDER BY total_points DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.json(rows);
  });
};

// Ranking por bolão
exports.getRankingByPool = (req, res) => {
  const { poolId } = req.params;
  const poolIdNumber = Number(poolId);
  const userId = req.user.id;
  const isAdmin = isAdminUser(req);

  if (!poolId || Number.isNaN(poolIdNumber)) {
    return res.status(400).json({
      error: "poolId inválido.",
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

    const buildRanking = () => {
      const rankingQuery = `
        SELECT
          users.id,
          users.name,
          users.email,
          COALESCE(SUM(predictions.points), 0) AS total_points
        FROM pool_users
        INNER JOIN users ON users.id = pool_users.user_id
        LEFT JOIN predictions
          ON predictions.user_id = users.id
          AND predictions.pool_id = pool_users.pool_id
        WHERE pool_users.pool_id = ?
        GROUP BY users.id
        ORDER BY total_points DESC
      `;

      db.all(rankingQuery, [poolIdNumber], (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        return res.json({
          pool: {
            id: pool.id,
            name: pool.name,
            code: pool.code,
          },
          ranking: rows,
        });
      });
    };

    if (isAdmin) {
      return buildRanking();
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

      return buildRanking();
    });
  });
};