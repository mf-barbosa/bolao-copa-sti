require("dotenv").config();

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

function resolveDatabasePath() {
  const configuredPath = process.env.DATABASE_PATH;

  if (!configuredPath) {
    return path.resolve(__dirname, "../../database.sqlite");
  }

  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  return path.resolve(process.cwd(), configuredPath);
}

const dbPath = resolveDatabasePath();

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Erro ao conectar no banco:", err);
  } else {
    console.log(`Conectado ao banco SQLite em: ${dbPath}`);
  }
});

module.exports = db;