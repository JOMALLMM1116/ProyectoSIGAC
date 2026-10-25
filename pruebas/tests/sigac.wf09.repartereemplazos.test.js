// sigac.wf09.repartereemplazos.test.js
//
// pruebas unitarias del nodo Reparte reemplazos de WF-09. decide, cita
// por cita, a que medico pasan las citas futuras del medico que se
// desactiva, o si se cancelan. no toca la base: trabaja sobre la
// fotografia que armo Lee situacion del medico.
//
// reglas: la cita conserva su fecha y hora; solo cambia el medico.
// primero se busca en la misma especialidad y, si no hay, en Medicina
// General. el candidato debe tener una franja ese dia que cubra la hora,
// no tener otra cita a esa hora y no haber llenado el cupo de la franja.
// entre varios, gana el de menor carga del dia; en empate, el id menor.
// cada reasignacion se anota en memoria para la siguiente cita.
//
// las fechas de prueba son martes (dia 2) y un sabado (dia 6).
//
// cada prueba lleva su ID de la tabla de pruebas: UT-RRM09-NN

'use strict';

const reparteReemplazos = require('../nodos/wf09_reparte_reemplazos.js');
const { ejecutar } = require('../simulacion.js');

const MARTES = '2026-11-10';
const SABADO = '2026-10-31';

// horario estandar de la clinica, como lo devuelve la consulta
function horarioEstandar(cuposManana = 8, cuposTarde = 7) {
  const franjas = [];
  for (let dia = 1; dia <= 5; dia++) {
    const reducido = dia === 3;
    franjas.push({ dia, inicio: '08:00', fin: '12:00', cupos: reducido ? 2 : cuposManana });
    franjas.push({ dia, inicio: '13:30', fin: '17:00', cupos: reducido ? 2 : cuposTarde });
  }
  return franjas;
}

const candidato = (id, especialidad, ocupadas = [], franjas = horarioEstandar()) =>
  ({ id, especialidad, franjas, ocupadas });
const ocupada = (hora, fecha = MARTES) => ({ fecha, hora });
const cita = (id, hora, fecha = MARTES, dia = 2) => ({ id, fecha, hora, dia });

const PEDIATRA_SALE = { id: 2, especialidad: 'Pediatria', activo: true, baja_en: null };

function repartir({ medico = PEDIATRA_SALE, citas = [], candidatos = [], baja = false }) {
  return ejecutar(reparteReemplazos, {
    entrada: [{ medico, citas, candidatos }],
    anteriores: { 'Valida datos': { id: medico ? medico.id : 99, baja } }
  });
}

const planDe = opciones => repartir(opciones).salida[0].json;

// ------------------------------------------------------------
// A. Medico inexistente o dado de baja
// ------------------------------------------------------------
describe('WF-09 · Reparte reemplazos · A. Estado del medico', () => {
  test('UT-RRM09-01 · medico nulo: no_existe', () => {
    expect(planDe({ medico: null })).toEqual({ resultado: 'no_existe' });
  });

  test('UT-RRM09-02 · medico con baja: ya_baja, sin plan', () => {
    expect(planDe({ medico: { ...PEDIATRA_SALE, baja_en: '2026-10-23T20:00:00Z' } })).toEqual({ resultado: 'ya_baja' });
  });

  test('UT-RRM09-03 · medico activo sin citas: ok con listas vacias', () => {
    const plan = planDe({});
    expect(plan.resultado).toBe('ok');
    expect(plan.reasignar).toEqual([]);
    expect(plan.cancelar).toEqual([]);
  });

  test('UT-RRM09-04 · medico ya inactivo pero sin baja: se puede dar de baja (ok)', () => {
    expect(planDe({ medico: { ...PEDIATRA_SALE, activo: false } }).resultado).toBe('ok');
  });
});

// ------------------------------------------------------------
// B. A quien pasa cada cita
// ------------------------------------------------------------
describe('WF-09 · Reparte reemplazos · B. Reemplazo', () => {
  test('UT-RRM09-05 · un medico de la misma especialidad libre: la cita pasa a el', () => {
    const plan = planDe({ citas: [cita(1182, '08:30')], candidatos: [candidato(6, 'Pediatria')] });
    expect(plan.reasignar).toEqual([{ id_cita: 1182, id_medico: 6 }]);
    expect(plan.cancelar).toEqual([]);
  });

  test('UT-RRM09-06 · sin medico de la especialidad: pasa a Medicina General', () => {
    const plan = planDe({ citas: [cita(1182, '08:30')], candidatos: [candidato(1, 'Medicina General')] });
    expect(plan.reasignar).toEqual([{ id_cita: 1182, id_medico: 1 }]);
  });

  test('UT-RRM09-07 · la misma especialidad tiene prioridad aunque Medicina General tenga menos carga', () => {
    const plan = planDe({
      citas: [cita(1182, '08:30')],
      candidatos: [candidato(1, 'Medicina General'), candidato(6, 'Pediatria', [ocupada('09:00'), ocupada('10:00')])]
    });
    expect(plan.reasignar[0].id_medico).toBe(6);
  });

  test('UT-RRM09-08 · sin candidatos: la cita se cancela', () => {
    const plan = planDe({ citas: [cita(1182, '08:30')], candidatos: [] });
    expect(plan.reasignar).toEqual([]);
    expect(plan.cancelar).toEqual([1182]);
  });

  test('UT-RRM09-09 · cita un sabado: nadie tiene franja ese dia, se cancela', () => {
    const plan = planDe({ citas: [cita(3744, '09:00', SABADO, 6)], candidatos: [candidato(6, 'Pediatria')] });
    expect(plan.cancelar).toEqual([3744]);
  });

  test('UT-RRM09-10 · cita en el horario de almuerzo (12:30): se cancela', () => {
    expect(planDe({ citas: [cita(1, '12:30')], candidatos: [candidato(6, 'Pediatria')] }).cancelar).toEqual([1]);
  });

  test('UT-RRM09-11 · el fin de la franja no esta incluido: 12:00 se cancela, 08:00 se reasigna', () => {
    const plan = planDe({ citas: [cita(1, '12:00'), cita(2, '08:00')], candidatos: [candidato(6, 'Pediatria')] });
    expect(plan.cancelar).toEqual([1]);
    expect(plan.reasignar).toEqual([{ id_cita: 2, id_medico: 6 }]);
  });
});

// ------------------------------------------------------------
// C. Disponibilidad del candidato
// ------------------------------------------------------------
describe('WF-09 · Reparte reemplazos · C. Disponibilidad', () => {
  test('UT-RRM09-12 · el candidato ya tiene una cita a esa hora: no puede tomarla', () => {
    const plan = planDe({ citas: [cita(1, '08:30')], candidatos: [candidato(6, 'Pediatria', [ocupada('08:30')])] });
    expect(plan.cancelar).toEqual([1]);
  });

  test('UT-RRM09-13 · una cita del candidato en otra fecha no estorba', () => {
    const plan = planDe({ citas: [cita(1, '08:30')], candidatos: [candidato(6, 'Pediatria', [ocupada('08:30', '2026-11-11')])] });
    expect(plan.reasignar).toEqual([{ id_cita: 1, id_medico: 6 }]);
  });

  test('UT-RRM09-14 · la franja del candidato ya llego a su cupo: no puede tomarla', () => {
    const lleno = candidato(6, 'Pediatria', [ocupada('08:00'), ocupada('08:30')], horarioEstandar(2));
    expect(planDe({ citas: [cita(1, '10:00')], candidatos: [lleno] }).cancelar).toEqual([1]);
  });

  test('UT-RRM09-15 · la franja de la manana llena no impide reasignar por la tarde', () => {
    const llenoManana = candidato(6, 'Pediatria', [ocupada('08:00'), ocupada('08:30')], horarioEstandar(2));
    expect(planDe({ citas: [cita(1, '15:00')], candidatos: [llenoManana] }).reasignar).toEqual([{ id_cita: 1, id_medico: 6 }]);
  });

  test('UT-RRM09-16 · si el candidato de la especialidad no puede, se busca en Medicina General', () => {
    const plan = planDe({
      citas: [cita(1, '08:30')],
      candidatos: [candidato(6, 'Pediatria', [ocupada('08:30')]), candidato(1, 'Medicina General')]
    });
    expect(plan.reasignar).toEqual([{ id_cita: 1, id_medico: 1 }]);
  });
});

// ------------------------------------------------------------
// D. Eleccion entre varios candidatos
// ------------------------------------------------------------
describe('WF-09 · Reparte reemplazos · D. Eleccion', () => {
  test('UT-RRM09-17 · gana el de menor carga ese dia', () => {
    const plan = planDe({
      citas: [cita(1, '10:00')],
      candidatos: [candidato(1, 'Medicina General', [ocupada('08:00'), ocupada('08:30')]), candidato(4, 'Medicina General', [ocupada('08:00')])],
      medico: { id: 9, especialidad: 'Ginecologia', baja_en: null }
    });
    expect(plan.reasignar[0].id_medico).toBe(4);
  });

  test('UT-RRM09-18 · en empate de carga, gana el id menor', () => {
    const plan = planDe({
      citas: [cita(1, '10:00')],
      candidatos: [candidato(4, 'Medicina General'), candidato(1, 'Medicina General')],
      medico: { id: 9, especialidad: 'Ginecologia', baja_en: null }
    });
    expect(plan.reasignar[0].id_medico).toBe(1);
  });

  test('UT-RRM09-19 · si el que sale es de Medicina General, no se busca en otra especialidad', () => {
    const plan = planDe({
      medico: { id: 1, especialidad: 'Medicina General', baja_en: null },
      citas: [cita(1, '08:30')],
      candidatos: [candidato(4, 'Medicina General', [ocupada('08:30')]), candidato(2, 'Pediatria')]
    });
    expect(plan.cancelar).toEqual([1]);
  });
});

// ------------------------------------------------------------
// E. Memoria entre citas del mismo plan
// ------------------------------------------------------------
describe('WF-09 · Reparte reemplazos · E. Memoria', () => {
  test('UT-RRM09-20 · siete citas del martes pasan al pediatra libre (caso real del medico 2)', () => {
    const horas = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '15:00'];
    const citas = horas.map((h, i) => cita(100 + i, h));
    const plan = planDe({ citas, candidatos: [candidato(6, 'Pediatria')] });
    expect(plan.reasignar).toHaveLength(7);
    expect(plan.reasignar.every(r => r.id_medico === 6)).toBe(true);
    expect(plan.cancelar).toEqual([]);
  });

  test('UT-RRM09-21 · el cupo se descuenta en memoria: la segunda cita va a otro candidato', () => {
    const plan = planDe({
      citas: [cita(1, '08:00'), cita(2, '08:30')],
      candidatos: [candidato(6, 'Pediatria', [], horarioEstandar(1)), candidato(1, 'Medicina General')]
    });
    expect(plan.reasignar).toEqual([{ id_cita: 1, id_medico: 6 }, { id_cita: 2, id_medico: 1 }]);
  });

  test('UT-RRM09-22 · sin otro candidato, la cita que excede el cupo se cancela', () => {
    const plan = planDe({
      citas: [cita(1, '08:00'), cita(2, '08:30')],
      candidatos: [candidato(6, 'Pediatria', [], horarioEstandar(1))]
    });
    expect(plan.reasignar).toEqual([{ id_cita: 1, id_medico: 6 }]);
    expect(plan.cancelar).toEqual([2]);
  });

  test('UT-RRM09-23 · la carga en memoria cambia la eleccion de la siguiente cita', () => {
    const plan = planDe({
      medico: { id: 9, especialidad: 'Ginecologia', baja_en: null },
      citas: [cita(1, '08:00'), cita(2, '08:30')],
      candidatos: [candidato(1, 'Medicina General'), candidato(4, 'Medicina General')]
    });
    expect(plan.reasignar).toEqual([{ id_cita: 1, id_medico: 1 }, { id_cita: 2, id_medico: 4 }]);
  });
});

// ------------------------------------------------------------
// F. Formato de entrada y contrato
// ------------------------------------------------------------
describe('WF-09 · Reparte reemplazos · F. Formato y contrato', () => {
  test('UT-RRM09-24 · medico, citas y candidatos como texto json: se interpretan igual', () => {
    const { salida } = ejecutar(reparteReemplazos, {
      entrada: [{
        medico: JSON.stringify(PEDIATRA_SALE),
        citas: JSON.stringify([cita(1, '08:30')]),
        candidatos: JSON.stringify([candidato(6, 'Pediatria')])
      }],
      anteriores: { 'Valida datos': { id: 2, baja: false } }
    });
    expect(salida[0].json.reasignar).toEqual([{ id_cita: 1, id_medico: 6 }]);
  });

  test('UT-RRM09-25 · franjas y ocupadas del candidato como texto json: se interpretan igual', () => {
    const c = { id: 6, especialidad: 'Pediatria', franjas: JSON.stringify(horarioEstandar()), ocupadas: JSON.stringify([ocupada('08:30')]) };
    expect(planDe({ citas: [cita(1, '08:30'), cita(2, '09:00')], candidatos: [c] }))
      .toMatchObject({ cancelar: [1], reasignar: [{ id_cita: 2, id_medico: 6 }] });
  });

  test('UT-RRM09-26 · las listas tambien viajan como texto json para la consulta siguiente', () => {
    const plan = planDe({ citas: [cita(1, '08:30'), cita(3744, '09:00', SABADO, 6)], candidatos: [candidato(6, 'Pediatria')] });
    expect(plan.reasignar_json).toBe(JSON.stringify(plan.reasignar));
    expect(plan.cancelar_json).toBe('[3744]');
  });

  test.each([
    ['UT-RRM09-27', true],
    ['UT-RRM09-28', false]
  ])('%s · la bandera baja %p sale de Valida datos', (_, baja) => {
    expect(planDe({ baja }).baja).toBe(baja);
  });

  test('UT-RRM09-29 · el plan conserva el orden de las citas', () => {
    const plan = planDe({ citas: [cita(30, '10:00'), cita(10, '08:00'), cita(20, '09:00')], candidatos: [candidato(6, 'Pediatria')] });
    expect(plan.reasignar.map(r => r.id_cita)).toEqual([30, 10, 20]);
  });

  test('UT-RRM09-30 · consulta Valida datos (verify)', () => {
    expect(repartir({}).$).toHaveBeenCalledWith('Valida datos');
  });

  test('UT-RRM09-31 · devuelve un item con los siete campos del plan', () => {
    const { salida } = repartir({});
    expect(salida).toHaveLength(1);
    expect(Object.keys(salida[0].json).sort()).toEqual(['baja', 'cancelar', 'cancelar_json', 'id_medico', 'reasignar', 'reasignar_json', 'resultado']);
  });
});

// ------------------------------------------------------------
// G. Traslapes (hipotesis C)
// ------------------------------------------------------------
// la misma regla que en Reparte cupos: cada cita dura 30 minutos, pero
// solo se compara la hora exacta.
describe('WF-09 · Reparte reemplazos · G. Traslapes', () => {
  test('UT-RRM09-32 · cita a las 08:15 y el candidato con una cita a las 08:00: no debe pasarle (hipotesis C)', () => {
    const plan = planDe({ citas: [cita(1, '08:15')], candidatos: [candidato(6, 'Pediatria', [ocupada('08:00')])] });
    expect(plan.reasignar).toEqual([]);
    expect(plan.cancelar).toEqual([1]);
  });
});
