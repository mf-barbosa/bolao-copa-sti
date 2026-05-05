console.log("Iniciando criação do banco...");
const db = require("./database");

db.serialize(() => {
  // USERS
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT
    )
  `);

  // MATCHES
  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_team TEXT,
      away_team TEXT,
      match_date TEXT,
      group_name TEXT,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT DEFAULT 'scheduled'
    )
  `);

  // PREDICTIONS
  db.run(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      match_id INTEGER,
      predicted_home_score INTEGER,
      predicted_away_score INTEGER,
      points INTEGER DEFAULT 0,
      created_at TEXT
    )
  `);

  db.run(`
  ALTER TABLE predictions ADD COLUMN points INTEGER DEFAULT 0
`, (err) => {
  if (err && !err.message.includes("duplicate column name")) {
    console.error("Erro ao adicionar coluna points:", err.message);
  }
});

db.run(`
  ALTER TABLE matches ADD COLUMN status TEXT DEFAULT 'scheduled'
`, (err) => {
  if (err && !err.message.includes("duplicate column name")) {
    console.error("Erro ao adicionar coluna status:", err.message);
  }
});

  console.log("Tabelas criadas com sucesso!");
});