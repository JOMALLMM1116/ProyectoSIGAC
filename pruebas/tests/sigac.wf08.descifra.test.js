// sigac.wf08.descifra.test.js
//
// pruebas unitarias del nodo Descifra de WF-08. descifra el historial
// clinico del paciente: es la funcion inversa de la que cifra en WF-01 y
// WF-07. ademas verifica la integridad: si un valor cifrado se altero
// en la base, AES-GCM lo detecta y el nodo lanza un error.
//
// junta todas las notas en un solo item, en orden cronologico, con la
// fecha en hora de Guatemala.
//
// las pruebas cifran las notas con el propio nodo Cifra la nota de
// WF-07, de modo que tambien verifican que los dos nodos hablan el
// mismo formato.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-DES08-NN

'use strict';

const descifra = require('../nodos/wf08_descifra.js');
const cifraNota = require('../nodos/wf07_cifra_la_nota.js');
const cifraDatos = require('../nodos/wf01_cifra_datos_sensibles.js');
const { ejecutar, CLAVE_PRUEBA } = require('../simulacion.js');

// cifra un texto con el nodo de WF-07
function cifrarConWF07(texto) {
  return ejecutar(cifraNota, {
    entrada: [{ id_expediente: 1, id_paciente: 1, id_cita: 1 }],
    anteriores: { 'Valida datos': { id_medico: 1, diagnostico: texto, indicaciones: null } }
  }).salida[0].json.diagnostico_cifrado;
}

// una fila de Lee notas, tal como la devuelve la base
const fila = (id, creado_en, diagnostico, indicaciones = null) => ({
  id,
  creado_en,
  medico: 'Carlos Enrique Coc Ical',
  especialidad: 'Pediatria',
  diagnostico_cifrado: cifrarConWF07(diagnostico),
  indicaciones_cifrado: indicaciones === null ? null : cifrarConWF07(indicaciones)
});

function leer(filas, clave = CLAVE_PRUEBA) {
  return ejecutar(descifra, {
    entrada: filas,
    anteriores: {
      'Busca la cita': { id_paciente: 55, id_cita: 3432, id_expediente: 40 },
      'Valida datos': { id_medico: 2 }
    },
    env: { SIGAC_CLAVE_CIFRADO: clave }
  });
}

const salidaDe = (...filas) => leer(filas).salida[0].json;

// ------------------------------------------------------------
// A. Descifrado
// ------------------------------------------------------------
describe('WF-08 · Descifra · A. Descifrado', () => {
  test('UT-DES08-01 · descifra lo que cifro WF-07: vuelve el texto original', () => {
    const salida = salidaDe(fila(3, '2026-10-23T20:30:08Z', 'Faringitis aguda, sin fiebre', 'Reposo, hidratacion'));
    expect(salida.notas[0].diagnostico).toBe('Faringitis aguda, sin fiebre');
    expect(salida.notas[0].indicaciones).toBe('Reposo, hidratacion');
  });

  test('UT-DES08-02 · descifra tambien el formato de WF-01: es el mismo cifrado', () => {
    const dpiCifrado = ejecutar(cifraDatos, { json: { datos: { dpi: '1234567890123' } } }).salida.json.dpi_cifrado;
    const salida = salidaDe({ ...fila(1, '2026-10-23T20:30:08Z', 'x'), diagnostico_cifrado: dpiCifrado });
    expect(salida.notas[0].diagnostico).toBe('1234567890123');
  });

  test('UT-DES08-03 · indicaciones nulas: quedan nulas', () => {
    expect(salidaDe(fila(3, '2026-10-23T20:30:08Z', 'Control')).notas[0].indicaciones).toBeNull();
  });

  test('UT-DES08-04 · texto con tildes y ñ vuelve identico', () => {
    expect(salidaDe(fila(3, '2026-10-23T20:30:08Z', 'Otitis en niño')).notas[0].diagnostico).toBe('Otitis en niño');
  });
});

// ------------------------------------------------------------
// B. Integridad y clave
// ------------------------------------------------------------
describe('WF-08 · Descifra · B. Integridad', () => {
  test('UT-DES08-05 · un valor alterado en la base: lanza error (lo registra WF-00)', () => {
    const f = fila(3, '2026-10-23T20:30:08Z', 'Faringitis');
    const [iv, texto, etiqueta] = f.diagnostico_cifrado.split(':');
    f.diagnostico_cifrado = [iv, (texto[0] === '0' ? '1' : '0') + texto.slice(1), etiqueta].join(':');
    expect(() => leer([f])).toThrow();
  });

  test('UT-DES08-06 · un valor sin las tres partes: formato no reconocido', () => {
    const f = { ...fila(3, '2026-10-23T20:30:08Z', 'x'), diagnostico_cifrado: 'aa:bb' };
    expect(() => leer([f])).toThrow('formato de cifrado no reconocido');
  });

  test('UT-DES08-07 · un hash antiguo de 64 caracteres (sin cifrar): formato no reconocido', () => {
    const f = { ...fila(3, '2026-10-23T20:30:08Z', 'x'), diagnostico_cifrado: 'a'.repeat(64) };
    expect(() => leer([f])).toThrow('formato de cifrado no reconocido');
  });

  test('UT-DES08-08 · con otra clave: no se puede descifrar', () => {
    expect(() => leer([fila(3, '2026-10-23T20:30:08Z', 'x')], 'ff'.repeat(32))).toThrow();
  });

  test('UT-DES08-09 · clave de largo incorrecto: lanza error', () => {
    expect(() => leer([fila(3, '2026-10-23T20:30:08Z', 'x')], 'abcd')).toThrow('SIGAC_CLAVE_CIFRADO debe ser de 32 bytes');
  });
});

// ------------------------------------------------------------
// C. Orden, fecha y paciente sin notas
// ------------------------------------------------------------
describe('WF-08 · Descifra · C. Orden y fecha', () => {
  test('UT-DES08-10 · la base las trae de la mas reciente a la mas antigua; salen en orden cronologico', () => {
    const salida = salidaDe(
      fila(5, '2026-10-23T20:00:00Z', 'tercera'),
      fila(4, '2026-10-22T20:00:00Z', 'segunda'),
      fila(3, '2026-10-21T20:00:00Z', 'primera')
    );
    expect(salida.notas.map(n => n.diagnostico)).toEqual(['primera', 'segunda', 'tercera']);
  });

  test('UT-DES08-11 · la fecha se muestra en hora de Guatemala (UTC-6)', () => {
    expect(salidaDe(fila(3, '2026-10-23T20:30:08Z', 'x')).notas[0].fecha).toBe('23/10/2026 14:30');
  });

  test('UT-DES08-12 · una nota de madrugada en UTC queda en el dia anterior en Guatemala', () => {
    expect(salidaDe(fila(3, '2026-10-24T03:15:00Z', 'x')).notas[0].fecha).toBe('23/10/2026 21:15');
  });

  test('UT-DES08-13 · paciente sin notas (item vacio de Always Output Data): lista vacia', () => {
    const salida = salidaDe({});
    expect(salida.total).toBe(0);
    expect(salida.notas).toEqual([]);
  });

  test('UT-DES08-14 · el total coincide con la cantidad de notas', () => {
    expect(salidaDe(fila(1, '2026-10-21T20:00:00Z', 'a'), fila(2, '2026-10-22T20:00:00Z', 'b')).total).toBe(2);
  });
});

// ------------------------------------------------------------
// D. Contrato
// ------------------------------------------------------------
describe('WF-08 · Descifra · D. Contrato', () => {
  test('UT-DES08-15 · cada nota trae id, fecha, medico, especialidad, diagnostico e indicaciones', () => {
    const nota = salidaDe(fila(3, '2026-10-23T20:30:08Z', 'x')).notas[0];
    expect(Object.keys(nota).sort()).toEqual(['diagnostico', 'especialidad', 'fecha', 'id_nota', 'indicaciones', 'medico']);
    expect(nota.medico).toBe('Carlos Enrique Coc Ical');
  });

  test('UT-DES08-16 · las notas no conservan los valores cifrados', () => {
    expect(JSON.stringify(salidaDe(fila(3, '2026-10-23T20:30:08Z', 'x')))).not.toContain('_cifrado');
  });

  test('UT-DES08-17 · paciente y cita salen de Busca la cita; el medico de Valida datos', () => {
    const salida = salidaDe(fila(3, '2026-10-23T20:30:08Z', 'x'));
    expect([salida.id_paciente, salida.id_cita, salida.id_medico]).toEqual([55, 3432, 2]);
  });

  test('UT-DES08-18 · junta todas las notas en un solo item, para auditar una sola lectura', () => {
    const { salida } = leer([fila(1, '2026-10-21T20:00:00Z', 'a'), fila(2, '2026-10-22T20:00:00Z', 'b')]);
    expect(salida).toHaveLength(1);
  });

  test('UT-DES08-19 · consulta Busca la cita y Valida datos (verify)', () => {
    const { $ } = leer([fila(3, '2026-10-23T20:30:08Z', 'x')]);
    expect($).toHaveBeenCalledWith('Busca la cita');
    expect($).toHaveBeenCalledWith('Valida datos');
  });
});
