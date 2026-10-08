'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCar } = require('../src/cars');

const good = { make: 'Honda', model: 'Civic', year: '2019', price: '16900.5', mileage: '58000', color: 'Blue', vin: '2hgfc2f59kh501234' };

test('accepts a valid car and normalizes VIN to upper case', () => {
  const { errors, value } = validateCar(good);
  assert.deepEqual(errors, []);
  assert.equal(value.year, 2019);
  assert.equal(value.vin, '2HGFC2F59KH501234');
});

test('optional fields may be empty', () => {
  const { errors, value } = validateCar({ make: 'Ford', model: 'Ka', year: 2010 });
  assert.deepEqual(errors, []);
  assert.equal(value.price, null);
  assert.equal(value.vin, null);
});

test('rejects missing make/model and bad numbers', () => {
  const { errors } = validateCar({ make: '', model: '', year: 1500, price: -1, mileage: 1.5 });
  assert.equal(errors.length, 5);
});

test('VIN must be 17 chars without I, O or Q', () => {
  assert.equal(validateCar({ ...good, vin: 'SHORT' }).errors.length, 1);
  assert.equal(validateCar({ ...good, vin: 'IHGFC2F59KH501234' }).errors.length, 1);
});
