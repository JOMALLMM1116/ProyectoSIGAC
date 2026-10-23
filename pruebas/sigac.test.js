// sigac.test.js
//
// pruebas unitarias de los nodos Code de SIGAC. cada nodo se ejecuta
// fuera de n8n, desde nodos_sigac.js, con lo que n8n le entregaria
// simulado: el item de entrada, la salida de los nodos anteriores y
// las variables de entorno.
//
// cada nodo se prueba con una matriz de casos construida con cinco
// tecnicas: particion de equivalencia, valores limite, cobertura de
// ramas, errores y contrato de salida. cada prueba lleva el numero
// de su caso en la matriz.
//
// equivalencias con la clase:
//   @Test                   -> test()
//   @ParameterizedTest      -> test.each() / describe.each()
//   assertEquals            -> expect().toBe() / toEqual()
//   assertThrows            -> expect(() => ...).toThrow()
//   @Mock + when(...)       -> jest.fn() con un valor de retorno
//   verify(...)             -> expect(mock).toHaveBeenCalledWith(...)

'use strict';

const crypto = require('crypto');
const { DateTime } = require('luxon');
const nodos = require('./nodos_sigac.js');

// ============================================================
// SIMULACION DE n8n
// ============================================================

// clave de cifrado SOLO para pruebas. no es la del .env.
const CLAVE_PRUEBA = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';

// lo que n8n entrega como $input o como $('Nodo'): una lista de
// items con first() y all()
function items(...jsons) {
  const lista = jsons.map(j => ({ json: j }));
  return { first: () => lista[0], all: () => lista };
}

// simula $('Nodo'): devuelve la salida que se le indique para cada
// nodo, y falla si el codigo pide un nodo que la prueba no preparo.
// es el equivalente a when(repositorio.buscar(...)).thenReturn(...)
function nodosAnteriores(salidas) {
  return jest.fn(nombre => {
    if (!(nombre in salidas)) {
      throw new Error('La prueba no simulo el nodo: ' + nombre);
    }
    const valor = salidas[nombre];
    return items(...(Array.isArray(valor) ? valor : [valor]));
  });
}

// ejecuta un nodo con todo lo que necesita. devuelve la salida y el
// simulador de $(), para poder verificar que nodos consulto
function ejecutar(funcion, opciones = {}) {
  const $ = nodosAnteriores(opciones.anteriores || {});
  const entrada = items(...(opciones.entrada || []));
  const salida = funcion.call(
    opciones.contexto || {},
    entrada,
    $,
    opciones.json || {},
    opciones.env || { SIGAC_CLAVE_CIFRADO: CLAVE_PRUEBA },
    DateTime
  );
  return { salida, $ };
}

const sha256 = texto => crypto.createHash('sha256').update(texto).digest('hex');

// ============================================================
// HASH DEL TOKEN · WF-01, WF-07, WF-08 y WF-09
// el nodo es identico en los cuatro flujos: cada caso se prueba
// en las cuatro copias
// ============================================================

const COPIAS_HASH = [
  'wf01_hash_del_token',
  'wf07_hash_del_token',
  'wf08_hash_del_token',
  'wf09_hash_del_token'
];

describe.each(COPIAS_HASH)('Hash del token · %s', nombre => {
  // arma la peticion que entrega el Webhook y ejecuta el nodo
  const hash = peticion => ejecutar(nodos[nombre], { entrada: [peticion] }).salida;

  test('1. con token: calcula su huella sha-256', () => {
    const salida = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    expect(salida[0].json.token_hash).toBe(sha256('abc'));
    expect(salida[0].json.tiene_token).toBe(true);
  });

  test('2. sin cabecera de token: centinela sin-token', () => {
    const salida = hash({ headers: {}, body: {} });
    expect(salida[0].json.token_hash).toBe('sin-token');
    expect(salida[0].json.tiene_token).toBe(false);
  });

  test('3. token vacio: centinela sin-token', () => {
    const salida = hash({ headers: { 'x-sigac-token': '' }, body: {} });
    expect(salida[0].json.token_hash).toBe('sin-token');
    expect(salida[0].json.tiene_token).toBe(false);
  });

  test('4. peticion sin headers: no falla y usa el centinela', () => {
    const salida = hash({ body: {} });
    expect(salida[0].json.token_hash).toBe('sin-token');
  });

  test('5. peticion sin body: datos queda como objeto vacio', () => {
    const salida = hash({ headers: { 'x-sigac-token': 'abc' } });
    expect(salida[0].json.datos).toEqual({});
  });

  test('6. el cuerpo pasa intacto en datos', () => {
    const cuerpo = { dpi: '1234567890123', nombre: 'Ana', anidado: { a: 1 } };
    const salida = hash({ headers: {}, body: cuerpo });
    expect(salida[0].json.datos).toEqual(cuerpo);
  });

  test('7. cabecera en mayusculas: no se lee (n8n las entrega en minusculas)', () => {
    const salida = hash({ headers: { 'X-SIGAC-TOKEN': 'abc' }, body: {} });
    expect(salida[0].json.token_hash).toBe('sin-token');
  });

  test('8. token con espacios: se usa tal cual, sin recortar', () => {
    const salida = hash({ headers: { 'x-sigac-token': ' abc ' }, body: {} });
    expect(salida[0].json.token_hash).toBe(sha256(' abc '));
    expect(salida[0].json.token_hash).not.toBe(sha256('abc'));
  });

  test('9. el mismo token da siempre la misma huella', () => {
    const a = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    const b = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    expect(a[0].json.token_hash).toBe(b[0].json.token_hash);
  });

  test('10. tokens distintos dan huellas distintas', () => {
    const a = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    const b = hash({ headers: { 'x-sigac-token': 'abd' }, body: {} });
    expect(a[0].json.token_hash).not.toBe(b[0].json.token_hash);
  });

  test('11. la huella tiene 64 caracteres hexadecimales en minuscula', () => {
    const salida = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    expect(salida[0].json.token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('12. el token en claro no aparece en la salida', () => {
    // el token lleva guiones, que nunca aparecen en un hexadecimal:
    // si se encuentra en la salida, es porque el token salio en claro
    const token = 'token-secreto-de-prueba';
    const salida = hash({ headers: { 'x-sigac-token': token }, body: {} });
    expect(JSON.stringify(salida)).not.toContain(token);
  });

  test('13. devuelve un solo item con exactamente tres campos', () => {
    const salida = hash({ headers: { 'x-sigac-token': 'abc' }, body: {} });
    expect(salida).toHaveLength(1);
    expect(Object.keys(salida[0].json).sort()).toEqual(['datos', 'tiene_token', 'token_hash']);
  });
});
