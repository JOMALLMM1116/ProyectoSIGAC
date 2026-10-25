// sigac.wf02.calculaprioridad.test.js
//
// pruebas unitarias del nodo Calcula prioridad de WF-02. recibe el lote
// de solicitudes pendientes y a cada una le asigna una prioridad segun
// el tipo de consulta (1 la mas urgente, 5 la menos) y un turno, que es
// su posicion en el lote. propaga los cuatro campos de preferencia, que
// Reparte cupos necesita (defecto 12.8).
//
// cada prueba lleva su ID de la tabla de pruebas: UT-PRI02-NN

'use strict';

const calculaPrioridad = require('../nodos/wf02_calcula_prioridad.js');
const { ejecutar } = require('../simulacion.js');

// una solicitud tal como la devuelve Lee pendientes
const solicitud = (cambios = {}) => ({
  id: 71,
  id_paciente: 55,
  tipo_consulta: 'general',
  fecha_preferida: '2026-10-31',
  franja_preferida: 'tarde',
  hora_solicitada: '14:30:00',
  especialidad_solicitada: 'Pediatria',
  id_medico_solicitado: 2,
  motivo: 'control de rutina',
  estado: 'pendiente',
  ...cambios
});

// ejecuta el nodo con el lote indicado
const calcular = (...lote) => ejecutar(calculaPrioridad, { entrada: lote });

describe('WF-02 · Calcula prioridad', () => {
  test.each([
    ['UT-PRI02-01', 'urgencia', 1],
    ['UT-PRI02-02', 'control', 3],
    ['UT-PRI02-03', 'general', 5]
  ])('%s · %s: prioridad %i', (_, tipo_consulta, prioridad) => {
    const { salida } = calcular(solicitud({ tipo_consulta }));
    expect(salida[0].json.prioridad).toBe(prioridad);
  });

  test('UT-PRI02-04 · tipo desconocido: prioridad 5', () => {
    expect(calcular(solicitud({ tipo_consulta: 'revision' })).salida[0].json.prioridad).toBe(5);
  });

  test('UT-PRI02-05 · sin tipo: prioridad 5', () => {
    expect(calcular(solicitud({ tipo_consulta: undefined })).salida[0].json.prioridad).toBe(5);
  });

  test('UT-PRI02-06 · Urgencia con mayuscula: prioridad 5, la tabla es exacta', () => {
    expect(calcular(solicitud({ tipo_consulta: 'Urgencia' })).salida[0].json.prioridad).toBe(5);
  });

  test('UT-PRI02-07 · el id de la solicitud sale como id_solicitud', () => {
    expect(calcular(solicitud({ id: 999 })).salida[0].json.id_solicitud).toBe(999);
  });

  test('UT-PRI02-08 · paciente, tipo y fecha pasan intactos', () => {
    const { json } = calcular(solicitud()).salida[0];
    expect(json.id_paciente).toBe(55);
    expect(json.tipo_consulta).toBe('general');
    expect(json.fecha_preferida).toBe('2026-10-31');
  });

  test('UT-PRI02-09 · las cuatro preferencias pasan intactas (defecto 12.8)', () => {
    const { json } = calcular(solicitud()).salida[0];
    expect(json.franja_preferida).toBe('tarde');
    expect(json.hora_solicitada).toBe('14:30:00');
    expect(json.especialidad_solicitada).toBe('Pediatria');
    expect(json.id_medico_solicitado).toBe(2);
  });

  test('UT-PRI02-10 · las preferencias nulas pasan como nulas (defecto 12.8)', () => {
    const sinPreferencias = solicitud({
      franja_preferida: 'indiferente',
      hora_solicitada: null,
      especialidad_solicitada: null,
      id_medico_solicitado: null
    });
    const { json } = calcular(sinPreferencias).salida[0];
    expect(json.franja_preferida).toBe('indiferente');
    expect(json.hora_solicitada).toBeNull();
    expect(json.especialidad_solicitada).toBeNull();
    expect(json.id_medico_solicitado).toBeNull();
  });

  test('UT-PRI02-11 · el turno es la posicion en el lote', () => {
    const { salida } = calcular(solicitud({ id: 1 }), solicitud({ id: 2 }), solicitud({ id: 3 }));
    expect(salida.map(s => s.json.turno)).toEqual([0, 1, 2]);
  });

  test('UT-PRI02-12 · un lote de tres da tres items en el mismo orden', () => {
    const { salida } = calcular(
      solicitud({ id: 10, tipo_consulta: 'general' }),
      solicitud({ id: 20, tipo_consulta: 'urgencia' }),
      solicitud({ id: 30, tipo_consulta: 'control' })
    );
    expect(salida).toHaveLength(3);
    expect(salida.map(s => s.json.id_solicitud)).toEqual([10, 20, 30]);
    expect(salida.map(s => s.json.prioridad)).toEqual([5, 1, 3]);
  });

  test('UT-PRI02-13 · lote vacio: lista vacia, sin error', () => {
    expect(calcular().salida).toEqual([]);
  });

  test('UT-PRI02-14 · campos no previstos como motivo o estado no se propagan', () => {
    const { json } = calcular(solicitud()).salida[0];
    expect(json).not.toHaveProperty('motivo');
    expect(json).not.toHaveProperty('estado');
    expect(json).not.toHaveProperty('id');
  });

  test('UT-PRI02-15 · no consulta ningun nodo anterior (verify)', () => {
    const { $ } = calcular(solicitud());
    expect($).not.toHaveBeenCalled();
  });

  test('UT-PRI02-16 · devuelve exactamente los diez campos', () => {
    const { json } = calcular(solicitud()).salida[0];
    expect(Object.keys(json).sort()).toEqual([
      'especialidad_solicitada', 'fecha_preferida', 'franja_preferida', 'hora_solicitada',
      'id_medico_solicitado', 'id_paciente', 'id_solicitud', 'prioridad', 'tipo_consulta', 'turno'
    ]);
  });
});
