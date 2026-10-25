// sigac.wf07.notaregistrada.test.js
//
// pruebas unitarias del nodo Nota registrada de WF-07. arma la respuesta
// 201 con los identificadores de la nota y el hash de auditoria. el
// texto clinico nunca se devuelve.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-NOT07-NN

'use strict';

const notaRegistrada = require('../nodos/wf07_nota_registrada.js');
const { ejecutar } = require('../simulacion.js');

const GUARDADA = { id: 3, id_cita: 3432, creado_en: '2026-10-23T20:30:08.200Z' };
const BITACORA = { hash_actual: 'abc123' };

const responder = (guardada = GUARDADA, bitacora = BITACORA) =>
  ejecutar(notaRegistrada, { entrada: [bitacora], anteriores: { 'Guarda nota': guardada } });

describe('WF-07 · Nota registrada', () => {
  test('UT-NOT07-01 · respuesta completa', () => {
    expect(responder().salida[0].json).toEqual({
      codigo: 201,
      estado: 'registrada',
      mensaje: 'Nota clinica registrada',
      id_nota: 3,
      id_cita: 3432,
      creado_en: '2026-10-23T20:30:08.200Z',
      hash_auditoria: 'abc123'
    });
  });

  test('UT-NOT07-02 · el id de la nota sale del id de Guarda nota', () => {
    expect(responder({ ...GUARDADA, id: 99 }).salida[0].json.id_nota).toBe(99);
  });

  test('UT-NOT07-03 · el hash sale de la bitacora ($input)', () => {
    expect(responder(GUARDADA, { hash_actual: 'f'.repeat(64) }).salida[0].json.hash_auditoria).toBe('f'.repeat(64));
  });

  test('UT-NOT07-04 · no devuelve el texto clinico aunque venga en Guarda nota', () => {
    const conTexto = { ...GUARDADA, diagnostico_cifrado: 'aa:bb:cc', diagnostico: 'Faringitis' };
    const texto = JSON.stringify(responder(conTexto).salida);
    expect(texto).not.toContain('Faringitis');
    expect(texto).not.toContain('aa:bb:cc');
  });

  test('UT-NOT07-05 · no devuelve el medico que firmo', () => {
    expect(responder({ ...GUARDADA, id_medico: 2 }).salida[0].json).not.toHaveProperty('id_medico');
  });

  test('UT-NOT07-06 · sin hash en la bitacora: queda indefinido, sin error', () => {
    expect(responder(GUARDADA, {}).salida[0].json.hash_auditoria).toBeUndefined();
  });

  test('UT-NOT07-07 · consulta Guarda nota (verify)', () => {
    expect(responder().$).toHaveBeenCalledWith('Guarda nota');
  });

  test('UT-NOT07-08 · devuelve una lista con un solo item de siete campos', () => {
    const { salida } = responder();
    expect(salida).toHaveLength(1);
    expect(Object.keys(salida[0].json)).toHaveLength(7);
  });
});
