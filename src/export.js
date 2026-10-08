'use strict';

/**
 * Builds a T-SQL script that re-creates the Cars data on another SQL Server.
 * Pure functions only (no I/O) so they are easy to unit test.
 */

const COLUMNS = ['Id', 'Make', 'Model', 'Year', 'Price', 'Mileage', 'Color', 'Vin', 'CreatedAt'];

/** Convert a JS value to a safe T-SQL literal. */
function toSqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Non-finite number cannot be exported: ${value}`);
    return String(value);
  }
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return 'NULL';
    // ISO 8601 with 'T' is parsed unambiguously by datetime2 regardless of language/DATEFORMAT.
    return `'${value.toISOString().replace('Z', '')}'`;
  }
  // Strings: strip NUL chars (not allowed in T-SQL text) and escape single quotes.
  const text = String(value).replace(/\0/g, '');
  return `N'${text.replace(/'/g, "''")}'`;
}

/** Normalize a DB row (camelCase or PascalCase keys) to the export shape. */
function normalizeRow(row) {
  const get = (...keys) => {
    for (const k of keys) if (row[k] !== undefined) return row[k];
    return null;
  };
  return {
    Id: get('Id', 'id'),
    Make: get('Make', 'make'),
    Model: get('Model', 'model'),
    Year: get('Year', 'year'),
    Price: get('Price', 'price'),
    Mileage: get('Mileage', 'mileage'),
    Color: get('Color', 'color'),
    Vin: get('Vin', 'vin'),
    CreatedAt: get('CreatedAt', 'createdAt', 'created_at'),
  };
}

/**
 * @param {Array<object>} rows  rows from the Cars table
 * @param {{ database?: string, generatedAt?: Date }} [opts]
 * @returns {string} T-SQL script
 */
function buildCarsExportScript(rows, opts = {}) {
  const database = opts.database || 'CarWeb';
  const generatedAt = opts.generatedAt || new Date();
  const lines = [];

  lines.push('-- ==========================================================');
  lines.push('-- CarWeb data export (Microsoft SQL Server / T-SQL)');
  lines.push(`-- Database : ${database}`);
  lines.push(`-- Generated: ${generatedAt.toISOString()}`);
  lines.push(`-- Rows     : ${rows.length}`);
  lines.push('-- Requires the dbo.Cars table (see sql/schema.sql).');
  lines.push('-- ==========================================================');
  lines.push('');
  lines.push(`USE [${database.replace(/]/g, ']]')}];`);
  lines.push('GO');
  lines.push('');
  lines.push('SET XACT_ABORT ON;');
  lines.push('BEGIN TRANSACTION;');
  lines.push('');
  lines.push('-- Replace existing data so the import is repeatable.');
  lines.push('DELETE FROM dbo.Cars;');
  lines.push('');

  if (rows.length > 0) {
    lines.push('SET IDENTITY_INSERT dbo.Cars ON;');
    const colList = COLUMNS.map((c) => `[${c}]`).join(', ');
    for (const raw of rows) {
      const r = normalizeRow(raw);
      const values = COLUMNS.map((c) => toSqlLiteral(r[c])).join(', ');
      lines.push(`INSERT INTO dbo.Cars (${colList}) VALUES (${values});`);
    }
    lines.push('SET IDENTITY_INSERT dbo.Cars OFF;');
  } else {
    lines.push('-- No rows to export.');
  }

  lines.push('');
  lines.push('COMMIT TRANSACTION;');
  lines.push('');
  return lines.join('\n');
}

/** Builds a timestamped file name, e.g. carweb-export-20261008-093000.sql */
function exportFileName(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}-` +
    `${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}`;
  return `carweb-export-${stamp}.sql`;
}

module.exports = { buildCarsExportScript, toSqlLiteral, exportFileName, normalizeRow, COLUMNS };
