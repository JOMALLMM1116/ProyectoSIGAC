// sigac.wf08.historiallisto.test.js
//
// pruebas unitarias del nodo Historial listo de WF-08. arma la respuesta
// 200 con el historial descifrado. es la unica respuesta del sistema que
// entrega informacion clinica en claro, y solo llega aqui despues de que
// la lectura quedo registrada en la bitacora.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-HIS08-NN

'use strict';

const historialListo = require('../nodos/wf08_historial_listo.js');
const { ejecutar } = require('../simulacion.js');

const NOTAS = [
  { id_nota: 3, fecha: '23/10/2026 14:30', medico: 'Carlos Enrique Coc Ical', especialidad: 'Pediatria', diagnostico: 'Faringitis', indicaciones: 'Reposo' }
];

const responder = (historial, bitacora = { hash_actual: 'abc123' }) =>
  ejecutar(historialListo, { entrada: [bitacora], anteriores: { Descifra: historial } });

const conNotas = { id_paciente: 55, id_cita: 3432, id_medico: 2, total: 1, notas: NOTAS };
const sinNotas = { id_paciente: 55, id_cita: 3432, id_medico: 2, total: 0, notas: [] };

describe('WF-08 · Historial listo', () => {
  test('UT-HIS08-01 · respuesta completa con notas', () => {
    expect(responder(conNotas).salida[0].json).toEqual({
      codigo: 200,
      estado: 'consultado',
      mensaje: 'Historial clinico del paciente',
      id_cita: 3432,
      total: 1,
      notas: NOTAS,
      hash_auditoria: 'abc123'
    });
  });

  test('UT-HIS08-02 · sin notas: mensaje de que no tiene notas previas', () => {
    const { json } = responder(sinNotas).salida[0];
    expect(json.mensaje).toBe('El paciente no tiene notas clinicas previas');
    expect(json.notas).toEqual([]);
    expect(json.total).toBe(0);
  });

  test('UT-HIS08-03 · sin notas tambien responde 200: la consulta fue valida', () => {
    expect(responder(sinNotas).salida[0].json.codigo).toBe(200);
  });

  test('UT-HIS08-04 · el hash de auditoria sale de la bitacora ($input)', () => {
    expect(responder(conNotas, { hash_actual: 'f'.repeat(64) }).salida[0].json.hash_auditoria).toBe('f'.repeat(64));
  });

  test('UT-HIS08-05 · no devuelve el id del paciente ni del medico', () => {
    const { json } = responder(conNotas).salida[0];
    expect(json).not.toHaveProperty('id_paciente');
    expect(json).not.toHaveProperty('id_medico');
  });

  test('UT-HIS08-06 · las notas pasan intactas desde Descifra', () => {
    expect(responder(conNotas).salida[0].json.notas).toBe(NOTAS);
  });

  test('UT-HIS08-07 · consulta Descifra (verify)', () => {
    expect(responder(conNotas).$).toHaveBeenCalledWith('Descifra');
  });

  test('UT-HIS08-08 · devuelve una lista con un solo item', () => {
    expect(responder(conNotas).salida).toHaveLength(1);
  });
});
