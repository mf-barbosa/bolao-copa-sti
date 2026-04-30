const db = require("../database/database");

// Criar usuário
exports.createUser = (req, res) => {
  const { name, username, password, is_admin } = req.body;

  const query = `
    INSERT INTO users (name, email, password)
    VALUES (?, ?, ?)
  `;

  db.run(query, [name, username, password], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.status(201).json({
      message: "Usuário criado com sucesso",
      userId: this.lastID,
    });
  });
};

// Listar usuários
exports.getUsers = (req, res) => {
  const query = `
    SELECT id, name, email FROM users
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.json(rows);
  });
};