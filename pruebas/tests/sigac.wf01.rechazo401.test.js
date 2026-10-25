// sigac.wf01.rechazo401.test.js
//
// pruebas unitarias del nodo Rechazo 401 de WF-01. responde cuando el
// token no viene, no existe o esta desactivado. lo alimenta la salida
// false de ¿Token valido?
//
// el mensaje es generico a proposito: no revela cual de los tres casos
// ocurrio, para no ayudar a quien intenta adivinar tokens validos.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-R40101-NN

'use strict';

const rechazo401 = require('../nodos/wf01_rechazo_401.js');
const { ejecutar } = require('../simulacion.js');

const RESPUESTA = {
  codigo: 401,
  estado: 'rechazado',
  mensaje: 'Token ausente o invalido'
};

// lo que puede llegar desde ¿Token valido?: la salida de Verifica
// token, vacia, junto con lo que traia el flujo
const CON_DATOS = {
  token_hash: 'a'.repeat(64),
  datos: { dpi: '1234567890123', correo: 'ana@correo.com' }
};

describe('WF-01 · Rechazo 401', () => {
  test('UT-R40101-01 · respuesta completa', () => {
    expect(ejecutar(rechazo401, { entrada: [{}] }).salida[0].json).toEqual(RESPUESTA);
  });

  test('UT-R40101-02 · codigo 401', () => {
    expect(ejecutar(rechazo401, { entrada: [{}] }).salida[0].json.codigo).toBe(401);
  });

  test('UT-R40101-03 · estado rechazado (defecto 12.17)', () => {
    expect(ejecutar(rechazo401, { entrada: [{}] }).salida[0].json.estado).toBe('rechazado');
  });

  test('UT-R40101-04 · mensaje Token ausente o invalido', () => {
    expect(ejecutar(rechazo401, { entrada: [{}] }).salida[0].json.mensaje).toBe('Token ausente o invalido');
  });

  test('UT-R40101-05 · solo los campos codigo, estado y mensaje', () => {
    const { salida } = ejecutar(rechazo401, { entrada: [{}] });
    expect(Object.keys(salida[0].json).sort()).toEqual(['codigo', 'estado', 'mensaje']);
  });

  test('UT-R40101-06 · sin entrada: la misma respuesta', () => {
    expect(ejecutar(rechazo401).salida[0].json).toEqual(RESPUESTA);
  });

  test('UT-R40101-07 · con la huella del token y datos en la entrada: no los devuelve', () => {
    const { salida } = ejecutar(rechazo401, { entrada: [CON_DATOS], json: CON_DATOS });
    expect(salida[0].json).toEqual(RESPUESTA);
    const texto = JSON.stringify(salida);
    expect(texto).not.toContain('a'.repeat(64));
    expect(texto).not.toContain('1234567890123');
  });

  test('UT-R40101-08 · no consulta ningun nodo anterior (verify)', () => {
    const { $ } = ejecutar(rechazo401, { entrada: [{}] });
    expect($).not.toHaveBeenCalled();
  });

  test('UT-R40101-09 · dos ejecuciones con entradas distintas dan respuestas identicas', () => {
    const a = ejecutar(rechazo401, { entrada: [{}] }).salida;
    const b = ejecutar(rechazo401, { entrada: [CON_DATOS], json: CON_DATOS }).salida;
    expect(a).toEqual(b);
  });

  test('UT-R40101-10 · el mensaje no revela la causa del rechazo', () => {
    const mensaje = ejecutar(rechazo401, { entrada: [{}] }).salida[0].json.mensaje.toLowerCase();
    for (const pista of ['inactivo', 'desactivado', 'expirado', 'rol']) {
      expect(mensaje).not.toContain(pista);
    }
  });

  test('UT-R40101-11 · devuelve una lista con un solo item', () => {
    const { salida } = ejecutar(rechazo401, { entrada: [{}] });
    expect(Array.isArray(salida)).toBe(true);
    expect(salida).toHaveLength(1);
  });
});

