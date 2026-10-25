// sigac.wf09.medicoagregado.test.js
//
// pruebas unitarias del nodo Medico agregado de WF-09. traduce el
// resultado de Agrega medico:
//   colegiado_duplicado -> 409 · ok -> 201 con el token, la especialidad
//   y las franjas del horario estandar
// solo en el caso ok se devuelve el token.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-MAG09-NN

'use strict';

const medicoAgregado = require('../nodos/wf09_medico_agregado.js');
const { ejecutar } = require('../simulacion.js');

const TOKEN = 'b'.repeat(64);
const VALIDA = { especialidad: 'Pediatria', colegiado: 'COL-90001' };

const responder = (resultado, valida = VALIDA) => ejecutar(medicoAgregado, {
  entrada: [resultado],
  anteriores: { 'Valida datos': valida, 'Genera token medico': { token: TOKEN } }
});
const salidaDe = (resultado, valida) => responder(resultado, valida).salida[0].json;

describe('WF-09 · Medico agregado', () => {
  test('UT-MAG09-01 · ok: 201 completo', () => {
    expect(salidaDe({ resultado: 'ok', id_medico: 6, franjas: '10', hash_auditoria: 'abc' })).toEqual({
      codigo: 201,
      estado: 'registrado',
      mensaje: 'Medico agregado con el horario estandar',
      id_medico: 6,
      especialidad: 'Pediatria',
      franjas_de_horario: 10,
      token: TOKEN,
      aviso: 'Guarde este token ahora: no se volvera a mostrar',
      hash_auditoria: 'abc'
    });
  });

  test('UT-MAG09-02 · colegiado_duplicado: 409 con el colegiado', () => {
    expect(salidaDe({ resultado: 'colegiado_duplicado' })).toEqual({
      codigo: 409, estado: 'rechazado', mensaje: 'Ya existe un medico con el colegiado COL-90001'
    });
  });

  test('UT-MAG09-03 · colegiado duplicado: el token generado no se devuelve', () => {
    expect(JSON.stringify(responder({ resultado: 'colegiado_duplicado' }).salida)).not.toContain(TOKEN);
  });

  test('UT-MAG09-04 · las franjas llegan como texto desde postgres: salen como numero', () => {
    expect(salidaDe({ resultado: 'ok', franjas: '10' }).franjas_de_horario).toBe(10);
  });

  test('UT-MAG09-05 · la especialidad sale de Valida datos', () => {
    expect(salidaDe({ resultado: 'ok', franjas: '10' }, { ...VALIDA, especialidad: 'Ginecologia' }).especialidad).toBe('Ginecologia');
  });

  test('UT-MAG09-06 · el token sale de Genera token medico (verify)', () => {
    expect(responder({ resultado: 'ok', franjas: '10' }).$).toHaveBeenCalledWith('Genera token medico');
  });

  test('UT-MAG09-07 · ok: incluye el aviso de guardar el token', () => {
    expect(salidaDe({ resultado: 'ok', franjas: '10' }).aviso).toContain('no se volvera a mostrar');
  });

  test('UT-MAG09-08 · devuelve una lista con un solo item', () => {
    expect(responder({ resultado: 'ok', franjas: '10' }).salida).toHaveLength(1);
  });
});
