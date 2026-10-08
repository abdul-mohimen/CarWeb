#!/usr/bin/env node
'use strict';

/**
 * CLI: exports dbo.Cars from SQL Server to a .sql file and prints its full path.
 *
 * Usage:
 *   npm run export:mssql
 *   node scripts/export-mssql.js --out C:\backups\cars.sql
 */

const fs = require('fs');
const path = require('path');
require('../src/env'); // loads .env if present
const config = require('../src/config');
const { closePool, getPool } = require('../src/db');
const { buildCarsExportScript, exportFileName } = require('../src/export');

function parseArgs(argv) {
  const args = { out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out' || argv[i] === '-o') args.out = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/export-mssql.js [--out <file.sql>]');
    return;
  }

  const pool = await getPool();
  const { recordset: rows } = await pool.request().query(
    'SELECT Id, Make, Model, [Year], Price, Mileage, Color, Vin, CreatedAt FROM dbo.Cars ORDER BY Id'
  );

  const script = buildCarsExportScript(rows, { database: config.db.database });

  const target = args.out
    ? path.resolve(process.cwd(), args.out)
    : path.join(config.exportDir, exportFileName());

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, script, { encoding: 'utf8' });

  console.log(`Exported ${rows.length} row(s) from ${config.db.server}/${config.db.database}`);
  console.log(`Export file: ${target}`);
}

main()
  .catch((err) => {
    console.error('Export failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => closePool().catch(() => {}));
