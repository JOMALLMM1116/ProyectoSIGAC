// sigac.wf09.preparacorreos.test.js
//
// pruebas unitarias del nodo Prepara correos de WF-09. arma un item por
// cada paciente que debe recibir aviso: uno por cita reasignada y uno
// por cita cancelada. es el unico nodo Code del sistema que devuelve
// varios items. si el medico no tenia citas, devuelve una lista vacia y
// Envia correo no se ejecuta.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-PRC09-NN

'use strict';

const preparaCorreos = require('../nodos/wf09_prepara_correos.js');
const { ejecutar } = require('../simulacion.js');

const REASIGNADA = {
  id_cita: 1182, correo: 'a@correo.com', paciente: 'Ana Test', fecha: '10/11/2026', hora: '08:30',
  medico_nuevo: 'Caal Tiul, Jorge Luis', especialidad: 'Pediatria'
};
const CANCELADA = { id_cita: 3744, correo: 'esp1@correo.com', paciente: 'Espera1 Prueba', fecha: '31/10/2026', hora: '09:00' };

const preparar = (detalle_reasignadas = [], detalle_canceladas = []) =>
  ejecutar(preparaCorreos, { entrada: [{ detalle_reasignadas, detalle_canceladas }] });
const correos = (r, c) => preparar(r, c).salida.map(i => i.json);

// ------------------------------------------------------------
// A. Cantidad de correos
// ------------------------------------------------------------
describe('WF-09 · Prepara correos · A. Cantidad', () => {
  test('UT-PRC09-01 · una reasignada: un correo', () => {
    expect(correos([REASIGNADA])).toHaveLength(1);
  });

  test('UT-PRC09-02 · una cancelada: un correo', () => {
    expect(correos([], [CANCELADA])).toHaveLength(1);
  });

  test('UT-PRC09-03 · siete reasignadas y una cancelada: ocho correos', () => {
    const siete = Array.from({ length: 7 }, (_, i) => ({ ...REASIGNADA, id_cita: i }));
    expect(correos(siete, [CANCELADA])).toHaveLength(8);
  });

  test('UT-PRC09-04 · sin citas: lista vacia, Envia correo no se ejecuta', () => {
    expect(preparar().salida).toEqual([]);
  });

  test.each([
    ['UT-PRC09-05', 'nulas', null, null],
    ['UT-PRC09-06', 'ausentes', undefined, undefined]
  ])('%s · listas %s: lista vacia, sin error', (_, __, r, c) => {
    expect(preparar(r, c).salida).toEqual([]);
  });

  test('UT-PRC09-07 · listas como texto json: se interpretan igual', () => {
    expect(correos(JSON.stringify([REASIGNADA]), JSON.stringify([CANCELADA]))).toHaveLength(2);
  });

  test('UT-PRC09-08 · primero los avisos de reasignacion y despues los de cancelacion', () => {
    const [a, b] = correos([REASIGNADA], [CANCELADA]);
    expect(a.para).toBe('a@correo.com');
    expect(b.para).toBe('esp1@correo.com');
  });
});

// ------------------------------------------------------------
// B. Correo de cambio de medico
// ------------------------------------------------------------
describe('WF-09 · Prepara correos · B. Cambio de medico', () => {
  const [correo] = correos([REASIGNADA]);

  test('UT-PRC09-09 · va al correo del paciente', () => {
    expect(correo.para).toBe('a@correo.com');
  });

  test('UT-PRC09-10 · el asunto nombra el cambio de medico y la fecha', () => {
    expect(correo.asunto).toBe('SIGAC - Cambio de medico en su cita del 10/11/2026');
  });

  test('UT-PRC09-11 · el texto saluda al paciente por su nombre', () => {
    expect(correo.texto.startsWith('Estimado(a) Ana Test:')).toBe(true);
  });

  test('UT-PRC09-12 · el texto dice que la cita sigue en pie, con la misma fecha y hora', () => {
    expect(correo.texto).toContain('su cita del 10/11/2026 a las 08:30 sigue en pie');
    expect(correo.texto).toContain('la fecha y la hora se mantienen');
  });

  test('UT-PRC09-13 · el texto nombra al medico nuevo y su especialidad, con la coma del nombre', () => {
    expect(correo.texto).toContain('Caal Tiul, Jorge Luis (Pediatria)');
  });
});

// ------------------------------------------------------------
// C. Correo de cancelacion
// ------------------------------------------------------------
describe('WF-09 · Prepara correos · C. Cancelacion', () => {
  const [correo] = correos([], [CANCELADA]);

  test('UT-PRC09-14 · va al correo del paciente', () => {
    expect(correo.para).toBe('esp1@correo.com');
  });

  test('UT-PRC09-15 · el asunto dice que la cita no esta disponible', () => {
    expect(correo.asunto).toBe('SIGAC - Su cita del 31/10/2026 no esta disponible');
  });

  test('UT-PRC09-16 · el texto pide llamar a la clinica para reprogramar', () => {
    expect(correo.texto).toContain('llame a la clinica');
    expect(correo.texto).toContain('reprogramar');
  });

  test('UT-PRC09-17 · el texto incluye la fecha y la hora de la cita perdida', () => {
    expect(correo.texto).toContain('31/10/2026 a las 09:00');
  });
});

// ------------------------------------------------------------
// D. Contrato y datos
// ------------------------------------------------------------
describe('WF-09 · Prepara correos · D. Contrato', () => {
  test('UT-PRC09-18 · cada item tiene exactamente para, asunto y texto', () => {
    for (const correo of correos([REASIGNADA], [CANCELADA])) {
      expect(Object.keys(correo).sort()).toEqual(['asunto', 'para', 'texto']);
    }
  });

  test('UT-PRC09-19 · los correos no incluyen el id de la cita ni datos clinicos', () => {
    const texto = JSON.stringify(correos([{ ...REASIGNADA, diagnostico: 'Faringitis' }], [CANCELADA]));
    expect(texto).not.toContain('1182');
    expect(texto).not.toContain('Faringitis');
  });

  test('UT-PRC09-20 · no consulta ningun nodo anterior (verify)', () => {
    expect(preparar([REASIGNADA]).$).not.toHaveBeenCalled();
  });
});
