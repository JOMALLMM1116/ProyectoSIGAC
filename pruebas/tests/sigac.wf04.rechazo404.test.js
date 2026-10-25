// sigac.wf04.rechazo404.test.js
//
// pruebas unitarias del nodo Rechazo 404 de WF-04. responde cuando Cancela cita no modifico ninguna fila: la cita no
// existe, ya estaba cancelada, cerrada, o el id_cita llego invalido y
// se convirtio en el centinela 0. lo alimenta la salida false de
// ¿Se cancelo?.
//
// el mensaje no distingue entre una cita inexistente y una que ya no
// estaba confirmada.
//
// es una respuesta fija: no lee la entrada ni consulta otros nodos.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-R40404-NN

'use strict';

const rechazo = require('../nodos/wf04_rechazo_404.js');
const { ejecutar } = require('../simulacion.js');

const RESPUESTA = {
  codigo: 404,
  estado: 'rechazado',
  mensaje: 'La cita no existe o no estaba confirmada'
};

// lo que puede llegar al nodo: la salida del nodo anterior junto con
// lo que traia el flujo, incluida informacion que no debe devolverse
const CON_DATOS = {
  token_hash: 'a'.repeat(64),
  rol: 'medico',
  id_cita: 3432,
  datos: { dpi: '1234567890123', correo: 'ana@correo.com' }
};

describe('WF-04 · Rechazo 404', () => {
  test('UT-R40404-01 · respuesta completa', () => {
    expect(ejecutar(rechazo, { entrada: [{}] }).salida[0].json).toEqual(RESPUESTA);
  });

  test('UT-R40404-02 · codigo 404', () => {
    expect(ejecutar(rechazo, { entrada: [{}] }).salida[0].json.codigo).toBe(404);
  });

  test('UT-R40404-03 · estado rechazado (defecto 12.17)', () => {
    expect(ejecutar(rechazo, { entrada: [{}] }).salida[0].json.estado).toBe('rechazado');
  });

  test('UT-R40404-04 · mensaje La cita no existe o no estaba confirmada', () => {
    expect(ejecutar(rechazo, { entrada: [{}] }).salida[0].json.mensaje).toBe('La cita no existe o no estaba confirmada');
  });

  test('UT-R40404-05 · solo los campos codigo, estado y mensaje', () => {
    const { salida } = ejecutar(rechazo, { entrada: [{}] });
    expect(Object.keys(salida[0].json).sort()).toEqual(['codigo', 'estado', 'mensaje']);
  });

  test('UT-R40404-06 · sin entrada: la misma respuesta', () => {
    expect(ejecutar(rechazo).salida[0].json).toEqual(RESPUESTA);
  });

  test('UT-R40404-07 · con datos en la entrada: la misma respuesta, sin devolverlos', () => {
    const { salida } = ejecutar(rechazo, { entrada: [CON_DATOS], json: CON_DATOS });
    expect(salida[0].json).toEqual(RESPUESTA);
    const texto = JSON.stringify(salida);
    expect(texto).not.toContain('a'.repeat(64));
    expect(texto).not.toContain('1234567890123');
    expect(texto).not.toContain('3432');
  });

  test('UT-R40404-08 · no consulta ningun nodo anterior (verify)', () => {
    const { $ } = ejecutar(rechazo, { entrada: [{}] });
    expect($).not.toHaveBeenCalled();
  });

  test('UT-R40404-09 · dos ejecuciones con entradas distintas dan respuestas identicas', () => {
    const a = ejecutar(rechazo, { entrada: [{ rol: 'recepcion' }], json: { rol: 'recepcion' } }).salida;
    const b = ejecutar(rechazo, { entrada: [CON_DATOS], json: CON_DATOS }).salida;
    expect(a).toEqual(b);
  });

  test('UT-R40404-10 · el mensaje no revela el estado real de la cita', () => {
    const mensaje = ejecutar(rechazo, { entrada: [{}] }).salida[0].json.mensaje.toLowerCase();
    for (const pista of ['cancelada', 'atendida', 'ausente', 'centinela']) {
      expect(mensaje).not.toContain(pista);
    }
  });

  test('UT-R40404-11 · devuelve una lista con un solo item', () => {
    const { salida } = ejecutar(rechazo, { entrada: [{}] });
    expect(Array.isArray(salida)).toBe(true);
    expect(salida).toHaveLength(1);
  });
});
