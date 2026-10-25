// sigac.wf09.recepcionistareactivada.test.js
//
// pruebas unitarias del nodo Recepcionista reactivada de WF-09. traduce
// el resultado de Reactiva recepcionista al codigo de respuesta:
//   no_existe -> 404 · ya_baja -> 409 · ya_activa -> 409 · ok -> 200 con token nuevo
// solo en el caso ok se devuelve el token: en los rechazos no se guardo
// nada y el token generado se descarta.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-RRE09-NN

'use strict';

const recepcionistaReactivada = require('../nodos/wf09_recepcionista_reactivada.js');
const { ejecutar } = require('../simulacion.js');

const TOKEN = 'e'.repeat(64);
const responder = (resultado, id = 3) => ejecutar(recepcionistaReactivada, {
  entrada: [resultado],
  anteriores: { 'Valida datos': { id }, 'Genera token nuevo': { token: TOKEN } }
});
const salidaDe = (resultado, id) => responder(resultado, id).salida[0].json;

describe('WF-09 · Recepcionista reactivada', () => {
  test('UT-RRE09-01 · no_existe: 404', () => {
    expect(salidaDe({ resultado: 'no_existe' }, 99)).toEqual({ codigo: 404, estado: 'rechazado', mensaje: 'No existe la recepcionista 99' });
  });

  test('UT-RRE09-02 · ya_baja: 409, la baja es definitiva', () => {
    expect(salidaDe({ resultado: 'ya_baja' }, 2)).toEqual({ codigo: 409, estado: 'rechazado', mensaje: 'La recepcionista 2 fue dada de baja; la baja es definitiva' });
  });

  test('UT-RRE09-03 · ya_activa: 409', () => {
    expect(salidaDe({ resultado: 'ya_activa' }, 3)).toEqual({ codigo: 409, estado: 'rechazado', mensaje: 'La recepcionista 3 ya esta activa' });
  });

  test('UT-RRE09-04 · ok: 200 con el token nuevo y el aviso', () => {
    expect(salidaDe({ resultado: 'ok', hash_auditoria: 'abc' }, 3)).toEqual({
      codigo: 200,
      estado: 'actualizado',
      mensaje: 'Recepcionista 3 reactivada con token nuevo',
      token: TOKEN,
      aviso: 'Guarde este token ahora: no se volvera a mostrar. El token anterior sigue desactivado',
      hash_auditoria: 'abc'
    });
  });

  test.each(['no_existe', 'ya_baja', 'ya_activa'])('UT-RRE09-05 · %s: el token generado no se devuelve', resultado => {
    expect(JSON.stringify(responder({ resultado }).salida)).not.toContain(TOKEN);
  });

  test('UT-RRE09-06 · el token sale de Genera token nuevo (verify)', () => {
    const { $ } = responder({ resultado: 'ok' });
    expect($).toHaveBeenCalledWith('Genera token nuevo');
  });

  test('UT-RRE09-07 · en los rechazos no se consulta Genera token nuevo', () => {
    const { $ } = responder({ resultado: 'ya_activa' });
    expect($).not.toHaveBeenCalledWith('Genera token nuevo');
  });

  test('UT-RRE09-08 · devuelve una lista con un solo item', () => {
    expect(responder({ resultado: 'ok' }).salida).toHaveLength(1);
  });
});
