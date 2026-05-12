const fs = require("fs");
const path = require("path");

const db = require("./database");

const matchesPath = path.join(__dirname, "../data/matches2026.json");

function readMatchesFile() {
  if (!fs.existsSync(matchesPath)) {
    throw new Error(`Arquivo não encontrado: ${matchesPath}`);
  }

  const fileContent = fs.readFileSync(matchesPath, "utf-8");
  const matches = JSON.parse(fileContent);

  if (!Array.isArray(matches)) {
    throw new Error("O arquivo matches2026.json precisa conter um array.");
  }

  return matches;
}

function validateMatch(match, index) {
  const requiredFields = [
    "match_number",
    "home_team",
    "away_team",
    "match_date",
    "group_name",
    "stage",
    "stadium",
    "city",
    "country",
  ];

  for (const field of requiredFields) {
    if (match[field] === undefined || match[field] === null || match[field] === "") {
      throw new Error(
        `Jogo na posição ${index} está sem o campo obrigatório: ${field}`
      );
    }
  }

  const matchNumber = Number(match.match_number);

  if (Number.isNaN(matchNumber)) {
    throw new Error(`match_number inválido no jogo da posição ${index}.`);
  }
}

function seedMatches(matches) {
  if (matches.length === 0) {
    console.log("Nenhum jogo encontrado em matches2026.json.");
    console.log("Arquivo preparado para receber os jogos reais da Copa 2026.");
    db.close();
    return;
  }

  console.log(`Iniciando importação de ${matches.length} jogo(s)...`);

  db.serialize(() => {
    const query = `
      INSERT INTO matches (
        match_number,
        home_team,
        away_team,
        match_date,
        group_name,
        stage,
        stadium,
        city,
        country,
        home_score,
        away_score,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)
      ON CONFLICT(match_number) DO UPDATE SET
        home_team = excluded.home_team,
        away_team = excluded.away_team,
        match_date = excluded.match_date,
        group_name = excluded.group_name,
        stage = excluded.stage,
        stadium = excluded.stadium,
        city = excluded.city,
        country = excluded.country,
        status = excluded.status
    `;

    const stmt = db.prepare(query);

    matches.forEach((match, index) => {
      validateMatch(match, index);

      stmt.run(
        [
          Number(match.match_number),
          match.home_team,
          match.away_team,
          match.match_date,
          match.group_name,
          match.stage,
          match.stadium,
          match.city,
          match.country,
          match.status || "scheduled",
        ],
        (err) => {
          if (err) {
            console.error(
              `Erro ao importar jogo ${match.match_number}:`,
              err.message
            );
          }
        }
      );
    });

    stmt.finalize((err) => {
      if (err) {
        console.error("Erro ao finalizar importação:", err.message);
        db.close();
        return;
      }

      console.log("Importação finalizada com sucesso.");
      db.close();
    });
  });
}

try {
  const matches = readMatchesFile();
  seedMatches(matches);
} catch (error) {
  console.error("Erro ao importar jogos:", error.message);
  db.close();
}