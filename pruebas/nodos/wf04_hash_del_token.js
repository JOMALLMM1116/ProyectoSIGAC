// WF-04 Reasignacion de cupos · Hash del token
// modo: runOnceForAllItems
// usa: $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-04_reasignacion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf04_hash_del_token($input, $, $json, $env, DateTime) {
// misma autenticacion que WF-01: se compara hash contra hash,
// nunca el token en claro.
const crypto = require('crypto');

const cabeceras = $input.first().json.headers || {};
const cuerpo    = $input.first().json.body    || {};

const token = cabeceras['x-sigac-token'] || '';

const tokenHash = token
  ? crypto.createHash('sha256').update(token).digest('hex')
  : 'sin-token';

// id_cita debe ser un entero positivo. cualquier otra cosa ("abc",
// "12.5", true) se reemplaza por el centinela 0: ninguna cita tiene
// id 0, asi que termina en el Rechazo 404. antes un valor no numerico
// llegaba a la consulta, el ::int fallaba y el error caia en WF-00.
const valorCita = String(cuerpo.id_cita ?? '').trim();
const idCita = /^[1-9]\d*$/.test(valorCita) ? Number(valorCita) : 0;

return [{
  json: {
    token_hash: tokenHash,
    id_cita: idCita,
    motivo: cuerpo.motivo || 'sin motivo'
  }
}];
}

wf04_hash_del_token.meta = {"flujo":"WF-04 Reasignacion de cupos","nodo":"Hash del token","modo":"runOnceForAllItems","asincrona":false,"variables":["$input"]};

module.exports = wf04_hash_del_token;
