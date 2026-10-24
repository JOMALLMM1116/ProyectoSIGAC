// WF-04 Reasignacion de cupos · Rechazo 401
// modo: runOnceForAllItems
// usa: nada de n8n
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-04_reasignacion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf04_rechazo_401($input, $, $json, $env, DateTime) {
// token ausente, invalido, o rol sin permiso para cancelar.
// mensaje generico a proposito.
return [{
  json: {
    codigo: 401,
    estado: 'rechazado',
    mensaje: 'Token ausente o invalido, o rol sin autorizacion'
  }
}];
}

wf04_rechazo_401.meta = {"flujo":"WF-04 Reasignacion de cupos","nodo":"Rechazo 401","modo":"runOnceForAllItems","asincrona":false,"variables":[]};

module.exports = wf04_rechazo_401;
