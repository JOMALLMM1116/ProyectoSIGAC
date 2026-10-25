// sigac.wf05.hashdeltoken.test.js
//
// pruebas unitarias del nodo Hash del token de WF-05. es una version
// propia de este flujo: ademas de calcular la huella del token, extrae del cuerpo el id_cita y valida el resultado del cierre.
//
// el id_cita debe ser un entero positivo escrito como numero o como
// texto. cualquier otra cosa se reemplaza por el centinela 0, que
// ninguna cita tiene, de modo que la consulta no encuentra nada y el
// flujo responde 404 (defecto 12.12).
//
// cada prueba lleva su ID de la tabla de pruebas: UT-HASH05-NN

'use strict';

const hashDelToken = require('../nodos/wf05_hash_del_token.js');
const { ejecutar, sha256 } = require('../simulacion.js');

// arma la peticion que entrega el Webhook y ejecuta el nodo
const hash = peticion => ejecutar(hashDelToken, { entrada: [peticion] }).salida[0].json;
const conCita = id_cita => hash({ headers: { 'x-sigac-token': 'abc' }, body: { id_cita } });

// ------------------------------------------------------------
// A. Token
// ------------------------------------------------------------
describe('WF-05 · Hash del token · A. Token', () => {
  test('UT-HASH05-01 · con token: calcula su huella sha-256', () => {
    expect(conCita(5).token_hash).toBe(sha256('abc'));
  });

  test('UT-HASH05-02 · sin cabecera de token: centinela sin-token', () => {
    expect(hash({ headers: {}, body: { id_cita: 5 } }).token_hash).toBe('sin-token');
  });

  test('UT-HASH05-03 · token vacio: centinela sin-token', () => {
    expect(hash({ headers: { 'x-sigac-token': '' }, body: {} }).token_hash).toBe('sin-token');
  });

  test('UT-HASH05-04 · peticion sin headers ni body: no falla', () => {
    const salida = hash({});
    expect(salida.token_hash).toBe('sin-token');
    expect(salida.id_cita).toBe(0);
  });

  test('UT-HASH05-05 · token con espacios: se usa tal cual, sin recortar', () => {
    expect(hash({ headers: { 'x-sigac-token': ' abc ' }, body: {} }).token_hash).toBe(sha256(' abc '));
  });

  test('UT-HASH05-06 · el token en claro no aparece en la salida', () => {
    const salida = hash({ headers: { 'x-sigac-token': 'token-secreto-de-prueba' }, body: { id_cita: 5 } });
    expect(JSON.stringify(salida)).not.toContain('token-secreto-de-prueba');
  });
});

// ------------------------------------------------------------
// B. id_cita (defecto 12.12)
// ------------------------------------------------------------
describe('WF-05 · Hash del token · B. id_cita', () => {
  test.each([
    ['UT-HASH05-07', 'numero entero', 12, 12],
    ['UT-HASH05-08', 'texto numerico', '12', 12],
    ['UT-HASH05-09', 'texto con espacios', ' 12 ', 12]
  ])('%s · id_cita como %s: se acepta', (_, __, valor, esperado) => {
    expect(conCita(valor).id_cita).toBe(esperado);
  });

  test.each([
    ['UT-HASH05-10', 'cero', 0],
    ['UT-HASH05-11', 'negativo', -1],
    ['UT-HASH05-12', 'decimal', 12.5],
    ['UT-HASH05-13', 'texto', 'abc'],
    ['UT-HASH05-14', 'booleano true', true],
    ['UT-HASH05-15', 'con cero a la izquierda', '012'],
    ['UT-HASH05-16', 'nulo', null],
    ['UT-HASH05-17', 'ausente', undefined]
  ])('%s · id_cita %s: centinela 0', (_, __, valor) => {
    expect(conCita(valor).id_cita).toBe(0);
  });
});

// ------------------------------------------------------------
// C. Resultado y contrato
// ------------------------------------------------------------
describe('WF-05 · Hash del token · C. Resultado y contrato', () => {
  const resultado = valor => hash({ headers: {}, body: { id_cita: 5, resultado: valor } }).resultado;

  test.each([
    ['UT-HASH05-18', 'atendida'],
    ['UT-HASH05-19', 'ausente']
  ])('%s · resultado %s: se acepta', (_, valor) => {
    expect(resultado(valor)).toBe(valor);
  });

  test.each([
    ['UT-HASH05-20', 'cancelada (no es un resultado de cierre)', 'cancelada'],
    ['UT-HASH05-21', 'con mayuscula', 'Atendida'],
    ['UT-HASH05-22', 'ausente del cuerpo', undefined],
    ['UT-HASH05-23', 'vacio', '']
  ])('%s · resultado %s: centinela invalido', (_, __, valor) => {
    expect(resultado(valor)).toBe('invalido');
  });

  test('UT-HASH05-24 · devuelve un solo item con exactamente token_hash, id_cita y resultado', () => {
    const { salida } = ejecutar(hashDelToken, { entrada: [{ headers: {}, body: { id_cita: 5 } }] });
    expect(salida).toHaveLength(1);
    expect(Object.keys(salida[0].json).sort()).toEqual(['id_cita', 'resultado', 'token_hash']);
  });

  test('UT-HASH05-25 · no consulta ningun nodo anterior (verify)', () => {
    const { $ } = ejecutar(hashDelToken, { entrada: [{ headers: {}, body: {} }] });
    expect($).not.toHaveBeenCalled();
  });
});
