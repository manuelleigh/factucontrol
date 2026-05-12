const bcrypt = require("bcrypt");
const { User } = require("../models");
const { createHttpError } = require("../utils/httpError");
const { ROLES } = require("../utils/constants");

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function serializeUser(user) {
  if (!user) return null;
  const plain = user.get ? user.get({ plain: true }) : user;
  return {
    id: plain.id,
    name: plain.name,
    email: plain.email,
    role: plain.role,
    active: plain.active,
  };
}

async function findUserByEmail(email) {
  return User.findOne({
    where: { email: normalizeEmail(email) },
  });
}

async function authenticateUser(email, password) {
  const user = await findUserByEmail(email);
  if (!user || !user.active) {
    throw createHttpError(401, "Credenciales invalidas.");
  }

  const blockedUntil = user.blockedUntil || user.bloqueadoHasta;
  if (blockedUntil && new Date(blockedUntil) > new Date()) {
    throw createHttpError(
      429,
      "Tu usuario esta bloqueado temporalmente. Intenta mas tarde.",
    );
  }

  const matches = await bcrypt.compare(
    String(password || ""),
    user.passwordHash,
  );
  if (!matches) {
    const attempts =
      Number(user.failedAttempts || user.intentosFallidos || 0) + 1;
    const updates = { failedAttempts: attempts };
    if (attempts >= 5) {
      updates.blockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      updates.failedAttempts = 0;
    }
    await user.update(updates);
    if (updates.blockedUntil) {
      throw createHttpError(
        429,
        "Has superado el limite de intentos. Usuario bloqueado por 15 minutos.",
      );
    }
    throw createHttpError(401, "Credenciales invalidas.");
  }

  await user.update({
    lastLoginAt: new Date(),
    failedAttempts: 0,
    blockedUntil: null,
  });
  return serializeUser(user);
}

async function ensureDefaultAdminUser() {
  const name = process.env.ADMIN_NAME || "Administrador";
  const email = normalizeEmail(process.env.ADMIN_EMAIL || "admin@gestpyme.pe");
  const password = process.env.ADMIN_PASSWORD || "GestPyme123!";
  const passwordHash = await bcrypt.hash(password, 10);
  const role = ROLES.includes(process.env.ADMIN_ROLE)
    ? process.env.ADMIN_ROLE
    : "admin";

  const existingByEmail = await User.findOne({ where: { email } });
  if (existingByEmail) {
    await existingByEmail.update({
      name,
      passwordHash,
      role,
      active: true,
    });
    return {
      user: serializeUser(existingByEmail),
      password,
    };
  }

  const existingAdmin = await User.findOne({ where: { role: 'admin' }, order: [['id', 'ASC']] });
  if (existingAdmin) {
    await existingAdmin.update({
      name,
      email,
      passwordHash,
      role: 'admin',
      active: true,
    });
    return {
      user: serializeUser(existingAdmin),
      password,
    };
  }

  const count = await User.count();
  if (count > 0) return null;

  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    active: true,
  });

  return {
    user: serializeUser(user),
    password,
  };
}

module.exports = {
  authenticateUser,
  ensureDefaultAdminUser,
  findUserByEmail,
  normalizeEmail,
  serializeUser,
};
