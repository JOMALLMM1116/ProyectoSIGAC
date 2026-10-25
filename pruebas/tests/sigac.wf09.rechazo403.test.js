// sigac.wf09.rechazo403.test.js
//
// pruebas unitarias del nodo Rechazo 403 de WF-09. responde cuando el token es valido pero no es de administrador: solo
// el admin puede administrar personas. lo alimenta la salida false de
// ¿Es admin?.
//
// el mensaje no revela que rol se necesita ni cual tiene quien llama.
//
// es una respuesta fija: no lee la entrada ni consulta otros nodos.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-R40309-NN

'use strict';

const rechazo = require('../nodos/wf09_rechazo_403.js');
const { ejecutar } = require('../simulacion.js');

const RESPUESTA = {
  codigo: 403,
  estado: 'rechazado',
  mensaje: 'Operacion no permitida para este rol'
};

// lo que puede llegar al nodo: la salida del nodo anterior junto con
// lo que traia el flujo, incluida informacion que no debe devolverse
const CON_DATOS = {
  token_hash: 'a'.repeat(64),
  rol: 'medico',
  id_cita: 3432,
  datos: { dpi: '1234567890123', correo: 'ana@correo.com' }
};

describe('WF-09 · Rechazo 403', () => {
  test('UT-R40309-01 · respuesta completa', () => {
    expect(ejecutar(rechazo, { entrada: [{}] }).salida[0].json).toEqual(RESPUESTA);
  });

  test('UT-R40309-02 · codigo 403', () => {
    expect(ejecutar(rechazo, { entrada: [{}] }).salida[0].json.codigo).toBe(403);
  });

  test('UT-R40309-03 · estado rechazado (defecto 12.17)', () => {
    expect(ejecutar(rechazo, { entrada: [{}] }).salida[0].json.estado).toBe('rechazado');
  });

  test('UT-R40309-04 · mensaje Operacion no permitida para este rol', () => {
    expect(ejecutar(rechazo, { entrada: [{}] }).salida[0].json.mensaje).toBe('Operacion no permitida para este rol');
  });

  test('UT-R40309-05 · solo los campos codigo, estado y mensaje', () => {
    const { salida } = ejecutar(rechazo, { entrada: [{}] });
    expect(Object.keys(salida[0].json).sort()).toEqual(['codigo', 'estado', 'mensaje']);
  });

  test('UT-R40309-06 · sin entrada: la misma respuesta', () => {
    expect(ejecutar(rechazo).salida[0].json).toEqual(RESPUESTA);
  });

  test('UT-R40309-07 · con datos en la entrada: la misma respuesta, sin devolverlos', () => {
    const { salida } = ejecutar(rechazo, { entrada: [CON_DATOS], json: CON_DATOS });
    expect(salida[0].json).toEqual(RESPUESTA);
    const texto = JSON.stringify(salida);
    expect(texto).not.toContain('a'.repeat(64));
    expect(texto).not.toContain('1234567890123');
    expect(texto).not.toContain('3432');
  });

  test('UT-R40309-08 · no consulta ningun nodo anterior (verify)', () => {
    const { $ } = ejecutar(rechazo, { entrada: [{}] });
    expect($).not.toHaveBeenCalled();
  });

  test('UT-R40309-09 · dos ejecuciones con entradas distintas dan respuestas identicas', () => {
    const a = ejecutar(rechazo, { entrada: [{ rol: 'recepcion' }], json: { rol: 'recepcion' } }).salida;
    const b = ejecutar(rechazo, { entrada: [CON_DATOS], json: CON_DATOS }).salida;
    expect(a).toEqual(b);
  });

  test('UT-R40309-10 · el mensaje no revela roles', () => {
    const mensaje = ejecutar(rechazo, { entrada: [{}] }).salida[0].json.mensaje.toLowerCase();
    for (const pista of ['recepcion', 'medico', 'admin']) {
      expect(mensaje).not.toContain(pista);
    }
  });

  test('UT-R40309-11 · devuelve una lista con un solo item', () => {
    const { salida } = ejecutar(rechazo, { entrada: [{}] });
    expect(Array.isArray(salida)).toBe(true);
    expect(salida).toHaveLength(1);
  });
});
