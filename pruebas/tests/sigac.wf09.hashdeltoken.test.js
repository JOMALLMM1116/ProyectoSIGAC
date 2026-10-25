// sigac.wf09.hashdeltoken.test.js
//
// pruebas unitarias del nodo Hash del token de WF-09. lee el token de
// la cabecera x-sigac-token y calcula su huella sha-256, que es la que
// se compara contra la base. el token nunca se compara ni se guarda en
// claro. sin token, usa el centinela sin-token, que nunca puede
// coincidir con una huella real.
//
// tecnicas: particion de equivalencia, valores limite, cobertura de
// ramas (headers || {}, body || {}, token ? hash : centinela),
// propiedades del hash y contrato de salida.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-HASH09-NN

'use strict';

const hashDelToken = require('../nodos/wf09_hash_del_token.js');
const { ejecutar, sha256 } = require('../simulacion.js');

// arma la peticion que entrega el Webhook y ejecuta el nodo
const hash = peticion => ejecutar(hashDelToken, { entrada: [peticion] }).salida;

describe('WF-09 · Hash del token', () => {
  test('UT-HASH09-01 · con token: calcula su huella sha-256', () => {
    const salida = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    expect(salida[0].json.token_hash).toBe(sha256('abc'));
    expect(salida[0].json.tiene_token).toBe(true);
  });

  test('UT-HASH09-02 · sin cabecera de token: centinela sin-token', () => {
    const salida = hash({ headers: {}, body: {} });
    expect(salida[0].json.token_hash).toBe('sin-token');
    expect(salida[0].json.tiene_token).toBe(false);
  });

  test('UT-HASH09-03 · token vacio: centinela sin-token', () => {
    const salida = hash({ headers: { 'x-sigac-token': '' }, body: {} });
    expect(salida[0].json.token_hash).toBe('sin-token');
    expect(salida[0].json.tiene_token).toBe(false);
  });

  test('UT-HASH09-04 · peticion sin headers: no falla y usa el centinela', () => {
    const salida = hash({ body: {} });
    expect(salida[0].json.token_hash).toBe('sin-token');
  });

  test('UT-HASH09-05 · peticion sin body: datos queda como objeto vacio', () => {
    const salida = hash({ headers: { 'x-sigac-token': 'abc' } });
    expect(salida[0].json.datos).toEqual({});
  });

  test('UT-HASH09-06 · el cuerpo pasa intacto en datos', () => {
    const cuerpo = { dpi: '1234567890123', nombre: 'Ana', anidado: { a: 1 } };
    const salida = hash({ headers: {}, body: cuerpo });
    expect(salida[0].json.datos).toEqual(cuerpo);
  });

  test('UT-HASH09-07 · cabecera en mayusculas: no se lee (n8n las entrega en minusculas)', () => {
    const salida = hash({ headers: { 'X-SIGAC-TOKEN': 'abc' }, body: {} });
    expect(salida[0].json.token_hash).toBe('sin-token');
  });

  test('UT-HASH09-08 · token con espacios: se usa tal cual, sin recortar', () => {
    const salida = hash({ headers: { 'x-sigac-token': ' abc ' }, body: {} });
    expect(salida[0].json.token_hash).toBe(sha256(' abc '));
    expect(salida[0].json.token_hash).not.toBe(sha256('abc'));
  });

  test('UT-HASH09-09 · el mismo token da siempre la misma huella', () => {
    const a = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    const b = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    expect(a[0].json.token_hash).toBe(b[0].json.token_hash);
  });

  test('UT-HASH09-10 · tokens distintos dan huellas distintas', () => {
    const a = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    const b = hash({ headers: { 'x-sigac-token': 'abd' }, body: {} });
    expect(a[0].json.token_hash).not.toBe(b[0].json.token_hash);
  });

  test('UT-HASH09-11 · la huella tiene 64 caracteres hexadecimales en minuscula', () => {
    const salida = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    expect(salida[0].json.token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('UT-HASH09-12 · el token en claro no aparece en la salida', () => {
    // el token lleva guiones, que nunca aparecen en un hexadecimal:
    // si se encuentra en la salida, es porque el token salio en claro
    const token = 'token-secreto-de-prueba';
    const salida = hash({ headers: { 'x-sigac-token': token }, body: {} });
    expect(JSON.stringify(salida)).not.toContain(token);
  });

  test('UT-HASH09-13 · devuelve un solo item con exactamente tres campos', () => {
    const salida = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    expect(salida).toHaveLength(1);
    expect(Object.keys(salida[0].json).sort()).toEqual(['datos', 'tiene_token', 'token_hash']);
  });
});
