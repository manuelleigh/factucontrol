const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { createHttpError } = require('../utils/httpError');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function serializeUser(user) {
  if (!user) return null;
  const plain = user.get ? user.get({ plain: true }) : user;
  return {
    id: plain.id,
    name: plain.name,
    email: plain.email,
    role: plain.role,
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
    throw createHttpError(401, 'Credenciales inválidas.');
  }

  const matches = await bcrypt.compare(String(password || ''), user.passwordHash);
  if (!matches) {
    throw createHttpError(401, 'Credenciales inválidas.');
  }

  await user.update({ lastLoginAt: new Date() });
  return serializeUser(user);
}

async function ensureDefaultAdminUser() {
  const count = await User.count();
  if (count > 0) return null;

  const name = process.env.ADMIN_NAME || 'Administrador';
  const email = normalizeEmail(process.env.ADMIN_EMAIL || 'admin@factucontrol.local');
  const password = process.env.ADMIN_PASSWORD || 'Admin1234!';
  const passwordHash = await bcrypt.hash(password, 10);
  const role = process.env.ADMIN_ROLE || 'admin';

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
