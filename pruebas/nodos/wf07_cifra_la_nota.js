// WF-07 Registro de nota clinica · Cifra la nota
// modo: runOnceForAllItems
// usa: $(), $env, $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-07_nota_clinica.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf07_cifra_la_nota($input, $, $json, $env, DateTime) {
// cifra diagnostico e indicaciones con AES-256-GCM, misma funcion
// y mismo formato que WF-01:  iv:textoCifrado:etiqueta
//
// la salida de este nodo ya no lleva el texto clinico en claro:
// solo los valores cifrados y los identificadores.
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

const cita = $input.first().json;
const nota = $('Valida datos').first().json;

return [{
  json: {
    id_expediente: cita.id_expediente,
    id_paciente: cita.id_paciente,
    id_cita: cita.id_cita,
    id_medico: nota.id_medico,
    diagnostico_cifrado: cifrar(nota.diagnostico),
    // centinela: un parametro vacio hace que n8n no lo envie (defecto 7.6).
    // la consulta lo convierte de vuelta en null con nullif (defecto 7.7)
    indicaciones_cifrado: cifrar(nota.indicaciones) ?? 'null'
  }
}];
}

wf07_cifra_la_nota.meta = {"flujo":"WF-07 Registro de nota clinica","nodo":"Cifra la nota","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$env","$input"]};

module.exports = wf07_cifra_la_nota;
