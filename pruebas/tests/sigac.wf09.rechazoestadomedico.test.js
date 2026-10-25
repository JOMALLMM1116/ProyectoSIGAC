// sigac.wf09.rechazoestadomedico.test.js
//
// pruebas unitarias del nodo Rechazo estado medico de WF-09. responde en
// los dos casos en que no se aplica nada al desactivar o dar de baja a un
// medico: no existe (404) o ya fue dado de baja (409). lo alimenta la
// salida false de ¿Se puede aplicar?
//
// cada prueba lleva su ID de la tabla de pruebas: UT-REM09-NN

'use strict';

const rechazoEstadoMedico = require('../nodos/wf09_rechazo_estado_medico.js');
const { ejecutar } = require('../simulacion.js');

const responder = (resultado, id = 6) =>
  ejecutar(rechazoEstadoMedico, { entrada: [resultado], anteriores: { 'Valida datos': { id } } });
const salidaDe = (resultado, id) => responder(resultado, id).salida[0].json;

describe('WF-09 · Rechazo estado medico', () => {
  test('UT-REM09-01 · no_existe: 404 con el id', () => {
    expect(salidaDe({ resultado: 'no_existe' }, 99)).toEqual({ codigo: 404, estado: 'rechazado', mensaje: 'No existe el medico 99' });
  });

  test('UT-REM09-02 · ya_baja: 409, la baja es definitiva', () => {
    expect(salidaDe({ resultado: 'ya_baja' }, 6)).toEqual({ codigo: 409, estado: 'rechazado', mensaje: 'El medico 6 ya fue dado de baja; la baja es definitiva' });
  });

  test('UT-REM09-03 · cualquier otro resultado que llegara aqui se trata como ya_baja', () => {
    expect(salidaDe({ resultado: 'desconocido' }).codigo).toBe(409);
  });

  test('UT-REM09-04 · solo tres campos: no expone citas ni tokens', () => {
    expect(Object.keys(salidaDe({ resultado: 'ya_baja', reasignar: [1], cancelar: [2] })).sort()).toEqual(['codigo', 'estado', 'mensaje']);
  });

  test('UT-REM09-05 · el id del mensaje sale de Valida datos (verify)', () => {
    expect(responder({ resultado: 'no_existe' }).$).toHaveBeenCalledWith('Valida datos');
  });

  test('UT-REM09-06 · devuelve una lista con un solo item', () => {
    expect(responder({ resultado: 'ya_baja' }).salida).toHaveLength(1);
  });
});
