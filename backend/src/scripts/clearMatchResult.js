const db = require("../database/database");

const matchNumber = Number(process.argv[2]);

if (!Number.isInteger(matchNumber) || matchNumber <= 0) {
  console.error("Informe um match_number válido.");
  console.log("Exemplo:");
  console.log("node src/scripts/clearMatchResult.js 1");
  process.exit(1);
}

function getMatchByNumber(matchNumber) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT id, match_number, home_team, away_team, home_score, away_score, status
      FROM matches
      WHERE match_number = ?
    `;

    db.get(query, [matchNumber], (err, match) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(match);
    });
  });
}

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

async function clearMatchResult() {
  try {
    const match = await getMatchByNumber(matchNumber);

    if (!match) {
      console.log(`Nenhum jogo encontrado com match_number ${matchNumber}.`);
      return;
    }

    console.log("Jogo encontrado:");
    console.log(
      `${match.match_number} - ${match.home_team} x ${match.away_team}`
    );

    await run(
      `
        UPDATE predictions
        SET points = 0
        WHERE match_id = ?
      `,
      [match.id]
    );

    await run(
      `
        UPDATE matches
        SET home_score = NULL,
            away_score = NULL,
            status = 'scheduled'
        WHERE id = ?
      `,
      [match.id]
    );

    const updatedMatch = await getMatchByNumber(matchNumber);

    console.log("Resultado removido com sucesso.");
    console.log("Jogo atualizado:");
    console.log(updatedMatch);
  } catch (error) {
    console.error("Erro ao remover resultado:", error.message);
  } finally {
    db.close();
  }
}

clearMatchResult();