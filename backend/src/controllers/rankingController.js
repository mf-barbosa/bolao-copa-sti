const db = require("../database/database");

// Listar ranking dos usuários
exports.getRanking = (req, res) => {
  const query = `
    SELECT 
      users.id,
      users.name,
      users.email AS username,
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