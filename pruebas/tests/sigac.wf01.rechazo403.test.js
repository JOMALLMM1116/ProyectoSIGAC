// sigac.wf01.rechazo403.test.js
//
// pruebas unitarias del nodo Rechazo 403 de WF-01. responde cuando el
// token es valido pero su rol no puede registrar solicitudes: solo
// recepcion puede. lo alimenta la salida false de ¿Rol autorizado?
//
// el mensaje no revela que rol se necesita ni cual tiene quien llama.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-R40301-NN

'use strict';

const rechazo403 = require('../nodos/wf01_rechazo_403.js');
const { ejecutar } = require('../simulacion.js');

const RESPUESTA = {
  codigo: 403,
  estado: 'rechazado',
  mensaje: 'El rol no autoriza esta operacion'
};

// lo que llega desde ¿Rol autorizado?: la salida de Verifica token,
// con el rol de quien llama, junto con lo que traia el flujo
const CON_ROL = {
  rol: 'medico',
  datos: { dpi: '1234567890123', correo: 'ana@correo.com' }
};

describe('WF-01 · Rechazo 403', () => {
  test('UT-R40301-01 · respuesta completa', () => {
    expect(ejecutar(rechazo403, { entrada: [{}] }).salida[0].json).toEqual(RESPUESTA);
  });

  test('UT-R40301-02 · codigo 403', () => {
    expect(ejecutar(rechazo403, { entrada: [{}] }).salida[0].json.codigo).toBe(403);
  });

  test('UT-R40301-03 · estado rechazado (defecto 12.17)', () => {
    expect(ejecutar(rechazo403, { entrada: [{}] }).salida[0].json.estado).toBe('rechazado');
  });

  test('UT-R40301-04 · mensaje El rol no autoriza esta operacion', () => {
    expect(ejecutar(rechazo403, { entrada: [{}] }).salida[0].json.mensaje).toBe('El rol no autoriza esta operacion');
  });

  test('UT-R40301-05 · solo los campos codigo, estado y mensaje', () => {
    const { salida } = ejecutar(rechazo403, { entrada: [{}] });
    expect(Object.keys(salida[0].json).sort()).toEqual(['codigo', 'estado', 'mensaje']);
  });

  test('UT-R40301-06 · sin entrada: la misma respuesta', () => {
    expect(ejecutar(rechazo403).salida[0].json).toEqual(RESPUESTA);
  });

  test('UT-R40301-07 · con el rol y datos en la entrada: no los devuelve', () => {
    const { salida } = ejecutar(rechazo403, { entrada: [CON_ROL], json: CON_ROL });
    expect(salida[0].json).toEqual(RESPUESTA);
    expect(JSON.stringify(salida)).not.toContain('1234567890123');
  });

  test('UT-R40301-08 · no consulta ningun nodo anterior (verify)', () => {
    const { $ } = ejecutar(rechazo403, { entrada: [{}] });
    expect($).not.toHaveBeenCalled();
  });

  test('UT-R40301-09 · dos ejecuciones con roles distintos dan respuestas identicas', () => {
    const comoMedico = ejecutar(rechazo403, { entrada: [{ rol: 'medico' }], json: { rol: 'medico' } }).salida;
    const comoAdmin = ejecutar(rechazo403, { entrada: [{ rol: 'admin' }], json: { rol: 'admin' } }).salida;
    expect(comoMedico).toEqual(comoAdmin);
  });

  test('UT-R40301-10 · el mensaje no revela roles', () => {
    const mensaje = ejecutar(rechazo403, { entrada: [{}] }).salida[0].json.mensaje.toLowerCase();
    for (const rol of ['recepcion', 'medico', 'admin']) {
      expect(mensaje).not.toContain(rol);
    }
  });

  test('UT-R40301-11 · devuelve una lista con un solo item', () => {
    const { salida } = ejecutar(rechazo403, { entrada: [{}] });
    expect(Array.isArray(salida)).toBe(true);
    expect(salida).toHaveLength(1);
  });
});
