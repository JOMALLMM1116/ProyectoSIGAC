// WF-01 Ingesta de solicitudes · Cifra datos sensibles
// modo: runOnceForEachItem
// usa: $env, $json
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-01_ingesta.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf01_cifra_datos_sensibles($input, $, $json, $env, DateTime) {
// cifra los campos sensibles con AES-256-GCM.
// a diferencia de un hash, esto es reversible: WF-03 necesita
// el telefono real para notificar al paciente.
//
// formato almacenado:  iv:textoCifrado:etiqueta
// el iv es aleatorio en cada operacion, asi que dos cifrados del
// mismo dato dan resultados distintos. por eso existe ademas
// dpi_huella, que si es determinista y permite buscar.
const crypto = require('crypto');

const clave = Buffer.from($env.SIGAC_CLAVE_CIFRADO, 'hex');
if (clave.length !== 32) {
  throw new Error('SIGAC_CLAVE_CIFRADO debe ser de 32 bytes (64 caracteres hex)');
}

function cifrar(texto) {
  if (!texto) return null;
  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv('aes-256-gcm', clave, iv);
  const cifrado = Buffer.concat([cifrador.update(String(texto), 'utf8'), cifrador.final()]);
  const etiqueta = cifrador.getAuthTag();
  return [iv.toString('hex'), cifrado.toString('hex'), etiqueta.toString('hex')].join(':');
}

const datos = $json.datos;

return {
  json: {
    ...$json,
    dpi_cifrado: cifrar(datos.dpi),
    dpi_huella: crypto.createHash('sha256').update(String(datos.dpi)).digest('hex'),
    telefono_cifrado: cifrar(datos.telefono)
  }
};
}

wf01_cifra_datos_sensibles.meta = {"flujo":"WF-01 Ingesta de solicitudes","nodo":"Cifra datos sensibles","modo":"runOnceForEachItem","asincrona":false,"variables":["$env","$json"]};

module.exports = wf01_cifra_datos_sensibles;
