// sigac.wf07.validadatos.test.js
//
// pruebas unitarias del nodo Valida datos de WF-07. revisa el cuerpo de
// la nota clinica: id_cita, diagnostico (obligatorio) e indicaciones
// (opcionales), con un maximo de 2000 caracteres cada uno. los errores
// se acumulan y se devuelven todos juntos.
//
// el medico que firma NO se lee del cuerpo: sale de Verifica token. asi
// nadie puede escribir una nota a nombre de otro medico.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-VAL07-NN

'use strict';

const validaDatos = require('../nodos/wf07_valida_datos.js');
const { ejecutar } = require('../simulacion.js');

const valida = () => ({ id_cita: 3432, diagnostico: 'Faringitis aguda', indicaciones: 'Reposo' });

function validar(cuerpo, medico = { rol: 'medico', id_medico: 2 }, hash = { datos: cuerpo }) {
  return ejecutar(validaDatos, { anteriores: { 'Hash del token': hash, 'Verifica token': medico } });
}

const salidaDe = cambios => validar({ ...valida(), ...cambios }).salida[0].json;

// ------------------------------------------------------------
// A. id_cita
// ------------------------------------------------------------
describe('WF-07 · Valida datos · A. id_cita', () => {
  test.each([
    ['UT-VAL07-01', 'numero', 3432, 3432],
    ['UT-VAL07-02', 'texto numerico', '3432', 3432]
  ])('%s · id_cita como %s: valido', (_, __, id_cita, esperado) => {
    const salida = salidaDe({ id_cita });
    expect(salida.valido).toBe(true);
    expect(salida.id_cita).toBe(esperado);
  });

  test.each([
    ['UT-VAL07-03', 'cero', 0],
    ['UT-VAL07-04', 'negativo', -1],
    ['UT-VAL07-05', 'decimal', 2.5],
    ['UT-VAL07-06', 'texto', 'abc'],
    ['UT-VAL07-07', 'ausente', undefined],
    ['UT-VAL07-08', 'vacio', '']
  ])('%s · id_cita %s: error', (_, __, id_cita) => {
    expect(salidaDe({ id_cita }).errores).toContain('id_cita debe ser un entero positivo');
  });

  // hipotesis A: Number(true) es 1, asi que true se aceptaria como la
  // cita 1. un identificador se envia como numero, nunca como booleano.
  test('UT-VAL07-09 · id_cita true: debe rechazarse (hipotesis A)', () => {
    expect(salidaDe({ id_cita: true }).valido).toBe(false);
  });
});

// ------------------------------------------------------------
// B. Diagnostico
// ------------------------------------------------------------
describe('WF-07 · Valida datos · B. Diagnostico', () => {
  test('UT-VAL07-10 · diagnostico presente: valido', () => {
    expect(salidaDe({}).valido).toBe(true);
  });

  test.each([
    ['UT-VAL07-11', 'ausente', undefined],
    ['UT-VAL07-12', 'vacio', ''],
    ['UT-VAL07-13', 'con solo espacios', '   '],
    ['UT-VAL07-14', 'que no es texto', 12345]
  ])('%s · diagnostico %s: error, es obligatorio', (_, __, diagnostico) => {
    expect(salidaDe({ diagnostico }).errores).toContain('diagnostico es obligatorio');
  });

  test('UT-VAL07-15 · diagnostico con espacios: sale recortado', () => {
    expect(salidaDe({ diagnostico: '  Faringitis  ' }).diagnostico).toBe('Faringitis');
  });

  test.each([
    ['UT-VAL07-16', 2000, true],
    ['UT-VAL07-17', 2001, false]
  ])('%s · diagnostico de %i caracteres', (_, largo, esperado) => {
    expect(salidaDe({ diagnostico: 'x'.repeat(largo) }).valido).toBe(esperado);
  });
});

// ------------------------------------------------------------
// C. Indicaciones (opcionales)
// ------------------------------------------------------------
describe('WF-07 · Valida datos · C. Indicaciones', () => {
  test.each([
    ['UT-VAL07-18', 'ausentes', undefined],
    ['UT-VAL07-19', 'nulas', null],
    ['UT-VAL07-20', 'vacias', '']
  ])('%s · indicaciones %s: valido y quedan nulas', (_, __, indicaciones) => {
    const salida = salidaDe({ indicaciones });
    expect(salida.valido).toBe(true);
    expect(salida.indicaciones).toBeNull();
  });

  test('UT-VAL07-21 · indicaciones con espacios: salen recortadas', () => {
    expect(salidaDe({ indicaciones: '  Reposo  ' }).indicaciones).toBe('Reposo');
  });

  test('UT-VAL07-22 · indicaciones con solo espacios: quedan como texto vacio, no nulas', () => {
    expect(salidaDe({ indicaciones: '   ' }).indicaciones).toBe('');
  });

  test('UT-VAL07-23 · indicaciones que no son texto: error', () => {
    expect(salidaDe({ indicaciones: 5 }).errores).toContain('indicaciones debe ser texto');
  });

  test.each([
    ['UT-VAL07-24', 2000, true],
    ['UT-VAL07-25', 2001, false]
  ])('%s · indicaciones de %i caracteres', (_, largo, esperado) => {
    expect(salidaDe({ indicaciones: 'x'.repeat(largo) }).valido).toBe(esperado);
  });
});

// ------------------------------------------------------------
// D. Firma, conjunto y contrato
// ------------------------------------------------------------
describe('WF-07 · Valida datos · D. Firma y contrato', () => {
  test('UT-VAL07-26 · el medico que firma sale de Verifica token', () => {
    expect(validar(valida(), { rol: 'medico', id_medico: 4 }).salida[0].json.id_medico).toBe(4);
  });

  test('UT-VAL07-27 · un id_medico en el cuerpo se ignora: nadie firma por otro', () => {
    expect(validar({ ...valida(), id_medico: 1 }, { rol: 'medico', id_medico: 2 }).salida[0].json.id_medico).toBe(2);
  });

  test('UT-VAL07-28 · cuerpo vacio: los dos errores juntos', () => {
    expect(validar({}).salida[0].json.errores).toEqual(['id_cita debe ser un entero positivo', 'diagnostico es obligatorio']);
  });

  test('UT-VAL07-29 · Hash del token sin datos: no falla y valida como cuerpo vacio', () => {
    expect(validar(undefined, undefined, {}).salida[0].json.errores).toHaveLength(2);
  });

  test('UT-VAL07-30 · consulta Hash del token y Verifica token (verify)', () => {
    const { $ } = validar(valida());
    expect($).toHaveBeenCalledWith('Hash del token');
    expect($).toHaveBeenCalledWith('Verifica token');
  });

  test('UT-VAL07-31 · devuelve un item con los seis campos', () => {
    const { salida } = validar(valida());
    expect(salida).toHaveLength(1);
    expect(Object.keys(salida[0].json).sort())
      .toEqual(['diagnostico', 'errores', 'id_cita', 'id_medico', 'indicaciones', 'valido']);
  });
});
