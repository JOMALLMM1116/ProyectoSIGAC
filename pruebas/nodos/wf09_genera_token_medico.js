// WF-09 Administracion de personas · Genera token medico
// modo: runOnceForAllItems
// usa: $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-09_administracion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf09_genera_token_medico($input, $, $json, $env, DateTime) {
// genera el token de la persona nueva: 32 bytes aleatorios en
// hexadecimal, el mismo formato que openssl rand -hex 32.
// a la base solo va la huella. el token en claro viaja una sola
// vez, en la respuesta, y este flujo no guarda ejecuciones exitosas.
const crypto = require('crypto');

const token = crypto.randomBytes(32).toString('hex');
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

return [{
  json: {
    ...$input.first().json,
    token: token,
    token_hash: tokenHash
  }
}];
}

wf09_genera_token_medico.meta = {"flujo":"WF-09 Administracion de personas","nodo":"Genera token medico","modo":"runOnceForAllItems","asincrona":false,"variables":["$input"]};

module.exports = wf09_genera_token_medico;
