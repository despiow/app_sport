require('dotenv/config');
const mysql = require('mysql2/promise');

function required(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

function createPool() {
  return mysql.createPool({
    host:     required('DB_HOST'),
    user:     required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
    port:     Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    timezone: 'Z',
    decimalNumbers: true,
  });
}

module.exports = { createPool };
