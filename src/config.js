'use strict';
require('./env');

const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(value));
}

const config = {
  root: ROOT,
  port: Number(process.env.PORT) || 3000,
  exportDir: path.resolve(ROOT, process.env.EXPORT_DIR || 'exports'),
  db: {
    server: process.env.DB_SERVER || 'localhost',
    port: Number(process.env.DB_PORT) || 1433,
    database: process.env.DB_NAME || 'CarWeb',
    user: process.env.DB_USER || 'carweb_app',
    password: process.env.DB_PASSWORD || '',
    options: {
      encrypt: bool(process.env.DB_ENCRYPT, false),
      trustServerCertificate: bool(process.env.DB_TRUST_SERVER_CERTIFICATE, true),
      enableArithAbort: true,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  },
};

module.exports = config;
