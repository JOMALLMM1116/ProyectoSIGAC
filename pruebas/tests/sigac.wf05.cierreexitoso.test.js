// sigac.wf05.cierreexitoso.test.js
//
// pruebas unitarias del nodo Cierre exitoso de WF-05. arma la respuesta
// 200 cuando la cita quedo cerrada como atendida o ausente. recibe como
// $json la fila que devolvio Cierra cita.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-CIE05-NN

'use strict';

const cierreExitoso = require('../nodos/wf05_cierre_exitoso.js');
const { ejecutar } = require('../simulacion.js');

const cerrar = fila => ejecutar(cierreExitoso, { entrada: [fila], json: fila });

describe('WF-05 · Cierre exitoso', () => {
  test('UT-CIE05-01 · respuesta completa', () => {
    expect(cerrar({ id_cita: 3432, estado: 'atendida' }).salida[0].json).toEqual({
      codigo: 200,
      estado: 'cerrada',
      mensaje: 'Cita cerrada correctamente',
      id_cita: 3432,
      resultado: 'atendida'
    });
  });

  test.each([
    ['UT-CIE05-02', 'atendida'],
    ['UT-CIE05-03', 'ausente']
  ])('%s · resultado %s: sale del estado de la fila cerrada', (_, estado) => {
    expect(cerrar({ id_cita: 1, estado }).salida[0].json.resultado).toBe(estado);
  });

  test('UT-CIE05-04 · el id_cita sale de la fila cerrada', () => {
    expect(cerrar({ id_cita: 999, estado: 'atendida' }).salida[0].json.id_cita).toBe(999);
  });

  test('UT-CIE05-05 · el estado de la respuesta es siempre cerrada, no el de la cita', () => {
    expect(cerrar({ id_cita: 1, estado: 'ausente' }).salida[0].json.estado).toBe('cerrada');
  });

  test('UT-CIE05-06 · no consulta ningun nodo anterior (verify)', () => {
    const { $ } = cerrar({ id_cita: 1, estado: 'atendida' });
    expect($).not.toHaveBeenCalled();
  });

  test('UT-CIE05-07 · no expone otros campos de la fila', () => {
    const { json } = cerrar({ id_cita: 1, estado: 'atendida', id_paciente: 55, id_medico: 2 }).salida[0];
    expect(Object.keys(json).sort()).toEqual(['codigo', 'estado', 'id_cita', 'mensaje', 'resultado']);
  });

  test('UT-CIE05-08 · devuelve una lista con un solo item', () => {
    const { salida } = cerrar({ id_cita: 1, estado: 'atendida' });
    expect(salida).toHaveLength(1);
  });
});
