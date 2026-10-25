// sigac.wf04.canceladosinreasignar.test.js
//
// pruebas unitarias del nodo Cancelado sin reasignar de WF-04. arma la
// respuesta 200 cuando la cita se cancelo pero nadie esperaba cupo para
// esa fecha: el horario queda libre para futuras solicitudes.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-CAN04-NN

'use strict';

const canceladoSinReasignar = require('../nodos/wf04_cancelado_sin_reasignar.js');
const { ejecutar } = require('../simulacion.js');

const responder = (cancelada, json = {}) =>
  ejecutar(canceladoSinReasignar, { anteriores: { 'Cancela cita': cancelada }, json });

describe('WF-04 · Cancelado sin reasignar', () => {
  test('UT-CAN04-01 · respuesta completa', () => {
    expect(responder({ id_cita: 53 }).salida[0].json).toEqual({
      codigo: 200,
      estado: 'cancelado',
      mensaje: 'Cita cancelada. No habia nadie en lista de espera para esa fecha',
      id_cita_cancelada: 53
    });
  });

  test('UT-CAN04-02 · la cita cancelada sale de Cancela cita', () => {
    expect(responder({ id_cita: 999 }).salida[0].json.id_cita_cancelada).toBe(999);
  });

  test('UT-CAN04-03 · estado cancelado, distinto de reasignado', () => {
    expect(responder({ id_cita: 53 }).salida[0].json.estado).toBe('cancelado');
  });

  test('UT-CAN04-04 · consulta el nodo Cancela cita (verify)', () => {
    const { $ } = responder({ id_cita: 53 });
    expect($).toHaveBeenCalledWith('Cancela cita');
  });

  test('UT-CAN04-05 · no depende de $json: la salida vacia de Siguiente en espera no la cambia', () => {
    expect(responder({ id_cita: 53 }, {}).salida).toEqual(responder({ id_cita: 53 }, { otro: 1 }).salida);
  });

  test('UT-CAN04-06 · no expone el medico ni la fecha de la cita cancelada', () => {
    const { json } = responder({ id_cita: 53, id_medico: 1, fecha_hora: '2026-09-21T15:30:00Z' }).salida[0];
    expect(Object.keys(json).sort()).toEqual(['codigo', 'estado', 'id_cita_cancelada', 'mensaje']);
  });

  test('UT-CAN04-07 · devuelve una lista con un solo item', () => {
    const { salida } = responder({ id_cita: 53 });
    expect(Array.isArray(salida)).toBe(true);
    expect(salida).toHaveLength(1);
  });
});
