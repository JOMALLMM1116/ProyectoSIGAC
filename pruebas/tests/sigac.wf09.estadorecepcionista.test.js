// sigac.wf09.estadorecepcionista.test.js
//
// pruebas unitarias del nodo Estado recepcionista de WF-09. traduce el
// resultado de Cambia estado recepcionista al codigo de respuesta:
//   no_existe -> 404 · ya_baja -> 409 · ok -> 200 (desactivada o dada de baja)
//
// cada prueba lleva su ID de la tabla de pruebas: UT-ERC09-NN

'use strict';

const estadoRecepcionista = require('../nodos/wf09_estado_recepcionista.js');
const { ejecutar } = require('../simulacion.js');

const responder = (resultado, id = 3) =>
  ejecutar(estadoRecepcionista, { entrada: [resultado], anteriores: { 'Valida datos': { id } } });
const salidaDe = (resultado, id) => responder(resultado, id).salida[0].json;

describe('WF-09 · Estado recepcionista', () => {
  test('UT-ERC09-01 · no_existe: 404 con el id', () => {
    expect(salidaDe({ resultado: 'no_existe' }, 99)).toEqual({
      codigo: 404, estado: 'rechazado', mensaje: 'No existe la recepcionista 99'
    });
  });

  test('UT-ERC09-02 · ya_baja: 409, la baja es definitiva', () => {
    expect(salidaDe({ resultado: 'ya_baja' }, 2)).toEqual({
      codigo: 409, estado: 'rechazado', mensaje: 'La recepcionista 2 ya fue dada de baja; la baja es definitiva'
    });
  });

  test('UT-ERC09-03 · ok sin baja: 200, desactivada', () => {
    expect(salidaDe({ resultado: 'ok', dada_de_baja: false, tokens_desactivados: '1', hash_auditoria: 'abc' }, 3)).toEqual({
      codigo: 200, estado: 'actualizado', mensaje: 'Recepcionista 3 desactivada', tokens_desactivados: 1, hash_auditoria: 'abc'
    });
  });

  test('UT-ERC09-04 · ok con baja: 200, dada de baja', () => {
    expect(salidaDe({ resultado: 'ok', dada_de_baja: true, tokens_desactivados: '1' }).mensaje).toBe('Recepcionista 3 dada de baja');
  });

  test('UT-ERC09-05 · tokens_desactivados llega como texto desde postgres: sale como numero', () => {
    expect(salidaDe({ resultado: 'ok', dada_de_baja: false, tokens_desactivados: '2' }).tokens_desactivados).toBe(2);
  });

  test('UT-ERC09-06 · ok sin tokens activos: tokens_desactivados 0', () => {
    expect(salidaDe({ resultado: 'ok', dada_de_baja: false, tokens_desactivados: '0' }).tokens_desactivados).toBe(0);
  });

  test('UT-ERC09-07 · los rechazos no incluyen hash ni tokens', () => {
    expect(Object.keys(salidaDe({ resultado: 'no_existe' })).sort()).toEqual(['codigo', 'estado', 'mensaje']);
    expect(Object.keys(salidaDe({ resultado: 'ya_baja' })).sort()).toEqual(['codigo', 'estado', 'mensaje']);
  });

  test('UT-ERC09-08 · el id del mensaje sale de Valida datos (verify)', () => {
    const { $ } = responder({ resultado: 'no_existe' });
    expect($).toHaveBeenCalledWith('Valida datos');
  });

  test('UT-ERC09-09 · devuelve una lista con un solo item', () => {
    expect(responder({ resultado: 'ok', tokens_desactivados: '1' }).salida).toHaveLength(1);
  });
});
