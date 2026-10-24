// simulacion.js
//
// herramientas compartidas por todos los archivos de prueba: simulan
// lo que n8n entrega a un nodo Code. es el equivalente a configurar
// los @Mock de Mockito una sola vez y reutilizarlos.

'use strict';

const crypto = require('crypto');
const { DateTime } = require('luxon');

// clave de cifrado SOLO para pruebas. no es la del .env.
const CLAVE_PRUEBA = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';

// lo que n8n entrega como $input o como $('Nodo'): una lista de
// items con first() y all()
function items(...jsons) {
  const lista = jsons.map(j => ({ json: j }));
  return { first: () => lista[0], all: () => lista };
}

// simula $('Nodo'): devuelve la salida que se le indique para cada
// nodo, y falla si el codigo pide un nodo que la prueba no preparo.
// es el equivalente a when(repositorio.buscar(...)).thenReturn(...)
function nodosAnteriores(salidas) {
  return jest.fn(nombre => {
    if (!(nombre in salidas)) {
      throw new Error('La prueba no simulo el nodo: ' + nombre);
    }
    const valor = salidas[nombre];
    return items(...(Array.isArray(valor) ? valor : [valor]));
  });
}

// ejecuta un nodo con todo lo que necesita. devuelve la salida y el
// simulador de $(), para poder verificar que nodos consulto
function ejecutar(funcion, opciones = {}) {
  const $ = nodosAnteriores(opciones.anteriores || {});
  const entrada = items(...(opciones.entrada || []));
  const salida = funcion.call(
    opciones.contexto || {},
    entrada,
    $,
    opciones.json || {},
    opciones.env || { SIGAC_CLAVE_CIFRADO: CLAVE_PRUEBA },
    DateTime
  );
  return { salida, $ };
}

const sha256 = texto => crypto.createHash('sha256').update(texto).digest('hex');

module.exports = { CLAVE_PRUEBA, items, nodosAnteriores, ejecutar, sha256 };
