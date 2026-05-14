console.log("Iniciando criação do banco...");

const db = require("./database");

db.serialize(() => {
  // USERS
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      is_admin INTEGER DEFAULT 0
    )
  `);

  // MATCHES
  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_number INTEGER,
      home_team TEXT,
      away_team TEXT,
      match_date TEXT,
      group_name TEXT,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT DEFAULT 'scheduled'
    )
  `);

  // POOLS
  db.run(`
    CREATE TABLE IF NOT EXISTS pools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      created_by_admin_id INTEGER,
      created_at TEXT
    )
  `);

  // POOL_USERS
  db.run(`
    CREATE TABLE IF NOT EXISTS pool_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pool_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT,
      UNIQUE(pool_id, user_id)
    )
  `);

  // PREDICTIONS
  db.run(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      match_id INTEGER,
      pool_id INTEGER,
      predicted_home_score INTEGER,
      predicted_away_score INTEGER,
      points INTEGER DEFAULT 0,
      created_at TEXT
    )
  `);

  // MIGRAÇÕES SEGURAS PARA BANCOS ANTIGOS

  db.run(
    `
      ALTER TABLE matches ADD COLUMN match_number INTEGER
    `,
    (err) => {
      if (err && !err.message.includes("duplicate column name")) {
        console.error("Erro ao adicionar coluna match_number:", err.message);
      }
    }
  );

  db.run(
    `
      ALTER TABLE matches ADD COLUMN status TEXT DEFAULT 'scheduled'
    `,
    (err) => {
      if (err && !err.message.includes("duplicate column name")) {
        console.error("Erro ao adicionar coluna status:", err.message);
      }
    }
  );

  db.run(
    `
      ALTER TABLE predictions ADD COLUMN points INTEGER DEFAULT 0
    `,
    (err) => {
      if (err && !err.message.includes("duplicate column name")) {
        console.error("Erro ao adicionar coluna points:", err.message);
      }
    }
  );

  db.run(
    `
      ALTER TABLE predictions ADD COLUMN pool_id INTEGER
    `,
    (err) => {
      if (err && !err.message.includes("duplicate column name")) {
        console.error("Erro ao adicionar coluna pool_id:", err.message);
      }
    }
  );

  db.run(
    `
      ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0
    `,
    (err) => {
      if (err && !err.message.includes("duplicate column name")) {
        console.error("Erro ao adicionar coluna is_admin:", err.message);
      }
    }
  );

  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_match_number
    ON matches(match_number)
  `);

  console.log("Tabelas criadas com sucesso!");
});