// sigac.wf01.cifradatossensibles.test.js
//
// pruebas unitarias del nodo Cifra datos sensibles de WF-01.
// cifra el DPI y el telefono con AES-256-GCM y calcula la huella
// sha-256 del DPI.
//
// el nodo corre en modo "una vez por item": recibe $json y devuelve
// un objeto, no una lista. como el cifrado es aleatorio, las pruebas
// no comparan contra un valor fijo: descifran el resultado y
// verifican que vuelva el dato original.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-CIF01-NN

'use strict';

const crypto = require('crypto');
const cifraDatos = require('../nodos/wf01_cifra_datos_sensibles.js');
const { ejecutar, sha256, CLAVE_PRUEBA } = require('../simulacion.js');

const DPI = '1234567890123';
const TELEFONO = '55551234';
const FORMATO = /^[0-9a-f]{24}:[0-9a-f]+:[0-9a-f]{32}$/;

// ejecuta el nodo con los datos y la clave indicados
function cifrar(datos, clave = CLAVE_PRUEBA, extra = {}) {
  return ejecutar(cifraDatos, {
    json: { ...extra, datos },
    env: { SIGAC_CLAVE_CIFRADO: clave }
  }).salida;
}

// la operacion inversa, para comprobar la ida y vuelta
function descifrar(valor, clave = CLAVE_PRUEBA) {
  const [iv, datos, etiqueta] = valor.split(':');
  const descifrador = crypto.createDecipheriv('aes-256-gcm', Buffer.from(clave, 'hex'), Buffer.from(iv, 'hex'));
  descifrador.setAuthTag(Buffer.from(etiqueta, 'hex'));
  return Buffer.concat([descifrador.update(Buffer.from(datos, 'hex')), descifrador.final()]).toString('utf8');
}

// ------------------------------------------------------------
// A. Clave de cifrado
// ------------------------------------------------------------
describe('WF-01 · Cifra datos sensibles · A. Clave de cifrado', () => {
  test('UT-CIF01-01 · clave de 64 caracteres hexadecimales: cifra sin error', () => {
    expect(() => cifrar({ dpi: DPI })).not.toThrow();
  });

  test.each([
    ['UT-CIF01-02', '62 caracteres (31 bytes)', CLAVE_PRUEBA.slice(0, 62)],
    ['UT-CIF01-03', '66 caracteres (33 bytes)', CLAVE_PRUEBA + 'ff'],
    ['UT-CIF01-04', 'caracteres que no son hexadecimales', 'z'.repeat(64)]
  ])('%s · clave de %s: lanza error', (_, __, clave) => {
    expect(() => cifrar({ dpi: DPI }, clave)).toThrow('SIGAC_CLAVE_CIFRADO debe ser de 32 bytes');
  });

  test('UT-CIF01-05 · variable de entorno sin definir: lanza error', () => {
    expect(() => ejecutar(cifraDatos, { json: { datos: { dpi: DPI } }, env: {} })).toThrow();
  });
});

// ------------------------------------------------------------
// B. Formato del cifrado
// ------------------------------------------------------------
describe('WF-01 · Cifra datos sensibles · B. Formato del cifrado', () => {
  test('UT-CIF01-06 · formato iv:texto:etiqueta en hexadecimal', () => {
    expect(cifrar({ dpi: DPI }).json.dpi_cifrado).toMatch(FORMATO);
  });

  test('UT-CIF01-07 · iv de 24 caracteres y etiqueta de 32', () => {
    const [iv, , etiqueta] = cifrar({ dpi: DPI }).json.dpi_cifrado.split(':');
    expect(iv).toHaveLength(24);
    expect(etiqueta).toHaveLength(32);
  });

  test('UT-CIF01-08 · un DPI de 13 caracteres da 26 caracteres cifrados', () => {
    const [, texto] = cifrar({ dpi: DPI }).json.dpi_cifrado.split(':');
    expect(texto).toHaveLength(26);
  });
});

// ------------------------------------------------------------
// C. Ida y vuelta
// ------------------------------------------------------------
describe('WF-01 · Cifra datos sensibles · C. Ida y vuelta', () => {
  test('UT-CIF01-09 · el DPI se recupera al descifrar', () => {
    expect(descifrar(cifrar({ dpi: DPI }).json.dpi_cifrado)).toBe(DPI);
  });

  test('UT-CIF01-10 · el telefono se recupera al descifrar', () => {
    expect(descifrar(cifrar({ dpi: DPI, telefono: TELEFONO }).json.telefono_cifrado)).toBe(TELEFONO);
  });

  test('UT-CIF01-11 · un texto con tildes y ñ vuelve identico', () => {
    expect(descifrar(cifrar({ dpi: 'Peñate Gómez' }).json.dpi_cifrado)).toBe('Peñate Gómez');
  });

  test('UT-CIF01-12 · con otra clave no se puede descifrar', () => {
    const cifrado = cifrar({ dpi: DPI }).json.dpi_cifrado;
    const otraClave = 'ff'.repeat(32);
    expect(() => descifrar(cifrado, otraClave)).toThrow();
  });

  test('UT-CIF01-13 · un texto cifrado alterado se detecta al descifrar', () => {
    const [iv, texto, etiqueta] = cifrar({ dpi: DPI }).json.dpi_cifrado.split(':');
    const alterado = (texto[0] === '0' ? '1' : '0') + texto.slice(1);
    expect(() => descifrar([iv, alterado, etiqueta].join(':'))).toThrow();
  });
});

// ------------------------------------------------------------
// D. Aleatoriedad e IV
// ------------------------------------------------------------
describe('WF-01 · Cifra datos sensibles · D. Aleatoriedad', () => {
  test('UT-CIF01-14 · el mismo DPI cifrado dos veces da textos distintos', () => {
    expect(cifrar({ dpi: DPI }).json.dpi_cifrado).not.toBe(cifrar({ dpi: DPI }).json.dpi_cifrado);
  });

  test('UT-CIF01-15 · el iv nunca se reutiliza', () => {
    const iv1 = cifrar({ dpi: DPI }).json.dpi_cifrado.split(':')[0];
    const iv2 = cifrar({ dpi: DPI }).json.dpi_cifrado.split(':')[0];
    expect(iv1).not.toBe(iv2);
  });
});

// ------------------------------------------------------------
// E. Huella del DPI
// ------------------------------------------------------------
describe('WF-01 · Cifra datos sensibles · E. Huella del DPI', () => {
  test('UT-CIF01-16 · la huella es el sha-256 del DPI', () => {
    expect(cifrar({ dpi: DPI }).json.dpi_huella).toBe(sha256(DPI));
  });

  test('UT-CIF01-17 · el mismo DPI da siempre la misma huella', () => {
    expect(cifrar({ dpi: DPI }).json.dpi_huella).toBe(cifrar({ dpi: DPI }).json.dpi_huella);
  });

  test('UT-CIF01-18 · dos DPI distintos dan huellas distintas', () => {
    expect(cifrar({ dpi: DPI }).json.dpi_huella).not.toBe(cifrar({ dpi: '9999999999999' }).json.dpi_huella);
  });

  test('UT-CIF01-19 · un DPI como numero da la misma huella que como texto', () => {
    expect(cifrar({ dpi: 1234567890123 }).json.dpi_huella).toBe(sha256(DPI));
  });
});

// ------------------------------------------------------------
// F. Valores vacios
// ------------------------------------------------------------
describe('WF-01 · Cifra datos sensibles · F. Valores vacios', () => {
  test('UT-CIF01-20 · telefono vacio: queda nulo', () => {
    expect(cifrar({ dpi: DPI, telefono: '' }).json.telefono_cifrado).toBeNull();
  });

  test('UT-CIF01-21 · sin telefono: queda nulo', () => {
    expect(cifrar({ dpi: DPI }).json.telefono_cifrado).toBeNull();
  });

  test('UT-CIF01-22 · telefono como numero: se cifra igual que como texto', () => {
    expect(descifrar(cifrar({ dpi: DPI, telefono: 55551234 }).json.telefono_cifrado)).toBe(TELEFONO);
  });

  // observacion: Valida datos nunca deja pasar una solicitud sin DPI,
  // asi que este caso no ocurre en el flujo. la prueba documenta que
  // la proteccion depende de Valida datos y no de este nodo.
  test('UT-CIF01-23 · sin DPI: cifrado nulo y huella de la palabra "undefined"', () => {
    const salida = cifrar({ telefono: TELEFONO });
    expect(salida.json.dpi_cifrado).toBeNull();
    expect(salida.json.dpi_huella).toBe(sha256('undefined'));
  });
});

// ------------------------------------------------------------
// G. Contrato de salida
// ------------------------------------------------------------
describe('WF-01 · Cifra datos sensibles · G. Contrato de salida', () => {
  test('UT-CIF01-24 · devuelve un objeto con json, no una lista', () => {
    const salida = cifrar({ dpi: DPI });
    expect(Array.isArray(salida)).toBe(false);
    expect(salida).toHaveProperty('json');
  });

  test('UT-CIF01-25 · conserva los campos que traia y agrega los tres nuevos', () => {
    const salida = cifrar({ dpi: DPI, telefono: TELEFONO }, CLAVE_PRUEBA, { valido: true, rol: 'recepcion' });
    expect(salida.json.valido).toBe(true);
    expect(salida.json.rol).toBe('recepcion');
    expect(salida.json.datos).toEqual({ dpi: DPI, telefono: TELEFONO });
    expect(salida.json).toHaveProperty('dpi_cifrado');
    expect(salida.json).toHaveProperty('dpi_huella');
    expect(salida.json).toHaveProperty('telefono_cifrado');
  });

  test('UT-CIF01-26 · los campos cifrados no contienen el dato en claro', () => {
    const { dpi_cifrado, dpi_huella, telefono_cifrado } = cifrar({ dpi: DPI, telefono: TELEFONO }).json;
    const protegidos = JSON.stringify({ dpi_cifrado, dpi_huella, telefono_cifrado });
    expect(protegidos).not.toContain(DPI);
    expect(protegidos).not.toContain(TELEFONO);
  });
});

