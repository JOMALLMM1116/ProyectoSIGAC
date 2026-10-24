// sigac.hashdeltoken.test.js
//
// pruebas unitarias del nodo Hash del token. el nodo es identico en
// WF-01, WF-07, WF-08 y WF-09, asi que cada caso se prueba en las
// cuatro copias.
//
// tecnicas: particion de equivalencia, valores limite, cobertura de
// ramas (headers || {}, body || {}, token ? hash : centinela),
// propiedades del hash y contrato de salida.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-HASH-NN

'use strict';

const { ejecutar, sha256 } = require('../simulacion.js');

const COPIAS = {
  'WF-01': require('../nodos/wf01_hash_del_token.js'),
  'WF-07': require('../nodos/wf07_hash_del_token.js'),
  'WF-08': require('../nodos/wf08_hash_del_token.js'),
  'WF-09': require('../nodos/wf09_hash_del_token.js')
};

describe.each(Object.entries(COPIAS))('Hash del token · %s', (flujo, hashDelToken) => {
  // arma la peticion que entrega el Webhook y ejecuta el nodo
  const hash = peticion => ejecutar(hashDelToken, { entrada: [peticion] }).salida;

  test('UT-HASH-01 · con token: calcula su huella sha-256', () => {
    const salida = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    expect(salida[0].json.token_hash).toBe(sha256('abc'));
    expect(salida[0].json.tiene_token).toBe(true);
  });

  test('UT-HASH-02 · sin cabecera de token: centinela sin-token', () => {
    const salida = hash({ headers: {}, body: {} });
    expect(salida[0].json.token_hash).toBe('sin-token');
    expect(salida[0].json.tiene_token).toBe(false);
  });

  test('UT-HASH-03 · token vacio: centinela sin-token', () => {
    const salida = hash({ headers: { 'x-sigac-token': '' }, body: {} });
    expect(salida[0].json.token_hash).toBe('sin-token');
    expect(salida[0].json.tiene_token).toBe(false);
  });

  test('UT-HASH-04 · peticion sin headers: no falla y usa el centinela', () => {
    const salida = hash({ body: {} });
    expect(salida[0].json.token_hash).toBe('sin-token');
  });

  test('UT-HASH-05 · peticion sin body: datos queda como objeto vacio', () => {
    const salida = hash({ headers: { 'x-sigac-token': 'abc' } });
    expect(salida[0].json.datos).toEqual({});
  });

  test('UT-HASH-06 · el cuerpo pasa intacto en datos', () => {
    const cuerpo = { dpi: '1234567890123', nombre: 'Ana', anidado: { a: 1 } };
    const salida = hash({ headers: {}, body: cuerpo });
    expect(salida[0].json.datos).toEqual(cuerpo);
  });

  test('UT-HASH-07 · cabecera en mayusculas: no se lee (n8n las entrega en minusculas)', () => {
    const salida = hash({ headers: { 'X-SIGAC-TOKEN': 'abc' }, body: {} });
    expect(salida[0].json.token_hash).toBe('sin-token');
  });

  test('UT-HASH-08 · token con espacios: se usa tal cual, sin recortar', () => {
    const salida = hash({ headers: { 'x-sigac-token': ' abc ' }, body: {} });
    expect(salida[0].json.token_hash).toBe(sha256(' abc '));
    expect(salida[0].json.token_hash).not.toBe(sha256('abc'));
  });

  test('UT-HASH-09 · el mismo token da siempre la misma huella', () => {
    const a = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    const b = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    expect(a[0].json.token_hash).toBe(b[0].json.token_hash);
  });

  test('UT-HASH-10 · tokens distintos dan huellas distintas', () => {
    const a = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    const b = hash({ headers: { 'x-sigac-token': 'abd' }, body: {} });
    expect(a[0].json.token_hash).not.toBe(b[0].json.token_hash);
  });

  test('UT-HASH-11 · la huella tiene 64 caracteres hexadecimales en minuscula', () => {
    const salida = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    expect(salida[0].json.token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('UT-HASH-12 · el token en claro no aparece en la salida', () => {
    // el token lleva guiones, que nunca aparecen en un hexadecimal:
    // si se encuentra en la salida, es porque el token salio en claro
    const token = 'token-secreto-de-prueba';
    const salida = hash({ headers: { 'x-sigac-token': token }, body: {} });
    expect(JSON.stringify(salida)).not.toContain(token);
  });

  test('UT-HASH-13 · devuelve un solo item con exactamente tres campos', () => {
    const salida = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    expect(salida).toHaveLength(1);
    expect(Object.keys(salida[0].json).sort()).toEqual(['datos', 'tiene_token', 'token_hash']);
  });
});

