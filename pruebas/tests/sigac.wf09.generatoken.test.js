// sigac.wf09.generatoken.test.js
//
// pruebas unitarias del nodo Genera token de WF-09, en la ruta
// recepcionista_agregar. genera el token de la persona: 32 bytes aleatorios en
// hexadecimal y su huella sha-256. a la base solo va la huella; el
// token en claro viaja una sola vez, en la respuesta.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-GTK09-NN

'use strict';

const generaToken = require('../nodos/wf09_genera_token.js');
const { ejecutar, sha256 } = require('../simulacion.js');

const DESDE_VALIDA = { valido: true, ruta: 'recepcionista_agregar', id: 3, nombre: 'Rosa' };
const generar = (entrada = DESDE_VALIDA) => ejecutar(generaToken, { entrada: [entrada] });
const salidaDe = entrada => generar(entrada).salida[0].json;

describe('WF-09 · Genera token', () => {
  test('UT-GTK09-01 · el token tiene 64 caracteres hexadecimales (32 bytes)', () => {
    expect(salidaDe().token).toMatch(/^[0-9a-f]{64}$/);
  });

  test('UT-GTK09-02 · la huella es el sha-256 del token', () => {
    const salida = salidaDe();
    expect(salida.token_hash).toBe(sha256(salida.token));
  });

  test('UT-GTK09-03 · la huella tiene 64 caracteres hexadecimales', () => {
    expect(salidaDe().token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('UT-GTK09-04 · la huella es distinta del token', () => {
    const salida = salidaDe();
    expect(salida.token_hash).not.toBe(salida.token);
  });

  test('UT-GTK09-05 · dos ejecuciones dan tokens distintos', () => {
    expect(salidaDe().token).not.toBe(salidaDe().token);
  });

  test('UT-GTK09-06 · 100 tokens seguidos: ninguno se repite', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => salidaDe().token));
    expect(tokens.size).toBe(100);
  });

  test('UT-GTK09-07 · conserva los campos que traia de Valida datos', () => {
    const salida = salidaDe();
    expect(salida.ruta).toBe('recepcionista_agregar');
    expect(salida.id).toBe(3);
    expect(salida.nombre).toBe('Rosa');
  });

  test('UT-GTK09-08 · un token que viniera en la entrada se reemplaza', () => {
    const salida = salidaDe({ ...DESDE_VALIDA, token: 'impuesto', token_hash: 'impuesto' });
    expect(salida.token).not.toBe('impuesto');
    expect(salida.token_hash).toBe(sha256(salida.token));
  });

  test('UT-GTK09-09 · entrada vacia: genera igual, sin error', () => {
    expect(salidaDe({}).token).toMatch(/^[0-9a-f]{64}$/);
  });

  test('UT-GTK09-10 · no consulta ningun nodo anterior (verify)', () => {
    expect(generar().$).not.toHaveBeenCalled();
  });

  test('UT-GTK09-11 · devuelve una lista con un solo item', () => {
    expect(generar().salida).toHaveLength(1);
  });
});
