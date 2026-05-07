require("dotenv").config();

const jwt = require("jsonwebtoken");

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

    req.user = decodedUser;
    next();
  });
}

function authorizeAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "Usuário não autenticado.",
    });
  }

  const isAdmin = Number(req.user.is_admin) === 1;

  if (!isAdmin) {
    return res.status(403).json({
      error: "Acesso negado. Apenas administradores podem executar esta ação.",
    });
  }

  next();
}

module.exports = {
  authenticateToken,
  authorizeAdmin,
};