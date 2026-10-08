'use strict';

const { sql, getPool } = require('./db');

const SELECT_COLS = `Id, Make, Model, [Year], Price, Mileage, Color, Vin, CreatedAt`;

/** Validate and normalize user input. Returns { errors, value }. */
function validateCar(input = {}) {
  const errors = [];
  const str = (v) => (v === undefined || v === null ? '' : String(v).trim());
  const value = {
    make: str(input.make),
    model: str(input.model),
    year: Number(input.year),
    price: input.price === '' || input.price === undefined ? null : Number(input.price),
    mileage: input.mileage === '' || input.mileage === undefined ? null : Number(input.mileage),
    color: str(input.color) || null,
    vin: str(input.vin).toUpperCase() || null,
  };
  const thisYear = new Date().getUTCFullYear() + 1;

  if (!value.make || value.make.length > 50) errors.push('make is required (max 50 chars)');
  if (!value.model || value.model.length > 50) errors.push('model is required (max 50 chars)');
  if (!Number.isInteger(value.year) || value.year < 1886 || value.year > thisYear) {
    errors.push(`year must be an integer between 1886 and ${thisYear}`);
  }
  if (value.price !== null && (!Number.isFinite(value.price) || value.price < 0 || value.price > 9999999999.99)) {
    errors.push('price must be a number >= 0');
  }
  if (value.mileage !== null && (!Number.isInteger(value.mileage) || value.mileage < 0)) {
    errors.push('mileage must be a whole number >= 0');
  }
  if (value.color && value.color.length > 30) errors.push('color max 30 chars');
  if (value.vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(value.vin)) {
    errors.push('vin must be 17 characters (no I, O or Q)');
  }
  return { errors, value };
}

async function listCars() {
  const pool = await getPool();
  const result = await pool.request().query(`SELECT ${SELECT_COLS} FROM dbo.Cars ORDER BY Id`);
  return result.recordset;
}

async function createCar(v) {
  const pool = await getPool();
  const result = await pool.request()
    .input('make', sql.NVarChar(50), v.make)
    .input('model', sql.NVarChar(50), v.model)
    .input('year', sql.SmallInt, v.year)
    .input('price', sql.Decimal(12, 2), v.price)
    .input('mileage', sql.Int, v.mileage)
    .input('color', sql.NVarChar(30), v.color)
    .input('vin', sql.Char(17), v.vin)
    .query(`INSERT INTO dbo.Cars (Make, Model, [Year], Price, Mileage, Color, Vin)
            OUTPUT ${SELECT_COLS.split(', ').map((c) => 'inserted.' + c).join(', ')}
            VALUES (@make, @model, @year, @price, @mileage, @color, @vin);`);
  return result.recordset[0];
}

async function deleteCar(id) {
  const pool = await getPool();
  const result = await pool.request().input('id', sql.Int, id)
    .query('DELETE FROM dbo.Cars WHERE Id = @id; SELECT @@ROWCOUNT AS n;');
  return result.recordset[0].n > 0;
}

module.exports = { validateCar, listCars, createCar, deleteCar };
