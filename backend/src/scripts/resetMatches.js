const db = require("../database/database");

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

async function resetMatches() {
  try {
    console.log("Iniciando limpeza de jogos e palpites...");

    await run("DELETE FROM predictions");
    console.log("Palpites apagados.");

    await run("DELETE FROM matches");
    console.log("Jogos apagados.");

    await run("DELETE FROM sqlite_sequence WHERE name = 'predictions'");
    await run("DELETE FROM sqlite_sequence WHERE name = 'matches'");
    console.log("Sequências de IDs resetadas.");

    console.log("Limpeza concluída com sucesso.");
  } catch (error) {
    console.error("Erro ao limpar jogos:", error.message);
  } finally {
    db.close();
  }
}

resetMatches();