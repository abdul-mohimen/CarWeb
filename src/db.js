'use strict';

const sql = require('mssql');
const config = require('./config');

let poolPromise = null;

/** Returns a shared connection pool (created on first use). */
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool({ ...config.db, server: config.db.server })
      .connect()
      .catch((err) => {
        poolPromise = null; // allow retry on next call
        throw err;
      });
  }
  return poolPromise;
}

async function closePool() {
  if (poolPromise) {
    const pool = await poolPromise;
    poolPromise = null;
    await pool.close();
  }
}

module.exports = { sql, getPool, closePool };
