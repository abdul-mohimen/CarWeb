'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCarsExportScript, toSqlLiteral, exportFileName } = require('../src/export');

test('escapes single quotes and uses N prefix', () => {
  assert.equal(toSqlLiteral("O'Brien"), "N'O''Brien'");
});

test('null/undefined become NULL and numbers stay numeric', () => {
  assert.equal(toSqlLiteral(null), 'NULL');
  assert.equal(toSqlLiteral(undefined), 'NULL');
  assert.equal(toSqlLiteral(18500.5), '18500.5');
});

test('rejects non-finite numbers', () => {
  assert.throws(() => toSqlLiteral(Number.NaN));
});

test('strips NUL characters', () => {
  assert.equal(toSqlLiteral('a\0b'), "N'ab'");
});

test('dates are emitted as ISO datetime2 literals', () => {
  assert.equal(toSqlLiteral(new Date('2026-10-08T09:30:00.000Z')), "'2026-10-08T09:30:00.000'");
});

test('builds a transactional script with identity insert', () => {
  const script = buildCarsExportScript([
    { Id: 1, Make: 'Ford', Model: "Fiesta's", Year: 2015, Price: 7000, Mileage: 90000, Color: null,
      Vin: '1FADP3F20FL000001', CreatedAt: new Date('2026-01-02T03:04:05Z') },
  ], { database: 'CarWeb', generatedAt: new Date('2026-10-08T00:00:00Z') });

  assert.match(script, /USE \[CarWeb\];/);
  assert.match(script, /BEGIN TRANSACTION;/);
  assert.match(script, /COMMIT TRANSACTION;/);
  assert.match(script, /SET IDENTITY_INSERT dbo\.Cars ON;/);
  assert.match(script, /VALUES \(1, N'Ford', N'Fiesta''s', 2015, 7000, 90000, NULL, N'1FADP3F20FL000001', '2026-01-02T03:04:05.000'\);/);
  assert.match(script, /Rows     : 1/);
});

test('empty export is still valid and says so', () => {
  const script = buildCarsExportScript([]);
  assert.match(script, /No rows to export/);
  assert.doesNotMatch(script, /IDENTITY_INSERT dbo\.Cars ON/);
});

test('file name is timestamped .sql', () => {
  assert.equal(exportFileName(new Date('2026-10-08T09:30:05Z')), 'carweb-export-20261008-093005.sql');
});
