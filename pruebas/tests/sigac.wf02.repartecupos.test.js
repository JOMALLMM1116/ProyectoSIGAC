// sigac.wf02.repartecupos.test.js
//
// pruebas unitarias del nodo Reparte cupos de WF-02. recibe el lote de
// solicitudes de Calcula prioridad y las franjas de Busca cupo, y le
// asigna a cada solicitud un medico y una hora, o la deja sin cupo para
// que vaya a lista de espera.
//
// reglas: el sistema decide solo lo que el paciente no decidio. si pidio
// medico, solo ese; si no, la especialidad pedida, y sin especialidad,
// Medicina General. respeta la franja y la hora pedidas, elige al medico
// con menos carga y asigna el primer hueco de 30 minutos libre. todo se
// lleva en memoria, porque la base todavia no refleja el lote.
//
// el catalogo simulado de franjas (como lo devuelve Busca cupo):
//   medico 1 Medicina General · medico 4 Medicina General · medico 2 Pediatria
//   manana 08:00-12:00 con 8 cupos · tarde 13:30-17:00 con 7 cupos
//
// cada prueba lleva su ID de la tabla de pruebas: UT-REP02-NN

'use strict';

const reparteCupos = require('../nodos/wf02_reparte_cupos.js');
const { ejecutar } = require('../simulacion.js');

// una fila de Busca cupo: una franja de un medico ese dia
const franja = (id_medico, especialidad, hora_inicio, hora_fin, cupos, ocupados = 0, horas_ocupadas = '') =>
  ({ id_medico, especialidad, hora_inicio, hora_fin, cupos, ocupados, horas_ocupadas });

const manana = (id, esp, ocupados = 0, horas = '') => franja(id, esp, '08:00:00', '12:00:00', 8, ocupados, horas);
const tarde = (id, esp, ocupados = 0, horas = '') => franja(id, esp, '13:30:00', '17:00:00', 7, ocupados, horas);

// el catalogo: el medico 1 ya tiene carga y el 4 no
const CATALOGO = () => [
  manana(1, 'Medicina General', 2, '08:00,08:30'),
  tarde(1, 'Medicina General', 2, '13:30,14:00'),
  manana(4, 'Medicina General'),
  tarde(4, 'Medicina General'),
  manana(2, 'Pediatria'),
  tarde(2, 'Pediatria')
];

// una solicitud tal como sale de Calcula prioridad
const solicitud = (cambios = {}) => ({
  id_solicitud: 71,
  id_paciente: 55,
  tipo_consulta: 'general',
  fecha_preferida: '2026-10-27',
  prioridad: 5,
  turno: 0,
  franja_preferida: 'indiferente',
  hora_solicitada: null,
  especialidad_solicitada: null,
  id_medico_solicitado: null,
  ...cambios
});

// ejecuta el nodo con las franjas y el lote indicados
function repartir(franjas, ...lote) {
  return ejecutar(reparteCupos, {
    anteriores: { 'Busca cupo': franjas, 'Calcula prioridad': lote }
  });
}

// atajo: medico y hora asignados a cada solicitud del lote
const asignado = (franjas, ...lote) =>
  repartir(franjas, ...lote).salida.map(s => [s.json.id_medico, s.json.hora_inicio]);

// ------------------------------------------------------------
// A. Quien atiende
// ------------------------------------------------------------
describe('WF-02 · Reparte cupos · A. Quien atiende', () => {
  test('UT-REP02-01 · sin preferencias: Medicina General, el medico con menos carga', () => {
    expect(asignado(CATALOGO(), solicitud())).toEqual([[4, '08:00:00']]);
  });

  test('UT-REP02-02 · especialidad pedida: un medico de esa especialidad', () => {
    expect(asignado(CATALOGO(), solicitud({ especialidad_solicitada: 'Pediatria' }))).toEqual([[2, '08:00:00']]);
  });

  test('UT-REP02-03 · medico pedido: solo ese, aunque otro tenga menos carga', () => {
    expect(asignado(CATALOGO(), solicitud({ id_medico_solicitado: 1 }))[0][0]).toBe(1);
  });

  test('UT-REP02-04 · medico pedido como texto: se compara como numero', () => {
    expect(asignado(CATALOGO(), solicitud({ id_medico_solicitado: '2' }))[0][0]).toBe(2);
  });

  test('UT-REP02-05 · especialidad sin medicos en las franjas: sin cupo', () => {
    expect(asignado(CATALOGO(), solicitud({ especialidad_solicitada: 'Ginecologia' }))).toEqual([[null, null]]);
  });

  test('UT-REP02-06 · medico pedido que no aparece en las franjas: sin cupo', () => {
    expect(asignado(CATALOGO(), solicitud({ id_medico_solicitado: 5 }))).toEqual([[null, null]]);
  });
});

// ------------------------------------------------------------
// B. Franja y hora
// ------------------------------------------------------------
describe('WF-02 · Reparte cupos · B. Franja y hora', () => {
  test('UT-REP02-07 · franja tarde: el primer hueco de la tarde', () => {
    expect(asignado(CATALOGO(), solicitud({ franja_preferida: 'tarde' }))).toEqual([[4, '13:30:00']]);
  });

  test('UT-REP02-08 · franja manana: el primer hueco de la manana', () => {
    expect(asignado(CATALOGO(), solicitud({ franja_preferida: 'manana' }))).toEqual([[4, '08:00:00']]);
  });

  test('UT-REP02-09 · franja indiferente: no filtra por franja', () => {
    const soloTarde = [tarde(4, 'Medicina General')];
    expect(asignado(soloTarde, solicitud({ franja_preferida: 'indiferente' }))).toEqual([[4, '13:30:00']]);
  });

  test('UT-REP02-10 · hora exacta libre: se asigna esa hora', () => {
    expect(asignado(CATALOGO(), solicitud({ hora_solicitada: '10:00' }))).toEqual([[4, '10:00:00']]);
  });

  test('UT-REP02-11 · hora exacta ya tomada en la base: sin cupo con ese medico', () => {
    expect(asignado(CATALOGO(), solicitud({ id_medico_solicitado: 1, hora_solicitada: '08:30' })))
      .toEqual([[null, null]]);
  });

  test('UT-REP02-12 · hora exacta fuera de las franjas (12:30): sin cupo', () => {
    expect(asignado(CATALOGO(), solicitud({ hora_solicitada: '12:30' }))).toEqual([[null, null]]);
  });

  test('UT-REP02-13 · hora exacta con segundos (HH:MM:SS): se interpreta igual', () => {
    expect(asignado(CATALOGO(), solicitud({ hora_solicitada: '10:00:00' }))).toEqual([[4, '10:00:00']]);
  });

  test('UT-REP02-14 · hora en la franja equivocada: sin cupo', () => {
    expect(asignado(CATALOGO(), solicitud({ franja_preferida: 'tarde', hora_solicitada: '09:00' })))
      .toEqual([[null, null]]);
  });
});

// ------------------------------------------------------------
// C. Primer hueco libre (defecto 12.15)
// ------------------------------------------------------------
describe('WF-02 · Reparte cupos · C. Primer hueco libre', () => {
  test('UT-REP02-15 · salta las horas ya tomadas: 08:00 y 08:30 ocupadas da 09:00', () => {
    expect(asignado(CATALOGO(), solicitud({ id_medico_solicitado: 1, franja_preferida: 'manana' })))
      .toEqual([[1, '09:00:00']]);
  });

  test('UT-REP02-16 · horas ocupadas con segundos: se interpretan igual', () => {
    const conSegundos = [manana(1, 'Medicina General', 1, '08:00:00')];
    expect(asignado(conSegundos, solicitud())).toEqual([[1, '08:30:00']]);
  });

  test('UT-REP02-17 · franja con cupos pero sin huecos de 30 minutos: sin cupo', () => {
    const corta = [franja(1, 'Medicina General', '08:00:00', '09:00:00', 5, 2, '08:00,08:30')];
    expect(asignado(corta, solicitud())).toEqual([[null, null]]);
  });

  test('UT-REP02-18 · franja llena (cupos iguales a ocupados): pasa al otro medico', () => {
    const llena = [franja(1, 'Medicina General', '08:00:00', '12:00:00', 2, 2, '08:00,08:30'), manana(4, 'Medicina General', 3)];
    expect(asignado(llena, solicitud())).toEqual([[4, '08:00:00']]);
  });

  test('UT-REP02-19 · cupos y ocupados como texto: se convierten a numero', () => {
    const comoTexto = [franja(1, 'Medicina General', '08:00:00', '12:00:00', '8', '1', '08:00')];
    expect(asignado(comoTexto, solicitud())).toEqual([[1, '08:30:00']]);
  });
});

// ------------------------------------------------------------
// D. Lote en memoria
// ------------------------------------------------------------
describe('WF-02 · Reparte cupos · D. Lote en memoria', () => {
  test('UT-REP02-20 · dos solicitudes con el mismo medico: horas distintas', () => {
    const uno = [manana(1, 'Medicina General')];
    expect(asignado(uno, solicitud({ id_solicitud: 1 }), solicitud({ id_solicitud: 2 })))
      .toEqual([[1, '08:00:00'], [1, '08:30:00']]);
  });

  test('UT-REP02-21 · el cupo se descuenta: la segunda solicitud va al otro medico', () => {
    const unCupo = [franja(1, 'Medicina General', '08:00:00', '12:00:00', 1), franja(4, 'Medicina General', '08:00:00', '12:00:00', 1)];
    expect(asignado(unCupo, solicitud({ id_solicitud: 1 }), solicitud({ id_solicitud: 2 })))
      .toEqual([[1, '08:00:00'], [4, '08:00:00']]);
  });

  test('UT-REP02-22 · la misma hora exacta pedida dos veces: solo la primera la obtiene', () => {
    const uno = [manana(1, 'Medicina General')];
    expect(asignado(uno, solicitud({ hora_solicitada: '10:00' }), solicitud({ hora_solicitada: '10:00' })))
      .toEqual([[1, '10:00:00'], [null, null]]);
  });

  test('UT-REP02-23 · franjas repetidas por Busca cupo se cuentan una sola vez', () => {
    // Busca cupo repite cada franja una vez por solicitud de entrada:
    // un cupo no debe convertirse en dos
    const repetida = franja(1, 'Medicina General', '08:00:00', '12:00:00', 1);
    expect(asignado([repetida, { ...repetida }], solicitud({ id_solicitud: 1 }), solicitud({ id_solicitud: 2 })))
      .toEqual([[1, '08:00:00'], [null, null]]);
  });

  test('UT-REP02-24 · lote vacio: lista vacia', () => {
    expect(repartir(CATALOGO()).salida).toEqual([]);
  });
});

// ------------------------------------------------------------
// E. Entradas vacias y contrato
// ------------------------------------------------------------
describe('WF-02 · Reparte cupos · E. Entradas vacias y contrato', () => {
  test('UT-REP02-25 · sin franjas: todas sin cupo', () => {
    expect(asignado([], solicitud())).toEqual([[null, null]]);
  });

  test('UT-REP02-26 · fila vacia de Busca cupo (sin id_medico): se ignora', () => {
    expect(asignado([{}, manana(4, 'Medicina General')], solicitud())).toEqual([[4, '08:00:00']]);
  });

  test('UT-REP02-27 · con cupo: conserva los campos de la solicitud y agrega medico y hora', () => {
    const { salida } = repartir(CATALOGO(), solicitud({ id_solicitud: 99, prioridad: 1 }));
    expect(salida[0].json).toEqual({ ...solicitud({ id_solicitud: 99, prioridad: 1 }), id_medico: 4, hora_inicio: '08:00:00' });
  });

  test('UT-REP02-28 · sin cupo: conserva los campos y deja medico y hora nulos', () => {
    const { salida } = repartir([], solicitud({ id_solicitud: 99 }));
    expect(salida[0].json).toEqual({ ...solicitud({ id_solicitud: 99 }), id_medico: null, hora_inicio: null });
  });

  test('UT-REP02-29 · consulta Busca cupo y Calcula prioridad (verify)', () => {
    const { $ } = repartir(CATALOGO(), solicitud());
    expect($).toHaveBeenCalledWith('Busca cupo');
    expect($).toHaveBeenCalledWith('Calcula prioridad');
  });
});

// ------------------------------------------------------------
// F. Traslapes (hipotesis C)
// ------------------------------------------------------------
// cada cita dura 30 minutos. el nodo solo evita repetir la hora exacta,
// asi que una cita a las 08:15 se cruza con otra a las 08:00. el indice
// uqcita_medico_horario de la base tampoco lo impide, porque solo
// compara la hora exacta.
describe('WF-02 · Reparte cupos · F. Traslapes', () => {
  test('UT-REP02-30 · hora pedida 08:15 con una cita a las 08:00: no debe asignarse (hipotesis C)', () => {
    const conCita = [manana(1, 'Medicina General', 1, '08:00')];
    expect(asignado(conCita, solicitud({ hora_solicitada: '08:15' }))).toEqual([[null, null]]);
  });

  test('UT-REP02-31 · cita existente a las 08:15: el hueco automatico no debe cruzarse con ella (hipotesis C)', () => {
    const conCita = [manana(1, 'Medicina General', 1, '08:15')];
    expect(asignado(conCita, solicitud())).toEqual([[1, '09:00:00']]);
  });
});
