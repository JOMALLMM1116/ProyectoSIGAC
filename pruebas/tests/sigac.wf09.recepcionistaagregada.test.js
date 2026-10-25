// sigac.wf09.recepcionistaagregada.test.js
//
// pruebas unitarias del nodo Recepcionista agregada de WF-09. arma la
// respuesta 201 con el id de la recepcionista nueva, su token en claro
// (la unica vez que se muestra) y el hash de auditoria. el id y el hash
// salen de Agrega recepcionista ($input); el token, de Genera token.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-RAG09-NN

'use strict';

const recepcionistaAgregada = require('../nodos/wf09_recepcionista_agregada.js');
const { ejecutar } = require('../simulacion.js');

const TOKEN = 'c'.repeat(64);
const AGREGADA = { id_recepcionista: 3, hash_auditoria: 'abc123' };

const responder = (agregada = AGREGADA, generado = { token: TOKEN, token_hash: 'h'.repeat(64) }) =>
  ejecutar(recepcionistaAgregada, { entrada: [agregada], anteriores: { 'Genera token': generado } });

describe('WF-09 · Recepcionista agregada', () => {
  test('UT-RAG09-01 · respuesta completa', () => {
    expect(responder().salida[0].json).toEqual({
      codigo: 201,
      estado: 'registrado',
      mensaje: 'Recepcionista agregada',
      id_recepcionista: 3,
      token: TOKEN,
      aviso: 'Guarde este token ahora: no se volvera a mostrar',
      hash_auditoria: 'abc123'
    });
  });

  test('UT-RAG09-02 · el id sale de Agrega recepcionista', () => {
    expect(responder({ ...AGREGADA, id_recepcionista: 99 }).salida[0].json.id_recepcionista).toBe(99);
  });

  test('UT-RAG09-03 · el token sale de Genera token', () => {
    expect(responder(AGREGADA, { token: 'd'.repeat(64) }).salida[0].json.token).toBe('d'.repeat(64));
  });

  test('UT-RAG09-04 · la huella del token no se devuelve', () => {
    const texto = JSON.stringify(responder().salida);
    expect(texto).not.toContain('h'.repeat(64));
  });

  test('UT-RAG09-05 · incluye el aviso de guardar el token', () => {
    expect(responder().salida[0].json.aviso).toContain('no se volvera a mostrar');
  });

  test('UT-RAG09-06 · el hash de auditoria sale de Agrega recepcionista', () => {
    expect(responder({ ...AGREGADA, hash_auditoria: 'f'.repeat(64) }).salida[0].json.hash_auditoria).toBe('f'.repeat(64));
  });

  test('UT-RAG09-07 · consulta Genera token (verify)', () => {
    expect(responder().$).toHaveBeenCalledWith('Genera token');
  });

  test('UT-RAG09-08 · devuelve una lista con un solo item de siete campos', () => {
    const { salida } = responder();
    expect(salida).toHaveLength(1);
    expect(Object.keys(salida[0].json)).toHaveLength(7);
  });
});
