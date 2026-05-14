require("dotenv").config();

const jwt = require("jsonwebtoken");
const db = require("../database/database");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_bolao_copa_sti";

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Token não informado.",
    });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      error: "Formato do token inválido.",
    });
  }

  const token = parts[1];

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(401).json({
        error: "Token inválido ou expirado.",
      });
    }

    req.user = {
      id: decodedUser.id,
      email: decodedUser.email,
      is_admin: Number(decodedUser.is_admin) === 1 ? 1 : 0,
    };

    next();
  });
}

function authorizeAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "Usuário não autenticado.",
    });
  }

  const query = `
    SELECT id, is_admin
    FROM users
    WHERE id = ?
  `;

  db.get(query, [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({
        error: err.message,
      });
    }

    if (!user) {
      return res.status(404).json({
        error: "Usuário não encontrado.",
      });
    }

    const isAdmin = Number(user.is_admin) === 1;

    if (!isAdmin) {
      return res.status(403).json({
        error: "Acesso negado. Apenas administradores podem executar esta ação.",
      });
    }

    req.user.is_admin = 1;

    next();
  });
}

module.exports = {
  authenticateToken,
  authorizeAdmin,
};