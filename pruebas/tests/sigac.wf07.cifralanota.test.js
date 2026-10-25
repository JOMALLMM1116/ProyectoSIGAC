// sigac.wf07.cifralanota.test.js
//
// pruebas unitarias del nodo Cifra la nota de WF-07. cifra el
// diagnostico y las indicaciones con AES-256-GCM, con la misma funcion y
// el mismo formato que WF-01: iv:textoCifrado:etiqueta. su salida ya no
// lleva el texto clinico en claro.
//
// toma la cita de $input (salida de Busca la cita) y la nota de
// Valida datos. si no hay indicaciones, envia el centinela 'null', que
// la consulta de Guarda nota convierte en nulo con nullif.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-CIF07-NN

'use strict';

const crypto = require('crypto');
const cifraNota = require('../nodos/wf07_cifra_la_nota.js');
const { ejecutar, CLAVE_PRUEBA } = require('../simulacion.js');

const CITA = { id_expediente: 40, id_paciente: 55, id_cita: 3432 };
const NOTA = { id_medico: 2, diagnostico: 'Faringitis aguda, sin fiebre', indicaciones: 'Reposo, hidratacion' };
const FORMATO = /^[0-9a-f]{24}:[0-9a-f]+:[0-9a-f]{32}$/;

function cifrar(nota = NOTA, cita = CITA, clave = CLAVE_PRUEBA) {
  return ejecutar(cifraNota, {
    entrada: [cita],
    anteriores: { 'Valida datos': nota },
    env: { SIGAC_CLAVE_CIFRADO: clave }
  });
}

const salidaDe = (nota, cita) => cifrar(nota, cita).salida[0].json;

function descifrar(valor, clave = CLAVE_PRUEBA) {
  const [iv, datos, etiqueta] = valor.split(':');
  const d = crypto.createDecipheriv('aes-256-gcm', Buffer.from(clave, 'hex'), Buffer.from(iv, 'hex'));
  d.setAuthTag(Buffer.from(etiqueta, 'hex'));
  return Buffer.concat([d.update(Buffer.from(datos, 'hex')), d.final()]).toString('utf8');
}

// ------------------------------------------------------------
// A. Clave de cifrado
// ------------------------------------------------------------
describe('WF-07 · Cifra la nota · A. Clave', () => {
  test('UT-CIF07-01 · clave valida: cifra sin error', () => {
    expect(() => cifrar()).not.toThrow();
  });

  test.each([
    ['UT-CIF07-02', '62 caracteres', CLAVE_PRUEBA.slice(0, 62)],
    ['UT-CIF07-03', '66 caracteres', CLAVE_PRUEBA + 'ff'],
    ['UT-CIF07-04', 'no hexadecimal', 'z'.repeat(64)]
  ])('%s · clave de %s: lanza error', (_, __, clave) => {
    expect(() => cifrar(NOTA, CITA, clave)).toThrow('SIGAC_CLAVE_CIFRADO debe ser de 32 bytes');
  });

  test('UT-CIF07-05 · variable de entorno sin definir: lanza error', () => {
    expect(() => ejecutar(cifraNota, { entrada: [CITA], anteriores: { 'Valida datos': NOTA }, env: {} })).toThrow();
  });
});

// ------------------------------------------------------------
// B. Cifrado del texto clinico
// ------------------------------------------------------------
describe('WF-07 · Cifra la nota · B. Cifrado', () => {
  test('UT-CIF07-06 · diagnostico e indicaciones con formato iv:texto:etiqueta', () => {
    const salida = salidaDe();
    expect(salida.diagnostico_cifrado).toMatch(FORMATO);
    expect(salida.indicaciones_cifrado).toMatch(FORMATO);
  });

  test('UT-CIF07-07 · el diagnostico se recupera al descifrar, con sus comas', () => {
    expect(descifrar(salidaDe().diagnostico_cifrado)).toBe('Faringitis aguda, sin fiebre');
  });

  test('UT-CIF07-08 · las indicaciones se recuperan al descifrar', () => {
    expect(descifrar(salidaDe().indicaciones_cifrado)).toBe('Reposo, hidratacion');
  });

  test('UT-CIF07-09 · texto con tildes y ñ vuelve identico', () => {
    const salida = salidaDe({ ...NOTA, diagnostico: 'Otitis en niño, dolor leve' });
    expect(descifrar(salida.diagnostico_cifrado)).toBe('Otitis en niño, dolor leve');
  });

  test('UT-CIF07-10 · la misma nota cifrada dos veces da textos distintos', () => {
    expect(salidaDe().diagnostico_cifrado).not.toBe(salidaDe().diagnostico_cifrado);
  });

  test('UT-CIF07-11 · un texto cifrado alterado se detecta al descifrar', () => {
    const [iv, texto, etiqueta] = salidaDe().diagnostico_cifrado.split(':');
    const alterado = (texto[0] === '0' ? '1' : '0') + texto.slice(1);
    expect(() => descifrar([iv, alterado, etiqueta].join(':'))).toThrow();
  });
});

// ------------------------------------------------------------
// C. Indicaciones ausentes
// ------------------------------------------------------------
describe('WF-07 · Cifra la nota · C. Indicaciones ausentes', () => {
  test.each([
    ['UT-CIF07-12', 'nulas', null],
    ['UT-CIF07-13', 'vacias', '']
  ])('%s · indicaciones %s: centinela "null" para Guarda nota', (_, __, indicaciones) => {
    expect(salidaDe({ ...NOTA, indicaciones }).indicaciones_cifrado).toBe('null');
  });

  test('UT-CIF07-14 · sin diagnostico: queda nulo (Valida datos nunca lo deja pasar)', () => {
    expect(salidaDe({ ...NOTA, diagnostico: '' }).diagnostico_cifrado).toBeNull();
  });
});

// ------------------------------------------------------------
// D. Origen de cada campo y contrato
// ------------------------------------------------------------
describe('WF-07 · Cifra la nota · D. Origen y contrato', () => {
  test('UT-CIF07-15 · expediente, paciente y cita salen de la cita encontrada', () => {
    const salida = salidaDe(NOTA, { id_expediente: 7, id_paciente: 8, id_cita: 9 });
    expect([salida.id_expediente, salida.id_paciente, salida.id_cita]).toEqual([7, 8, 9]);
  });

  test('UT-CIF07-16 · el medico sale de Valida datos, es decir, del token', () => {
    expect(salidaDe({ ...NOTA, id_medico: 4 }).id_medico).toBe(4);
  });

  test('UT-CIF07-17 · la salida no lleva el texto clinico en claro', () => {
    const texto = JSON.stringify(cifrar().salida);
    expect(texto).not.toContain('Faringitis');
    expect(texto).not.toContain('Reposo');
  });

  test('UT-CIF07-18 · consulta Valida datos (verify)', () => {
    expect(cifrar().$).toHaveBeenCalledWith('Valida datos');
  });

  test('UT-CIF07-19 · devuelve un item con exactamente los seis campos', () => {
    const { salida } = cifrar();
    expect(salida).toHaveLength(1);
    expect(Object.keys(salida[0].json).sort()).toEqual([
      'diagnostico_cifrado', 'id_cita', 'id_expediente', 'id_medico', 'id_paciente', 'indicaciones_cifrado'
    ]);
  });
});
