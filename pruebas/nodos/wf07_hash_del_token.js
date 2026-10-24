// WF-07 Registro de nota clinica · Hash del token
// modo: runOnceForAllItems
// usa: $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-07_nota_clinica.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf07_hash_del_token($input, $, $json, $env, DateTime) {
// lee el token de la cabecera y calcula su sha-256.
// nunca se compara el token en claro contra la base:
// se compara hash contra hash.
const crypto = require('crypto');

const cabeceras = $input.first().json.headers || {};
const cuerpo    = $input.first().json.body    || {};

const token = cabeceras['x-sigac-token'] || '';

// si no viene token se usa un centinela en lugar de cadena vacia.
// con la consulta parametrizada, un valor vacio hace que n8n no envie
// el parametro y PostgreSQL rechaza la consulta. 'sin-token' nunca
// puede coincidir con un sha-256, que solo contiene hexadecimales.
const tokenHash = token
  ? crypto.createHash('sha256').update(token).digest('hex')
  : 'sin-token';

return [{
  json: {
    token_hash: tokenHash,
    tiene_token: token.length > 0,
    datos: cuerpo
  }
}];
}

wf07_hash_del_token.meta = {"flujo":"WF-07 Registro de nota clinica","nodo":"Hash del token","modo":"runOnceForAllItems","asincrona":false,"variables":["$input"]};

module.exports = wf07_hash_del_token;
