// sigac.wf08.rechazo400.test.js
//
// pruebas unitarias del nodo Rechazo 400 de WF-08. responde cuando
// Valida datos encontro errores, y devuelve la lista completa para
// que el emisor sepa que corregir. lee los errores de $input.first().json,
// que es la salida de Valida datos por la rama false de ¿Datos validos?
//
// cada prueba lleva su ID de la tabla de pruebas: UT-R40008-NN

'use strict';

const rechazo400 = require('../nodos/wf08_rechazo_400.js');
const { ejecutar } = require('../simulacion.js');

const ERRORES = ['El DPI debe tener exactamente 13 digitos', 'El correo no tiene un formato valido'];

// ejecuta el nodo con la salida de Valida datos, como $input y como $json
function rechazar(desdeValida) {
  return ejecutar(rechazo400, { entrada: [desdeValida], json: desdeValida });
}

describe('WF-08 · Rechazo 400', () => {
  test('UT-R40008-01 · respuesta completa', () => {
    expect(rechazar({ valido: false, errores: ERRORES }).salida[0].json).toEqual({
      codigo: 400,
      estado: 'rechazado',
      mensaje: 'Datos invalidos',
      errores: ERRORES
    });
  });

  test('UT-R40008-02 · codigo 400', () => {
    expect(rechazar({ errores: ERRORES }).salida[0].json.codigo).toBe(400);
  });

  test('UT-R40008-03 · estado rechazado (defecto 12.17)', () => {
    expect(rechazar({ errores: ERRORES }).salida[0].json.estado).toBe('rechazado');
  });

  test('UT-R40008-04 · mensaje Datos invalidos', () => {
    expect(rechazar({ errores: ERRORES }).salida[0].json.mensaje).toBe('Datos invalidos');
  });

  test('UT-R40008-05 · la lista de errores llega intacta', () => {
    expect(rechazar({ errores: ERRORES }).salida[0].json.errores).toEqual(ERRORES);
  });

  test('UT-R40008-06 · el orden de los errores se conserva', () => {
    const invertidos = [...ERRORES].reverse();
    expect(rechazar({ errores: invertidos }).salida[0].json.errores).toEqual(invertidos);
  });

  test('UT-R40008-07 · un solo error: lista de un elemento', () => {
    expect(rechazar({ errores: ['Falta el campo nombre'] }).salida[0].json.errores)
      .toEqual(['Falta el campo nombre']);
  });

  test('UT-R40008-08 · lista vacia: errores queda vacio', () => {
    expect(rechazar({ errores: [] }).salida[0].json.errores).toEqual([]);
  });

  test('UT-R40008-09 · sin errores en la entrada: queda indefinido, sin error', () => {
    expect(rechazar({ valido: false }).salida[0].json.errores).toBeUndefined();
  });

  test('UT-R40008-10 · con datos del paciente en la entrada: solo los cuatro campos', () => {
    const conDatos = { errores: ERRORES, datos: { dpi: '1234567890123', correo: 'ana@correo.com' } };
    const { salida } = rechazar(conDatos);
    expect(Object.keys(salida[0].json).sort()).toEqual(['codigo', 'errores', 'estado', 'mensaje']);
    expect(JSON.stringify(salida)).not.toContain('1234567890123');
  });

  test('UT-R40008-11 · no consulta ningun nodo anterior (verify)', () => {
    const { $ } = rechazar({ errores: ERRORES });
    expect($).not.toHaveBeenCalled();
  });

  test('UT-R40008-12 · devuelve una lista con un solo item', () => {
    const { salida } = rechazar({ errores: ERRORES });
    expect(Array.isArray(salida)).toBe(true);
    expect(salida).toHaveLength(1);
  });
});
