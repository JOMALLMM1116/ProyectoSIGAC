// sigac.wf09.pacientereactivado.test.js
//
// pruebas unitarias del nodo Paciente reactivado de WF-09. traduce el
// resultado de Reactiva paciente al codigo de respuesta:
//   no_existe -> 404 · ya_baja -> 409 · ya_activo -> 409 · ok -> 200
// el paciente no tiene token: no accede al sistema.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-PRE09-NN

'use strict';

const pacienteReactivado = require('../nodos/wf09_paciente_reactivado.js');
const { ejecutar } = require('../simulacion.js');

const responder = (resultado, id = 55) =>
  ejecutar(pacienteReactivado, { entrada: [resultado], anteriores: { 'Valida datos': { id } } });
const salidaDe = (resultado, id) => responder(resultado, id).salida[0].json;

describe('WF-09 · Paciente reactivado', () => {
  test('UT-PRE09-01 · no_existe: 404', () => {
    expect(salidaDe({ resultado: 'no_existe' }, 999)).toEqual({ codigo: 404, estado: 'rechazado', mensaje: 'No existe el paciente 999' });
  });

  test('UT-PRE09-02 · ya_baja: 409, la baja es definitiva', () => {
    expect(salidaDe({ resultado: 'ya_baja' }, 56)).toEqual({ codigo: 409, estado: 'rechazado', mensaje: 'El paciente 56 fue dado de baja; la baja es definitiva' });
  });

  test('UT-PRE09-03 · ya_activo: 409', () => {
    expect(salidaDe({ resultado: 'ya_activo' }, 55)).toEqual({ codigo: 409, estado: 'rechazado', mensaje: 'El paciente 55 ya esta activo' });
  });

  test('UT-PRE09-04 · ok: 200 con el hash de auditoria', () => {
    expect(salidaDe({ resultado: 'ok', hash_auditoria: 'abc' }, 55))
      .toEqual({ codigo: 200, estado: 'actualizado', mensaje: 'Paciente 55 reactivado', hash_auditoria: 'abc' });
  });

  test('UT-PRE09-05 · ok: no devuelve ningun token', () => {
    expect(salidaDe({ resultado: 'ok' })).not.toHaveProperty('token');
  });

  test('UT-PRE09-06 · consulta Valida datos (verify)', () => {
    expect(responder({ resultado: 'ok' }).$).toHaveBeenCalledWith('Valida datos');
  });

  test('UT-PRE09-07 · devuelve una lista con un solo item', () => {
    expect(responder({ resultado: 'ok' }).salida).toHaveLength(1);
  });
});
