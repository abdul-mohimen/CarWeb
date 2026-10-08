'use strict';

const path = require('path');
require('./env');
const express = require('express');
const config = require('./config');
const { getPool, closePool } = require('./db');
const cars = require('./cars');
const { buildCarsExportScript, exportFileName } = require('./export');

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(config.root, 'public')));

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/api/health', wrap(async (req, res) => {
  await getPool();
  res.json({ status: 'ok', database: config.db.database });
}));

app.get('/api/cars', wrap(async (req, res) => {
  res.json(await cars.listCars());
}));

app.post('/api/cars', wrap(async (req, res) => {
  const { errors, value } = cars.validateCar(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const created = await cars.createCar(value);
  res.status(201).json(created);
}));

app.delete('/api/cars/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'invalid id' });
  const ok = await cars.deleteCar(id);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
}));

// Download the T-SQL export of dbo.Cars.
app.get('/api/export/sql', wrap(async (req, res) => {
  const rows = await cars.listCars();
  const script = buildCarsExportScript(rows, { database: config.db.database });
  const name = exportFileName();
  res.setHeader('Content-Type', 'application/sql; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  res.send(script);
}));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Database or server error', detail: process.env.NODE_ENV === 'production' ? undefined : err.message });
});

if (require.main === module) {
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`CarWeb running on http://localhost:${config.port}`);
  });
  const shutdown = async () => {
    server.close();
    await closePool().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
