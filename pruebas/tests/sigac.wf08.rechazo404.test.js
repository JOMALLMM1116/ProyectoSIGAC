// sigac.wf08.rechazo404.test.js
//
// pruebas unitarias del nodo Rechazo 404 de WF-08. responde cuando Busca la cita no encontro una cita propia del medico,
// confirmada o atendida. lo alimenta la salida false de ¿Cita valida?.
//
// el mismo mensaje para una cita inexistente y para una cita de otro
// medico: no revela si la cita existe pero pertenece a otro.
//
// es una respuesta fija: no lee la entrada ni consulta otros nodos.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-R40408-NN

'use strict';

const rechazo = require('../nodos/wf08_rechazo_404.js');
const { ejecutar } = require('../simulacion.js');

const RESPUESTA = {
  codigo: 404,
  estado: 'rechazado',
  mensaje: 'Cita no encontrada o no permite consultar historial'
};

// lo que puede llegar al nodo: la salida del nodo anterior junto con
// lo que traia el flujo, incluida informacion que no debe devolverse
const CON_DATOS = {
  token_hash: 'a'.repeat(64),
  rol: 'medico',
  id_cita: 3432,
  datos: { dpi: '1234567890123', correo: 'ana@correo.com' }
};

describe('WF-08 · Rechazo 404', () => {
  test('UT-R40408-01 · respuesta completa', () => {
    expect(ejecutar(rechazo, { entrada: [{}] }).salida[0].json).toEqual(RESPUESTA);
  });

  test('UT-R40408-02 · codigo 404', () => {
    expect(ejecutar(rechazo, { entrada: [{}] }).salida[0].json.codigo).toBe(404);
  });

  test('UT-R40408-03 · estado rechazado (defecto 12.17)', () => {
    expect(ejecutar(rechazo, { entrada: [{}] }).salida[0].json.estado).toBe('rechazado');
  });

  test('UT-R40408-04 · mensaje Cita no encontrada o no permite consultar historial', () => {
    expect(ejecutar(rechazo, { entrada: [{}] }).salida[0].json.mensaje).toBe('Cita no encontrada o no permite consultar historial');
  });

  test('UT-R40408-05 · solo los campos codigo, estado y mensaje', () => {
    const { salida } = ejecutar(rechazo, { entrada: [{}] });
    expect(Object.keys(salida[0].json).sort()).toEqual(['codigo', 'estado', 'mensaje']);
  });

  test('UT-R40408-06 · sin entrada: la misma respuesta', () => {
    expect(ejecutar(rechazo).salida[0].json).toEqual(RESPUESTA);
  });

  test('UT-R40408-07 · con datos en la entrada: la misma respuesta, sin devolverlos', () => {
    const { salida } = ejecutar(rechazo, { entrada: [CON_DATOS], json: CON_DATOS });
    expect(salida[0].json).toEqual(RESPUESTA);
    const texto = JSON.stringify(salida);
    expect(texto).not.toContain('a'.repeat(64));
    expect(texto).not.toContain('1234567890123');
    expect(texto).not.toContain('3432');
  });

  test('UT-R40408-08 · no consulta ningun nodo anterior (verify)', () => {
    const { $ } = ejecutar(rechazo, { entrada: [{}] });
    expect($).not.toHaveBeenCalled();
  });

  test('UT-R40408-09 · dos ejecuciones con entradas distintas dan respuestas identicas', () => {
    const a = ejecutar(rechazo, { entrada: [{ rol: 'recepcion' }], json: { rol: 'recepcion' } }).salida;
    const b = ejecutar(rechazo, { entrada: [CON_DATOS], json: CON_DATOS }).salida;
    expect(a).toEqual(b);
  });

  test('UT-R40408-10 · el mensaje no revela si la cita es de otro medico', () => {
    const mensaje = ejecutar(rechazo, { entrada: [{}] }).salida[0].json.mensaje.toLowerCase();
    for (const pista of ['otro medico', 'ajena', 'pertenece']) {
      expect(mensaje).not.toContain(pista);
    }
  });

  test('UT-R40408-11 · devuelve una lista con un solo item', () => {
    const { salida } = ejecutar(rechazo, { entrada: [{}] });
    expect(Array.isArray(salida)).toBe(true);
    expect(salida).toHaveLength(1);
  });
});
