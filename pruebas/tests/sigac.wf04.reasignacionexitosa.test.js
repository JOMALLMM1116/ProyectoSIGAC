// sigac.wf04.reasignacionexitosa.test.js
//
// pruebas unitarias del nodo Reasignacion exitosa de WF-04. arma la
// respuesta 200 cuando la cita se cancelo y su cupo paso al siguiente
// paciente en lista de espera. toma la cita cancelada de Cancela cita,
// y la cita nueva y la solicitud beneficiada de Reasigna cupo, que le
// llega como $json.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-REA04-NN

'use strict';

const reasignacionExitosa = require('../nodos/wf04_reasignacion_exitosa.js');
const { ejecutar } = require('../simulacion.js');

function responder(cancelada, reasignada) {
  return ejecutar(reasignacionExitosa, {
    anteriores: { 'Cancela cita': cancelada },
    json: reasignada
  });
}

const CANCELADA = { id_cita: 53, id_medico: 1, fecha_hora: '2026-09-21T15:30:00Z' };
const REASIGNADA = { id_cita_nueva: 2393, id_solicitud: 13 };

describe('WF-04 · Reasignacion exitosa', () => {
  test('UT-REA04-01 · respuesta completa con los tres identificadores', () => {
    expect(responder(CANCELADA, REASIGNADA).salida[0].json).toEqual({
      codigo: 200,
      estado: 'reasignado',
      mensaje: 'Cita cancelada y cupo reasignado',
      id_cita_cancelada: 53,
      id_cita_nueva: 2393,
      id_solicitud_beneficiada: 13
    });
  });

  test('UT-REA04-02 · la cita cancelada sale de Cancela cita', () => {
    expect(responder({ id_cita: 999 }, REASIGNADA).salida[0].json.id_cita_cancelada).toBe(999);
  });

  test('UT-REA04-03 · la cita nueva sale de $json (Reasigna cupo)', () => {
    expect(responder(CANCELADA, { ...REASIGNADA, id_cita_nueva: 5000 }).salida[0].json.id_cita_nueva).toBe(5000);
  });

  test('UT-REA04-04 · la solicitud beneficiada sale del id_solicitud de $json', () => {
    expect(responder(CANCELADA, { ...REASIGNADA, id_solicitud: 77 }).salida[0].json.id_solicitud_beneficiada).toBe(77);
  });

  test('UT-REA04-05 · consulta el nodo Cancela cita (verify)', () => {
    const { $ } = responder(CANCELADA, REASIGNADA);
    expect($).toHaveBeenCalledWith('Cancela cita');
  });

  test('UT-REA04-06 · no expone el medico ni la fecha de la cita cancelada', () => {
    const { json } = responder(CANCELADA, REASIGNADA).salida[0];
    expect(json).not.toHaveProperty('id_medico');
    expect(json).not.toHaveProperty('fecha_hora');
  });

  test('UT-REA04-07 · sin datos de Reasigna cupo: los campos quedan indefinidos, sin error', () => {
    const { json } = responder(CANCELADA, {}).salida[0];
    expect(json.id_cita_nueva).toBeUndefined();
    expect(json.id_solicitud_beneficiada).toBeUndefined();
  });

  test('UT-REA04-08 · devuelve una lista con un solo item de seis campos', () => {
    const { salida } = responder(CANCELADA, REASIGNADA);
    expect(salida).toHaveLength(1);
    expect(Object.keys(salida[0].json)).toHaveLength(6);
  });
});
