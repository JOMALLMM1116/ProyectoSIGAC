// sigac.wf08.rechazo401.test.js
//
// pruebas unitarias del nodo Rechazo 401 de WF-08. responde cuando el token no viene, no existe o esta desactivado. lo
// alimenta la salida false de ¿Token valido?.
//
// el mensaje es generico a proposito: no revela cual de los tres casos
// ocurrio, para no ayudar a quien intenta adivinar tokens validos.
//
// es una respuesta fija: no lee la entrada ni consulta otros nodos.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-R40108-NN

'use strict';

const rechazo = require('../nodos/wf08_rechazo_401.js');
const { ejecutar } = require('../simulacion.js');

const RESPUESTA = {
  codigo: 401,
  estado: 'rechazado',
  mensaje: 'No autorizado'
};

// lo que puede llegar al nodo: la salida del nodo anterior junto con
// lo que traia el flujo, incluida informacion que no debe devolverse
const CON_DATOS = {
  token_hash: 'a'.repeat(64),
  rol: 'medico',
  id_cita: 3432,
  datos: { dpi: '1234567890123', correo: 'ana@correo.com' }
};

describe('WF-08 · Rechazo 401', () => {
  test('UT-R40108-01 · respuesta completa', () => {
    expect(ejecutar(rechazo, { entrada: [{}] }).salida[0].json).toEqual(RESPUESTA);
  });

  test('UT-R40108-02 · codigo 401', () => {
    expect(ejecutar(rechazo, { entrada: [{}] }).salida[0].json.codigo).toBe(401);
  });

  test('UT-R40108-03 · estado rechazado (defecto 12.17)', () => {
    expect(ejecutar(rechazo, { entrada: [{}] }).salida[0].json.estado).toBe('rechazado');
  });

  test('UT-R40108-04 · mensaje No autorizado', () => {
    expect(ejecutar(rechazo, { entrada: [{}] }).salida[0].json.mensaje).toBe('No autorizado');
  });

  test('UT-R40108-05 · solo los campos codigo, estado y mensaje', () => {
    const { salida } = ejecutar(rechazo, { entrada: [{}] });
    expect(Object.keys(salida[0].json).sort()).toEqual(['codigo', 'estado', 'mensaje']);
  });

  test('UT-R40108-06 · sin entrada: la misma respuesta', () => {
    expect(ejecutar(rechazo).salida[0].json).toEqual(RESPUESTA);
  });

  test('UT-R40108-07 · con datos en la entrada: la misma respuesta, sin devolverlos', () => {
    const { salida } = ejecutar(rechazo, { entrada: [CON_DATOS], json: CON_DATOS });
    expect(salida[0].json).toEqual(RESPUESTA);
    const texto = JSON.stringify(salida);
    expect(texto).not.toContain('a'.repeat(64));
    expect(texto).not.toContain('1234567890123');
    expect(texto).not.toContain('3432');
  });

  test('UT-R40108-08 · no consulta ningun nodo anterior (verify)', () => {
    const { $ } = ejecutar(rechazo, { entrada: [{}] });
    expect($).not.toHaveBeenCalled();
  });

  test('UT-R40108-09 · dos ejecuciones con entradas distintas dan respuestas identicas', () => {
    const a = ejecutar(rechazo, { entrada: [{ rol: 'recepcion' }], json: { rol: 'recepcion' } }).salida;
    const b = ejecutar(rechazo, { entrada: [CON_DATOS], json: CON_DATOS }).salida;
    expect(a).toEqual(b);
  });

  test('UT-R40108-10 · el mensaje no revela la causa del rechazo', () => {
    const mensaje = ejecutar(rechazo, { entrada: [{}] }).salida[0].json.mensaje.toLowerCase();
    for (const pista of ['inactivo', 'desactivado', 'expirado', 'rol']) {
      expect(mensaje).not.toContain(pista);
    }
  });

  test('UT-R40108-11 · devuelve una lista con un solo item', () => {
    const { salida } = ejecutar(rechazo, { entrada: [{}] });
    expect(Array.isArray(salida)).toBe(true);
    expect(salida).toHaveLength(1);
  });
});
