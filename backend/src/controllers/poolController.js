const db = require("../database/database");

function normalizeCode(code) {
  return String(code).trim().toUpperCase();
}

function isValidId(id) {
  const numberId = Number(id);
  return !Number.isNaN(numberId) && numberId > 0;
}

// Criar bolão
exports.createPool = (req, res) => {
  const { name, code } = req.body;
  const adminId = req.user.id;

  if (!name || !code) {
    return res.status(400).json({
      error: "name e code são obrigatórios.",
    });
  }

  const normalizedCode = normalizeCode(code);

  const insertPoolQuery = `
    INSERT INTO pools (name, code, created_by_admin_id, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `;

  db.run(insertPoolQuery, [name, normalizedCode, adminId], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(409).json({
          error: "Já existe um bolão com este código.",
        });
      }

      return res.status(500).json({ error: err.message });
    }

    return res.status(201).json({
      message: "Bolão criado com sucesso.",
      pool: {
        id: this.lastID,
        name,
        code: normalizedCode,
        created_by_admin_id: adminId,
      },
    });
  });
};

// Usuário entrar em bolão por código
exports.joinPoolByCode = (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;

  if (!code) {
    return res.status(400).json({
      error: "code é obrigatório.",
    });
  }

  const normalizedCode = normalizeCode(code);

  const findPoolQuery = `
    SELECT * FROM pools WHERE code = ?
  `;

  db.get(findPoolQuery, [normalizedCode], (err, pool) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!pool) {
      return res.status(404).json({
        error: "Bolão não encontrado.",
      });
    }

    const insertPoolUserQuery = `
      INSERT INTO pool_users (pool_id, user_id, created_at)
      VALUES (?, ?, datetime('now'))
    `;

    db.run(insertPoolUserQuery, [pool.id, userId], function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res.status(409).json({
            error: "Usuário já participa deste bolão.",
            poolId: pool.id,
          });
        }

        return res.status(500).json({ error: err.message });
      }

      return res.status(201).json({
        message: "Usuário entrou no bolão com sucesso.",
        pool: {
          id: pool.id,
          name: pool.name,
          code: pool.code,
        },
      });
    });
  });
};

// Listar bolões do usuário logado
exports.getMyPools = (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT
      pools.id,
      pools.name,
      pools.code,
      pools.created_by_admin_id,
      pools.created_at
    FROM pool_users
    INNER JOIN pools ON pools.id = pool_users.pool_id
    WHERE pool_users.user_id = ?
    ORDER BY pools.created_at DESC
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.json(rows);
  });
};

// Listar todos os bolões cadastrados
exports.getAllPools = (req, res) => {
  const query = `
    SELECT
      pools.id,
      pools.name,
      pools.code,
      pools.created_by_admin_id,
      pools.created_at,
      COUNT(pool_users.user_id) AS participants_count
    FROM pools
    LEFT JOIN pool_users ON pool_users.pool_id = pools.id
    GROUP BY pools.id
    ORDER BY pools.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.json(rows);
  });
};

// Listar participantes de um bolão
exports.getPoolUsers = (req, res) => {
  const { poolId } = req.params;

  if (!isValidId(poolId)) {
    return res.status(400).json({
      error: "poolId inválido.",
    });
  }

  const getPoolQuery = `
    SELECT * FROM pools WHERE id = ?
  `;

  db.get(getPoolQuery, [poolId], (err, pool) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!pool) {
      return res.status(404).json({
        error: "Bolão não encontrado.",
      });
    }

    const query = `
      SELECT
        users.id,
        users.name,
        users.email,
        users.is_admin,
        pool_users.created_at AS joined_at
      FROM pool_users
      INNER JOIN users ON users.id = pool_users.user_id
      WHERE pool_users.pool_id = ?
      ORDER BY pool_users.created_at ASC
    `;

    db.all(query, [poolId], (err, users) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      return res.json({
        pool: {
          id: pool.id,
          name: pool.name,
          code: pool.code,
        },
        participants: users,
      });
    });
  });
};

// Remover usuário de um bolão
exports.removeUserFromPool = (req, res) => {
  const { poolId, userId } = req.params;

  if (!isValidId(poolId) || !isValidId(userId)) {
    return res.status(400).json({
      error: "poolId e userId devem ser válidos.",
    });
  }

  const getMembershipQuery = `
    SELECT * FROM pool_users
    WHERE pool_id = ? AND user_id = ?
  `;

  db.get(getMembershipQuery, [poolId, userId], (err, membership) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!membership) {
      return res.status(404).json({
        error: "Usuário não participa deste bolão.",
      });
    }

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      const deletePredictionsQuery = `
        DELETE FROM predictions
        WHERE pool_id = ? AND user_id = ?
      `;

      db.run(deletePredictionsQuery, [poolId, userId], (err) => {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({ error: err.message });
        }

        const deleteMembershipQuery = `
          DELETE FROM pool_users
          WHERE pool_id = ? AND user_id = ?
        `;

        db.run(deleteMembershipQuery, [poolId, userId], function (err) {
          if (err) {
            db.run("ROLLBACK");
            return res.status(500).json({ error: err.message });
          }

          db.run("COMMIT", (err) => {
            if (err) {
              db.run("ROLLBACK");
              return res.status(500).json({ error: err.message });
            }

            return res.json({
              message: "Usuário removido do bolão com sucesso.",
            });
          });
        });
      });
    });
  });
};

// Excluir bolão
exports.deletePool = (req, res) => {
  const { poolId } = req.params;

  if (!isValidId(poolId)) {
    return res.status(400).json({
      error: "poolId inválido.",
    });
  }

  const getPoolQuery = `
    SELECT * FROM pools WHERE id = ?
  `;

  db.get(getPoolQuery, [poolId], (err, pool) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!pool) {
      return res.status(404).json({
        error: "Bolão não encontrado.",
      });
    }

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      const deletePredictionsQuery = `
        DELETE FROM predictions
        WHERE pool_id = ?
      `;

      db.run(deletePredictionsQuery, [poolId], (err) => {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({ error: err.message });
        }

        const deletePoolUsersQuery = `
          DELETE FROM pool_users
          WHERE pool_id = ?
        `;

        db.run(deletePoolUsersQuery, [poolId], (err) => {
          if (err) {
            db.run("ROLLBACK");
            return res.status(500).json({ error: err.message });
          }

          const deletePoolQuery = `
            DELETE FROM pools
            WHERE id = ?
          `;

          db.run(deletePoolQuery, [poolId], function (err) {
            if (err) {
              db.run("ROLLBACK");
              return res.status(500).json({ error: err.message });
            }

            db.run("COMMIT", (err) => {
              if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
              }

              return res.json({
                message: "Bolão excluído com sucesso.",
              });
            });
          });
        });
      });
    });
  });
};