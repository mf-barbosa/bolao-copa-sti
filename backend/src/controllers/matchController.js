const db = require("../database/database");

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