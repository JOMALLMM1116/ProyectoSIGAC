// sigac.wf01.rechazo409.test.js
//
// pruebas unitarias del nodo Rechazo 409 de WF-01. responde cuando el
// paciente existe pero esta inactivo o dado de baja (defecto 12.21).
//
// es una respuesta fija: no lee la entrada ni consulta otros nodos.
// las pruebas verifican el contrato, que no dependa de lo que reciba
// y que el mensaje no revele mas de lo necesario.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-R40901-NN

'use strict';

const rechazo409 = require('../nodos/wf01_rechazo_409.js');
const { ejecutar } = require('../simulacion.js');

const RESPUESTA = {
  codigo: 409,
  estado: 'rechazado',
  mensaje: 'El paciente no esta habilitado para solicitar citas'
};

// lo que llega desde ¿Paciente habilitado? cuando Guarda solicitud no
// inserto nada: un item vacio, o con los datos que traia el flujo
const CON_DATOS = {
  dpi_cifrado: 'aa:bb:cc',
  dpi_huella: 'f'.repeat(64),
  datos: { dpi: '1234567890123', nombre: 'Ana', correo: 'ana@correo.com' }
};

describe('WF-01 · Rechazo 409', () => {
  test('UT-R40901-01 · respuesta completa', () => {
    const { salida } = ejecutar(rechazo409, { entrada: [{}] });
    expect(salida[0].json).toEqual(RESPUESTA);
  });

  test('UT-R40901-02 · codigo 409', () => {
    const { salida } = ejecutar(rechazo409, { entrada: [{}] });
    expect(salida[0].json.codigo).toBe(409);
  });

  test('UT-R40901-03 · estado rechazado, igual que todos los rechazos (defecto 12.17)', () => {
    const { salida } = ejecutar(rechazo409, { entrada: [{}] });
    expect(salida[0].json.estado).toBe('rechazado');
  });

  test('UT-R40901-04 · solo los campos codigo, estado y mensaje', () => {
    const { salida } = ejecutar(rechazo409, { entrada: [{}] });
    expect(Object.keys(salida[0].json).sort()).toEqual(['codigo', 'estado', 'mensaje']);
  });

  test('UT-R40901-05 · sin entrada: la misma respuesta', () => {
    const { salida } = ejecutar(rechazo409);
    expect(salida[0].json).toEqual(RESPUESTA);
  });

  test('UT-R40901-06 · con datos del paciente en la entrada: la misma respuesta, sin exponerlos', () => {
    const { salida } = ejecutar(rechazo409, { entrada: [CON_DATOS], json: CON_DATOS });
    expect(salida[0].json).toEqual(RESPUESTA);
    const texto = JSON.stringify(salida);
    expect(texto).not.toContain('1234567890123');
    expect(texto).not.toContain('ana@correo.com');
  });

  test('UT-R40901-07 · no consulta ningun nodo anterior (verify)', () => {
    const { $ } = ejecutar(rechazo409, { entrada: [{}] });
    expect($).not.toHaveBeenCalled();
  });

  test('UT-R40901-08 · dos ejecuciones dan respuestas identicas', () => {
    const a = ejecutar(rechazo409, { entrada: [{}] }).salida;
    const b = ejecutar(rechazo409, { entrada: [CON_DATOS] }).salida;
    expect(a).toEqual(b);
  });

  test('UT-R40901-09 · el mensaje no revela si esta inactivo o dado de baja', () => {
    const { salida } = ejecutar(rechazo409, { entrada: [{}] });
    const mensaje = salida[0].json.mensaje.toLowerCase();
    expect(mensaje).not.toContain('baja');
    expect(mensaje).not.toContain('inactivo');
  });

  test('UT-R40901-10 · devuelve una lista con un solo item', () => {
    const { salida } = ejecutar(rechazo409, { entrada: [{}] });
    expect(Array.isArray(salida)).toBe(true);
    expect(salida).toHaveLength(1);
  });
});
