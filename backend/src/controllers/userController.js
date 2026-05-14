require("dotenv").config();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../database/database");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_bolao_copa_sti";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function formatUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.email,
    is_admin: Number(user.is_admin) === 1 ? 1 : 0,
  };
}

// Criar usuário comum
exports.createUser = async (req, res) => {
  const { name, email, password } = req.body;

  const normalizedEmail = normalizeEmail(email);

  if (!name || !normalizedEmail || !password) {
    return res.status(400).json({
      error: "Nome, email e senha são obrigatórios.",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (name, email, password, is_admin)
      VALUES (?, ?, ?, 0)
    `;

    db.run(query, [name.trim(), normalizedEmail, hashedPassword], function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res.status(409).json({
            error: "Este email já está em uso.",
          });
        }

        return res.status(500).json({ error: err.message });
      }

      return res.status(201).json({
        message: "Usuário criado com sucesso",
        userId: this.lastID,
      });
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao criar usuário.",
    });
  }
};

// Login de usuário
exports.loginUser = (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(400).json({
      error: "Email e senha são obrigatórios.",
    });
  }

  const query = `
    SELECT * FROM users WHERE email = ?
  `;

  db.get(query, [normalizedEmail], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(401).json({
        error: "Email ou senha inválidos.",
      });
    }

    try {
      let passwordMatches = false;

      const isHashedPassword =
        user.password.startsWith("$2a$") ||
        user.password.startsWith("$2b$") ||
        user.password.startsWith("$2y$");

      if (isHashedPassword) {
        passwordMatches = await bcrypt.compare(password, user.password);
      } else {
        passwordMatches = password === user.password;

        if (passwordMatches) {
          const newHashedPassword = await bcrypt.hash(password, 10);

          db.run(
            `
              UPDATE users
              SET password = ?
              WHERE id = ?
            `,
            [newHashedPassword, user.id]
          );
        }
      }

      if (!passwordMatches) {
        return res.status(401).json({
          error: "Email ou senha inválidos.",
        });
      }

      const formattedUser = formatUserResponse(user);

      const token = jwt.sign(
        {
          id: formattedUser.id,
          email: formattedUser.email,
          is_admin: formattedUser.is_admin,
        },
        JWT_SECRET,
        {
          expiresIn: "1d",
        }
      );

      return res.json({
        message: "Login realizado com sucesso",
        token,
        user: formattedUser,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Erro ao realizar login.",
      });
    }
  });
};

// Retornar usuário logado
exports.getMe = (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT id, name, email, is_admin
    FROM users
    WHERE id = ?
  `;

  db.get(query, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(404).json({
        error: "Usuário não encontrado.",
      });
    }

    return res.json({
      user: formatUserResponse(user),
    });
  });
};

// Listar usuários — apenas admin
exports.getUsers = (req, res) => {
  const query = `
    SELECT
      id,
      name,
      email,
      email AS username,
      is_admin
    FROM users
    ORDER BY id ASC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const users = rows.map(formatUserResponse);

    return res.json(users);
  });
};