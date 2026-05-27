require("dotenv").config();

const bcrypt = require("bcryptjs");

const db = require("../database/database");
const matches = require("../data/matches2026.json");

const ALLOWED_STATUSES = [
  "scheduled",
  "postponed",
  "live",
  "finished",
  "cancelled",
];

function run(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject(err);
        return;
      }

      resolve(this);
    });
  });
}

function get(query, params = []) {
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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validateMatch(match, index) {
  const requiredFields = [
    "match_number",
    "home_team",
    "away_team",
    "match_date",
    "group_name",
  ];

  for (const field of requiredFields) {
    if (
      match[field] === undefined ||
      match[field] === null ||
      match[field] === ""
    ) {
      throw new Error(
        `Jogo na posição ${index} está sem o campo obrigatório: ${field}`
      );
    }
  }

  const matchNumber = Number(match.match_number);

  if (!Number.isInteger(matchNumber) || matchNumber <= 0) {
    throw new Error(`Jogo na posição ${index} possui match_number inválido.`);
  }

  const status = match.status ? String(match.status).trim() : "scheduled";

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error(
      `Jogo ${matchNumber} possui status inválido. Use: ${ALLOWED_STATUSES.join(
        ", "
      )}`
    );
  }

  return {
    match_number: matchNumber,
    home_team: String(match.home_team).trim(),
    away_team: String(match.away_team).trim(),
    match_date: String(match.match_date).trim(),
    group_name: String(match.group_name).trim().toUpperCase(),
    status,
    home_score:
      match.home_score === undefined || match.home_score === null
        ? null
        : Number(match.home_score),
    away_score:
      match.away_score === undefined || match.away_score === null
        ? null
        : Number(match.away_score),
  };
}

async function createTables() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      is_admin INTEGER DEFAULT 0
    )
  `);

  await run(`
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

  await run(`
    CREATE TABLE IF NOT EXISTS pools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      created_by_admin_id INTEGER,
      created_at TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS pool_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pool_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT,
      UNIQUE(pool_id, user_id)
    )
  `);

  await run(`
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
}

async function runSafeMigrations() {
  const migrations = [
    {
      query: "ALTER TABLE matches ADD COLUMN match_number INTEGER",
      ignoredError: "duplicate column name",
    },
    {
      query: "ALTER TABLE matches ADD COLUMN status TEXT DEFAULT 'scheduled'",
      ignoredError: "duplicate column name",
    },
    {
      query: "ALTER TABLE predictions ADD COLUMN points INTEGER DEFAULT 0",
      ignoredError: "duplicate column name",
    },
    {
      query: "ALTER TABLE predictions ADD COLUMN pool_id INTEGER",
      ignoredError: "duplicate column name",
    },
    {
      query: "ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0",
      ignoredError: "duplicate column name",
    },
  ];

  for (const migration of migrations) {
    try {
      await run(migration.query);
    } catch (error) {
      if (!error.message.includes(migration.ignoredError)) {
        throw error;
      }
    }
  }

  await run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_match_number
    ON matches(match_number)
  `);
}

async function getMatchesCount() {
  const row = await get(`
    SELECT COUNT(*) AS total
    FROM matches
  `);

  return Number(row?.total || 0);
}

async function insertMatch(match) {
  await run(
    `
      INSERT INTO matches
      (
        match_number,
        home_team,
        away_team,
        match_date,
        group_name,
        status,
        home_score,
        away_score
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      match.match_number,
      match.home_team,
      match.away_team,
      match.match_date,
      match.group_name,
      match.status,
      match.home_score,
      match.away_score,
    ]
  );
}

async function seedMatchesIfEmpty() {
  const matchesCount = await getMatchesCount();

  if (matchesCount > 0) {
    console.log(
      `Banco já possui ${matchesCount} jogos. Importação automática ignorada.`
    );
    return;
  }

  if (!Array.isArray(matches)) {
    throw new Error("matches2026.json precisa conter um array de jogos.");
  }

  if (matches.length === 0) {
    console.log("matches2026.json está vazio. Nenhum jogo foi importado.");
    return;
  }

  const validatedMatches = matches
    .map((match, index) => validateMatch(match, index))
    .sort((a, b) => a.match_number - b.match_number);

  for (const match of validatedMatches) {
    await insertMatch(match);
  }

  console.log(`${validatedMatches.length} jogos importados no banco.`);
}

async function createOrUpdateInitialAdmin() {
  const adminName = String(process.env.ADMIN_NAME || "Admin STI").trim();
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  const adminPassword = String(process.env.ADMIN_PASSWORD || "").trim();

  if (!adminEmail || !adminPassword) {
    console.log(
      "Admin inicial não configurado. Defina ADMIN_EMAIL e ADMIN_PASSWORD para criar/promover um admin automaticamente."
    );
    return;
  }

  const existingUser = await get(
    `
      SELECT id, name, email, is_admin
      FROM users
      WHERE email = ?
    `,
    [adminEmail]
  );

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  if (!existingUser) {
    await run(
      `
        INSERT INTO users (name, email, password, is_admin)
        VALUES (?, ?, ?, 1)
      `,
      [adminName, adminEmail, hashedPassword]
    );

    console.log(`Admin inicial criado com sucesso: ${adminEmail}`);
    return;
  }

  await run(
    `
      UPDATE users
      SET name = ?,
          password = ?,
          is_admin = 1
      WHERE id = ?
    `,
    [adminName || existingUser.name, hashedPassword, existingUser.id]
  );

  console.log(`Usuário promovido/atualizado como admin: ${adminEmail}`);
}

async function setupProductionDatabase() {
  try {
    console.log("Preparando banco de dados...");

    await createTables();
    await runSafeMigrations();
    await seedMatchesIfEmpty();
    await createOrUpdateInitialAdmin();

    console.log("Banco de dados pronto.");
  } catch (error) {
    console.error("Erro ao preparar banco de dados:", error.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

setupProductionDatabase();