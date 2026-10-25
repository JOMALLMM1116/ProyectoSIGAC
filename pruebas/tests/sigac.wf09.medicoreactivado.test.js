// sigac.wf09.medicoreactivado.test.js
//
// pruebas unitarias del nodo Medico reactivado de WF-09. traduce el
// resultado de Reactiva medico al codigo de respuesta:
//   no_existe -> 404 · ya_baja -> 409 · ya_activo -> 409 · ok -> 200 con token nuevo
// las citas reasignadas o canceladas al desactivarlo no se restauran.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-MRE09-NN

'use strict';

const medicoReactivado = require('../nodos/wf09_medico_reactivado.js');
const { ejecutar } = require('../simulacion.js');

const TOKEN = 'a1'.repeat(32);
const responder = (resultado, id = 6) => ejecutar(medicoReactivado, {
  entrada: [resultado],
  anteriores: { 'Valida datos': { id }, 'Genera token medico nuevo': { token: TOKEN } }
});
const salidaDe = (resultado, id) => responder(resultado, id).salida[0].json;

describe('WF-09 · Medico reactivado', () => {
  test('UT-MRE09-01 · no_existe: 404', () => {
    expect(salidaDe({ resultado: 'no_existe' }, 99)).toEqual({ codigo: 404, estado: 'rechazado', mensaje: 'No existe el medico 99' });
  });

  test('UT-MRE09-02 · ya_baja: 409, la baja es definitiva', () => {
    expect(salidaDe({ resultado: 'ya_baja' }, 6)).toEqual({ codigo: 409, estado: 'rechazado', mensaje: 'El medico 6 fue dado de baja; la baja es definitiva' });
  });

  test('UT-MRE09-03 · ya_activo: 409', () => {
    expect(salidaDe({ resultado: 'ya_activo' }, 6)).toEqual({ codigo: 409, estado: 'rechazado', mensaje: 'El medico 6 ya esta activo' });
  });

  test('UT-MRE09-04 · ok: 200 con el token nuevo', () => {
    expect(salidaDe({ resultado: 'ok', hash_auditoria: 'abc' }, 2)).toEqual({
      codigo: 200,
      estado: 'actualizado',
      mensaje: 'Medico 2 reactivado con token nuevo',
      token: TOKEN,
      aviso: 'Guarde este token ahora: no se volvera a mostrar. Sus citas anteriores no se restauran',
      hash_auditoria: 'abc'
    });
  });

  test('UT-MRE09-05 · el aviso advierte que las citas anteriores no se restauran', () => {
    expect(salidaDe({ resultado: 'ok' }).aviso).toContain('no se restauran');
  });

  test.each(['no_existe', 'ya_baja', 'ya_activo'])('UT-MRE09-06 · %s: el token generado no se devuelve', resultado => {
    expect(JSON.stringify(responder({ resultado }).salida)).not.toContain(TOKEN);
  });

  test('UT-MRE09-07 · el token sale de Genera token medico nuevo (verify)', () => {
    expect(responder({ resultado: 'ok' }).$).toHaveBeenCalledWith('Genera token medico nuevo');
  });

  test('UT-MRE09-08 · devuelve una lista con un solo item', () => {
    expect(responder({ resultado: 'ok' }).salida).toHaveLength(1);
  });
});
