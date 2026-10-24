// WF-05 · Cierre de cita · Hash del token
// modo: runOnceForAllItems
// usa: $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-05_cierre.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf05_hash_del_token($input, $, $json, $env, DateTime) {
// misma autenticacion que los demas flujos: se compara hash
// contra hash, nunca el token en claro.
const crypto = require('crypto');

const cabeceras = $input.first().json.headers || {};
const cuerpo    = $input.first().json.body    || {};

const token = cabeceras['x-sigac-token'] || '';

const tokenHash = token
  ? crypto.createHash('sha256').update(token).digest('hex')
  : 'sin-token';

// solo se aceptan estos dos resultados de cierre
const resultado = ['atendida', 'ausente'].includes(cuerpo.resultado)
  ? cuerpo.resultado
  : null;

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
    resultado: resultado || 'invalido'
  }
}];
}

wf05_hash_del_token.meta = {"flujo":"WF-05 · Cierre de cita","nodo":"Hash del token","modo":"runOnceForAllItems","asincrona":false,"variables":["$input"]};

module.exports = wf05_hash_del_token;
