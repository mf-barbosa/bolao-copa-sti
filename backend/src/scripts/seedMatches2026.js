const db = require("../database/database");
const matches = require("../data/matches2026.json");

const ALLOWED_STATUSES = ["scheduled", "postponed", "live", "finished", "cancelled"];

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
      `Jogo ${matchNumber} possui status inválido. Use: ${ALLOWED_STATUSES.join(", ")}`
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

function ensureMatchNumberColumn() {
  return new Promise((resolve, reject) => {
    db.run(
      `
        ALTER TABLE matches ADD COLUMN match_number INTEGER
      `,
      (err) => {
        if (err && !err.message.includes("duplicate column name")) {
          reject(err);
          return;
        }

        resolve();
      }
    );
  });
}

function ensureMatchNumberIndex() {
  return new Promise((resolve, reject) => {
    db.run(
      `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_match_number
        ON matches(match_number)
      `,
      (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      }
    );
  });
}

function upsertMatch(match) {
  return new Promise((resolve, reject) => {
    const query = `
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
      ON CONFLICT(match_number) DO UPDATE SET
        home_team = excluded.home_team,
        away_team = excluded.away_team,
        match_date = excluded.match_date,
        group_name = excluded.group_name,
        status = excluded.status,
        home_score = excluded.home_score,
        away_score = excluded.away_score
    `;

    db.run(
      query,
      [
        match.match_number,
        match.home_team,
        match.away_team,
        match.match_date,
        match.group_name,
        match.status,
        match.home_score,
        match.away_score,
      ],
      function (err) {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      }
    );
  });
}

async function seedMatches() {
  try {
    console.log("Iniciando importação dos jogos da Copa 2026...");

    if (!Array.isArray(matches)) {
      throw new Error("matches2026.json precisa conter um array de jogos.");
    }

    if (matches.length === 0) {
      console.log("matches2026.json está vazio. Nenhum jogo foi importado.");
      db.close();
      return;
    }

    await ensureMatchNumberColumn();
    await ensureMatchNumberIndex();

    const validatedMatches = matches.map((match, index) =>
      validateMatch(match, index)
    );

    const orderedMatches = validatedMatches.sort(
      (a, b) => a.match_number - b.match_number
    );

    for (const match of orderedMatches) {
      await upsertMatch(match);

      console.log(
        `Jogo ${match.match_number} importado/atualizado: ${match.home_team} x ${match.away_team}`
      );
    }

    console.log(
      `${orderedMatches.length} jogos importados/atualizados com sucesso.`
    );
  } catch (error) {
    console.error("Erro ao importar jogos:", error.message);
  } finally {
    db.close();
  }
}

seedMatches();