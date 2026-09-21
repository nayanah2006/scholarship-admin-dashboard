#!/usr/bin/env node
// Seed a demo Government Officer account.
//
// Government Officers are intentionally NOT part of public signup — the public
// /api/auth/register endpoint only accepts STUDENT and INSTITUTION roles.
// Staff accounts are created operationally, and this script is that mechanism.
//
// Idempotent: if a user with the same email already exists the script does
// nothing and exits successfully, so it can be run any number of times.
//
// Demo credentials (change after first login):
//   Email:    govt_india@gmail.com
//   Password: govt@123
//   Role:     GOVERNMENT
//
// The password is hashed with the exact library and cost factor used by the
// application's registration flow (bcrypt, rounds = 12). The plain-text
// password is never stored or logged.

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const DEMO = {
  email: 'govt_india@gmail.com',
  password: 'govt@123',
  fullName: 'Government Officer',
  role: 'GOVERNMENT'
};

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'scholarship_admin'
  });

  try {
    const email = DEMO.email.toLowerCase();

    // 1) Check whether the account already exists (email is UNIQUE in users).
    const [rows] = await conn.query('SELECT id, email, role, full_name, is_active FROM users WHERE email = ? LIMIT 1', [email]);

    if (rows.length) {
      const existing = rows[0];
      if (existing.role === DEMO.role) {
        console.log(`Government Officer already exists: ${existing.email} (${existing.id}) — nothing to do.`);
        console.log('Seed OK (idempotent — no duplicate created).');
        return;
      }
      console.warn(`A user with email ${existing.email} already exists but has role '${existing.role}', not '${DEMO.role}'. Skipping — no account was created or modified.`);
      process.exitCode = 2;
      return;
    }

    // 2) Create the Government Officer with the same bcrypt hashing as the
    //    application's registration flow (bcrypt.hash(password, 12)).
    const passwordHash = await bcrypt.hash(DEMO.password, 12);

    await conn.query(
      'INSERT INTO users (id, email, password_hash, role, full_name) VALUES (?, ?, ?, ?, ?)',
      [randomUUID(), email, passwordHash, DEMO.role, DEMO.fullName]
    );

    console.log(`Created Government Officer: ${email} (role=${DEMO.role}).`);
    console.log('Seed OK.');
  } finally {
    await conn.end();
  }
})().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});