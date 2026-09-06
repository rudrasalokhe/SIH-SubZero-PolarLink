const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;
const DEFAULT_JWT_SECRET = 'polarlink-secret-key-2026-super-secure';

/**
 * Hash a plain text password using bcrypt
 * @param {string} plain 
 * @returns {Promise<string>}
 */
async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compare plain text password with stored bcrypt hash
 * @param {string} plain 
 * @param {string} hash 
 * @returns {Promise<boolean>}
 */
async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Generate a 12-hour signed JWT for a personnel document
 * @param {object} personnelDoc 
 * @returns {string}
 */
function generateToken(personnelDoc) {
  const secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  const payload = {
    personnelId: personnelDoc.personnelId,
    name: personnelDoc.name,
    role: personnelDoc.role,
    email: personnelDoc.email,
  };
  return jwt.sign(payload, secret, { expiresIn: '12h' });
}

/**
 * Verify and decode a JWT
 * @param {string} token 
 * @returns {object}
 */
function verifyToken(token) {
  const secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  return jwt.verify(token, secret);
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
};
