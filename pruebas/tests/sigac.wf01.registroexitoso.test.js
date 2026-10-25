// sigac.wf01.registroexitoso.test.js
//
// pruebas unitarias del nodo Registro exitoso de WF-01. arma la
// respuesta 201 con la solicitud guardada y el hash de auditoria.
// no tiene ramas: las pruebas verifican el origen de cada campo y
// el contrato de salida.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-REG01-NN

'use strict';

const registroExitoso = require('../nodos/wf01_registro_exitoso.js');
const { ejecutar } = require('../simulacion.js');

// ejecuta el nodo con la salida simulada de Guarda solicitud y de
// Registra bitacora, que llega como $json
function registrar(guardaSolicitud, bitacora) {
  return ejecutar(registroExitoso, {
    anteriores: { 'Guarda solicitud': guardaSolicitud },
    json: bitacora
  });
}

const GUARDADA = { id_solicitud: 71, estado: 'pendiente' };
const BITACORA = { hash_actual: 'abc123' };

describe('WF-01 · Registro exitoso', () => {
  test('UT-REG01-01 · respuesta completa con los seis campos', () => {
    const { salida } = registrar(GUARDADA, BITACORA);
    expect(salida[0].json).toEqual({
      codigo: 201,
      estado: 'registrado',
      mensaje: 'Solicitud de cita registrada',
      id_solicitud: 71,
      estado_solicitud: 'pendiente',
      hash_auditoria: 'abc123'
    });
  });

  test('UT-REG01-02 · id_solicitud sale de Guarda solicitud', () => {
    const { salida } = registrar({ id_solicitud: 999, estado: 'pendiente' }, BITACORA);
    expect(salida[0].json.id_solicitud).toBe(999);
  });

  test('UT-REG01-03 · estado_solicitud sale del campo estado de Guarda solicitud', () => {
    const { salida } = registrar({ id_solicitud: 71, estado: 'en_espera' }, BITACORA);
    expect(salida[0].json.estado_solicitud).toBe('en_espera');
  });

  test('UT-REG01-04 · hash_auditoria sale de hash_actual de la bitacora', () => {
    const { salida } = registrar(GUARDADA, { hash_actual: 'f'.repeat(64) });
    expect(salida[0].json.hash_auditoria).toBe('f'.repeat(64));
  });

  test('UT-REG01-05 · consulta el nodo Guarda solicitud (verify)', () => {
    const { $ } = registrar(GUARDADA, BITACORA);
    expect($).toHaveBeenCalledWith('Guarda solicitud');
  });

  test('UT-REG01-06 · con varios items en Guarda solicitud, usa el primero', () => {
    const { salida } = registrar(
      [{ id_solicitud: 71, estado: 'pendiente' }, { id_solicitud: 72, estado: 'pendiente' }],
      BITACORA
    );
    expect(salida[0].json.id_solicitud).toBe(71);
  });

  test('UT-REG01-07 · Guarda solicitud sin estado: queda indefinido, sin error', () => {
    const { salida } = registrar({ id_solicitud: 71 }, BITACORA);
    expect(salida[0].json.estado_solicitud).toBeUndefined();
  });

  test('UT-REG01-08 · bitacora sin hash_actual: queda indefinido, sin error', () => {
    const { salida } = registrar(GUARDADA, {});
    expect(salida[0].json.hash_auditoria).toBeUndefined();
  });

  test('UT-REG01-09 · no expone campos que no sean los seis de la respuesta', () => {
    const conDatos = { ...GUARDADA, id_paciente: 55, especialidad_solicitada: 'Pediatria', dpi: '1234567890123' };
    const { salida } = registrar(conDatos, BITACORA);
    expect(Object.keys(salida[0].json).sort()).toEqual([
      'codigo', 'estado', 'estado_solicitud', 'hash_auditoria', 'id_solicitud', 'mensaje'
    ]);
    expect(JSON.stringify(salida)).not.toContain('1234567890123');
  });

  test('UT-REG01-10 · devuelve una lista con un solo item', () => {
    const { salida } = registrar(GUARDADA, BITACORA);
    expect(Array.isArray(salida)).toBe(true);
    expect(salida).toHaveLength(1);
  });
});
