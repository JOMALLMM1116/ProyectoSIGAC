// sigac.wf08.validadatos.test.js
//
// pruebas unitarias del nodo Valida datos de WF-08. el medico solo envia
// el id de la cita: el paciente se deduce de la cita, nunca se recibe
// directamente. el medico sale de Verifica token.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-VAL08-NN

'use strict';

const validaDatos = require('../nodos/wf08_valida_datos.js');
const { ejecutar } = require('../simulacion.js');

function validar(cuerpo, medico = { rol: 'medico', id_medico: 1 }, hash = { datos: cuerpo }) {
  return ejecutar(validaDatos, { anteriores: { 'Hash del token': hash, 'Verifica token': medico } });
}

const salidaDe = cuerpo => validar(cuerpo).salida[0].json;

describe('WF-08 · Valida datos', () => {
  test.each([
    ['UT-VAL08-01', 'numero', 3432, 3432],
    ['UT-VAL08-02', 'texto numerico', '3432', 3432]
  ])('%s · id_cita como %s: valido', (_, __, id_cita, esperado) => {
    const salida = salidaDe({ id_cita });
    expect(salida.valido).toBe(true);
    expect(salida.id_cita).toBe(esperado);
  });

  test.each([
    ['UT-VAL08-03', 'cero', 0],
    ['UT-VAL08-04', 'negativo', -1],
    ['UT-VAL08-05', 'decimal', 2.5],
    ['UT-VAL08-06', 'texto', 'abc'],
    ['UT-VAL08-07', 'ausente', undefined]
  ])('%s · id_cita %s: error', (_, __, id_cita) => {
    expect(salidaDe({ id_cita }).errores).toEqual(['id_cita debe ser un entero positivo']);
  });

  // hipotesis A: Number(true) es 1
  test('UT-VAL08-08 · id_cita true: debe rechazarse (hipotesis A)', () => {
    expect(salidaDe({ id_cita: true }).valido).toBe(false);
  });

  test('UT-VAL08-09 · un id_paciente en el cuerpo se ignora: el paciente sale de la cita', () => {
    const salida = salidaDe({ id_cita: 3432, id_paciente: 55 });
    expect(salida).not.toHaveProperty('id_paciente');
  });

  test('UT-VAL08-10 · el medico sale de Verifica token', () => {
    expect(validar({ id_cita: 1, id_medico: 9 }, { rol: 'medico', id_medico: 2 }).salida[0].json.id_medico).toBe(2);
  });

  test('UT-VAL08-11 · Hash del token sin datos: no falla y da el error de id_cita', () => {
    expect(validar(undefined, undefined, {}).salida[0].json.valido).toBe(false);
  });

  test('UT-VAL08-12 · consulta Hash del token y Verifica token (verify)', () => {
    const { $ } = validar({ id_cita: 1 });
    expect($).toHaveBeenCalledWith('Hash del token');
    expect($).toHaveBeenCalledWith('Verifica token');
  });

  test('UT-VAL08-13 · devuelve un item con los cuatro campos', () => {
    const { salida } = validar({ id_cita: 1 });
    expect(salida).toHaveLength(1);
    expect(Object.keys(salida[0].json).sort()).toEqual(['errores', 'id_cita', 'id_medico', 'valido']);
  });
});
