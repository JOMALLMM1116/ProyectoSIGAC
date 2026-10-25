// sigac.wf09.estadopaciente.test.js
//
// pruebas unitarias del nodo Estado paciente de WF-09. traduce el
// resultado de Cambia estado paciente al codigo de respuesta:
//   no_existe -> 404 · ya_baja -> 409 · con_pendientes -> 409 con conteos
//   ok -> 200 (desactivado o dado de baja)
//
// cada prueba lleva su ID de la tabla de pruebas: UT-EPA09-NN

'use strict';

const estadoPaciente = require('../nodos/wf09_estado_paciente.js');
const { ejecutar } = require('../simulacion.js');

const responder = (resultado, id = 55) =>
  ejecutar(estadoPaciente, { entrada: [resultado], anteriores: { 'Valida datos': { id } } });
const salidaDe = (resultado, id) => responder(resultado, id).salida[0].json;

describe('WF-09 · Estado paciente', () => {
  test('UT-EPA09-01 · no_existe: 404', () => {
    expect(salidaDe({ resultado: 'no_existe', citas_futuras: '0', solicitudes_pendientes: '0' }, 999))
      .toEqual({ codigo: 404, estado: 'rechazado', mensaje: 'No existe el paciente 999' });
  });

  test('UT-EPA09-02 · ya_baja: 409, la baja es definitiva', () => {
    expect(salidaDe({ resultado: 'ya_baja' }, 56))
      .toEqual({ codigo: 409, estado: 'rechazado', mensaje: 'El paciente 56 ya fue dado de baja; la baja es definitiva' });
  });

  test('UT-EPA09-03 · con_pendientes: 409 con los dos conteos', () => {
    expect(salidaDe({ resultado: 'con_pendientes', citas_futuras: '4', solicitudes_pendientes: '7' }, 22)).toEqual({
      codigo: 409,
      estado: 'rechazado',
      mensaje: 'El paciente 22 tiene citas o solicitudes en curso; deben cancelarse o resolverse primero',
      citas_futuras: 4,
      solicitudes_pendientes: 7
    });
  });

  test('UT-EPA09-04 · con_pendientes solo por una cita: los conteos lo muestran', () => {
    const salida = salidaDe({ resultado: 'con_pendientes', citas_futuras: '1', solicitudes_pendientes: '0' }, 19);
    expect([salida.citas_futuras, salida.solicitudes_pendientes]).toEqual([1, 0]);
  });

  test('UT-EPA09-05 · los conteos llegan como texto desde postgres: salen como numero', () => {
    const salida = salidaDe({ resultado: 'con_pendientes', citas_futuras: '2', solicitudes_pendientes: '3' });
    expect(typeof salida.citas_futuras).toBe('number');
    expect(typeof salida.solicitudes_pendientes).toBe('number');
  });

  test('UT-EPA09-06 · ok sin baja: 200, desactivado', () => {
    expect(salidaDe({ resultado: 'ok', dado_de_baja: false, hash_auditoria: 'abc' }, 55))
      .toEqual({ codigo: 200, estado: 'actualizado', mensaje: 'Paciente 55 desactivado', hash_auditoria: 'abc' });
  });

  test('UT-EPA09-07 · ok con baja: 200, dado de baja', () => {
    expect(salidaDe({ resultado: 'ok', dado_de_baja: true }, 56).mensaje).toBe('Paciente 56 dado de baja');
  });

  test('UT-EPA09-08 · la respuesta exitosa no incluye los conteos', () => {
    const salida = salidaDe({ resultado: 'ok', dado_de_baja: false, citas_futuras: '0', solicitudes_pendientes: '0' });
    expect(salida).not.toHaveProperty('citas_futuras');
  });

  test('UT-EPA09-09 · consulta Valida datos (verify)', () => {
    expect(responder({ resultado: 'ok' }).$).toHaveBeenCalledWith('Valida datos');
  });

  test('UT-EPA09-10 · devuelve una lista con un solo item', () => {
    expect(responder({ resultado: 'ok' }).salida).toHaveLength(1);
  });
});
