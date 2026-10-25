// sigac.wf04.hashdeltoken.test.js
//
// pruebas unitarias del nodo Hash del token de WF-04. es una version
// propia de este flujo: ademas de calcular la huella del token, extrae del cuerpo el id_cita y el motivo de la cancelacion.
//
// el id_cita debe ser un entero positivo escrito como numero o como
// texto. cualquier otra cosa se reemplaza por el centinela 0, que
// ninguna cita tiene, de modo que la consulta no encuentra nada y el
// flujo responde 404 (defecto 12.12).
//
// cada prueba lleva su ID de la tabla de pruebas: UT-HASH04-NN

'use strict';

const hashDelToken = require('../nodos/wf04_hash_del_token.js');
const { ejecutar, sha256 } = require('../simulacion.js');

// arma la peticion que entrega el Webhook y ejecuta el nodo
const hash = peticion => ejecutar(hashDelToken, { entrada: [peticion] }).salida[0].json;
const conCita = id_cita => hash({ headers: { 'x-sigac-token': 'abc' }, body: { id_cita } });

// ------------------------------------------------------------
// A. Token
// ------------------------------------------------------------
describe('WF-04 · Hash del token · A. Token', () => {
  test('UT-HASH04-01 · con token: calcula su huella sha-256', () => {
    expect(conCita(5).token_hash).toBe(sha256('abc'));
  });

  test('UT-HASH04-02 · sin cabecera de token: centinela sin-token', () => {
    expect(hash({ headers: {}, body: { id_cita: 5 } }).token_hash).toBe('sin-token');
  });

  test('UT-HASH04-03 · token vacio: centinela sin-token', () => {
    expect(hash({ headers: { 'x-sigac-token': '' }, body: {} }).token_hash).toBe('sin-token');
  });

  test('UT-HASH04-04 · peticion sin headers ni body: no falla', () => {
    const salida = hash({});
    expect(salida.token_hash).toBe('sin-token');
    expect(salida.id_cita).toBe(0);
  });

  test('UT-HASH04-05 · token con espacios: se usa tal cual, sin recortar', () => {
    expect(hash({ headers: { 'x-sigac-token': ' abc ' }, body: {} }).token_hash).toBe(sha256(' abc '));
  });

  test('UT-HASH04-06 · el token en claro no aparece en la salida', () => {
    const salida = hash({ headers: { 'x-sigac-token': 'token-secreto-de-prueba' }, body: { id_cita: 5 } });
    expect(JSON.stringify(salida)).not.toContain('token-secreto-de-prueba');
  });
});

// ------------------------------------------------------------
// B. id_cita (defecto 12.12)
// ------------------------------------------------------------
describe('WF-04 · Hash del token · B. id_cita', () => {
  test.each([
    ['UT-HASH04-07', 'numero entero', 12, 12],
    ['UT-HASH04-08', 'texto numerico', '12', 12],
    ['UT-HASH04-09', 'texto con espacios', ' 12 ', 12]
  ])('%s · id_cita como %s: se acepta', (_, __, valor, esperado) => {
    expect(conCita(valor).id_cita).toBe(esperado);
  });

  test.each([
    ['UT-HASH04-10', 'cero', 0],
    ['UT-HASH04-11', 'negativo', -1],
    ['UT-HASH04-12', 'decimal', 12.5],
    ['UT-HASH04-13', 'texto', 'abc'],
    ['UT-HASH04-14', 'booleano true', true],
    ['UT-HASH04-15', 'con cero a la izquierda', '012'],
    ['UT-HASH04-16', 'nulo', null],
    ['UT-HASH04-17', 'ausente', undefined]
  ])('%s · id_cita %s: centinela 0', (_, __, valor) => {
    expect(conCita(valor).id_cita).toBe(0);
  });
});

// ------------------------------------------------------------
// C. Motivo y contrato
// ------------------------------------------------------------
describe('WF-04 · Hash del token · C. Motivo y contrato', () => {
  test('UT-HASH04-18 · motivo presente: pasa tal cual', () => {
    expect(hash({ headers: {}, body: { id_cita: 5, motivo: 'viaje' } }).motivo).toBe('viaje');
  });

  test.each([
    ['UT-HASH04-19', 'ausente', undefined],
    ['UT-HASH04-20', 'vacio', '']
  ])('%s · motivo %s: queda "sin motivo"', (_, __, motivo) => {
    expect(hash({ headers: {}, body: { id_cita: 5, motivo } }).motivo).toBe('sin motivo');
  });

  test('UT-HASH04-21 · devuelve un solo item con exactamente token_hash, id_cita y motivo', () => {
    const { salida } = ejecutar(hashDelToken, { entrada: [{ headers: {}, body: { id_cita: 5 } }] });
    expect(salida).toHaveLength(1);
    expect(Object.keys(salida[0].json).sort()).toEqual(['id_cita', 'motivo', 'token_hash']);
  });

  test('UT-HASH04-22 · no consulta ningun nodo anterior (verify)', () => {
    const { $ } = ejecutar(hashDelToken, { entrada: [{ headers: {}, body: {} }] });
    expect($).not.toHaveBeenCalled();
  });
});
