// scripts/test-firestore-sanitizer.mjs
import assert from 'assert';
import { sanitizeFirestoreData } from '../src/utils/helpers.js';

console.log('\n== 1. Sanitización de Datos para Firestore (sanitizeFirestoreData) ==');

// Test 1: undefined se convierte en null
assert.strictEqual(sanitizeFirestoreData(undefined), null, 'undefined debe convertirse a null');
console.log('  OK  undefined se convierte en null');

// Test 2: Primitivos se preservan intactos
assert.strictEqual(sanitizeFirestoreData('hello'), 'hello');
assert.strictEqual(sanitizeFirestoreData(42), 42);
assert.strictEqual(sanitizeFirestoreData(0), 0);
assert.strictEqual(sanitizeFirestoreData(false), false);
assert.strictEqual(sanitizeFirestoreData(true), true);
assert.strictEqual(sanitizeFirestoreData(null), null);
console.log('  OK  Primitivos (strings, números, booleanos, null) se preservan intactos');

// Test 3: Arrays con undefined convierten elementos undefined en null
const arr = [1, undefined, 'dos', null, [undefined, 3]];
const cleanArr = sanitizeFirestoreData(arr);
assert.deepStrictEqual(cleanArr, [1, null, 'dos', null, [null, 3]], 'Elementos undefined en arrays deben ser null');
console.log('  OK  Arrays con elementos undefined se convierten a null sin perder longitud');

// Test 4: Objetos con propiedades undefined convierten valores a null
const obj = {
  a: 'test',
  b: undefined,
  score: 5.0,
  answers: {
    0: 'answer1',
    1: undefined,
    2: { nested: undefined, valid: true }
  }
};
const cleanObj = sanitizeFirestoreData(obj);
assert.strictEqual(cleanObj.b, null, 'Propiedad con undefined debe ser null');
assert.strictEqual(cleanObj.answers[1], null, 'Respuesta con undefined debe ser null');
assert.strictEqual(cleanObj.answers[2].nested, null, 'Propiedad anidada undefined debe ser null');
assert.strictEqual(cleanObj.answers[2].valid, true, 'Propiedad anidada válida debe conservarse');
console.log('  OK  Objetos y respuestas de evaluaciones sustituyen undefined por null recursivamente');

// Test 5: Funciones se omiten en objetos y se convierten a null fuera de ellos
const withFn = {
  name: 'test',
  callback: () => {},
  answers: [() => {}]
};
const cleanWithFn = sanitizeFirestoreData(withFn);
assert.strictEqual(cleanWithFn.callback, undefined, 'Funciones en objetos deben omitirse de las claves');
assert.strictEqual(cleanWithFn.answers[0], null, 'Funciones en arrays deben convertirse a null');
console.log('  OK  Funciones se depuran de los objetos sin romper el payload');

// Test 6: Fechas e instancias especiales de Firestore se preservan
const d = new Date();
assert.strictEqual(sanitizeFirestoreData(d), d, 'Instancias de Date deben preservarse');
const fakeTimestamp = { toDate: () => d, toMillis: () => d.getTime(), seconds: 123456 };
assert.strictEqual(sanitizeFirestoreData(fakeTimestamp), fakeTimestamp, 'Objetos Firestore Timestamp deben preservarse');
const fakeFieldValue = { _methodName: 'serverTimestamp' };
assert.strictEqual(sanitizeFirestoreData(fakeFieldValue), fakeFieldValue, 'Firestore FieldValue debe preservarse');
console.log('  OK  Instancias de Date, Timestamp y FieldValue de Firestore se preservan intactas');

// Test 7: Prevención de bucles infinitos por referencias circulares
const circular = { a: 1 };
circular.self = circular;
const cleanCirc = sanitizeFirestoreData(circular);
assert.strictEqual(cleanCirc.a, 1);
assert.strictEqual(cleanCirc.self, null, 'Referencia circular debe romperse asignando null');
console.log('  OK  Referencias circulares se mitigan asignando null sin causar StackOverflow');

console.log('\n========================================');
console.log('Total pruebas Saneador Firestore: 7 | OK: 7 | FAIL: 0');
console.log('========================================\n');
