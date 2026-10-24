// WF-04 Reasignacion de cupos · Rechazo 404
// modo: runOnceForAllItems
// usa: nada de n8n
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-04_reasignacion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf04_rechazo_404($input, $, $json, $env, DateTime) {
// la cita no existe o ya no estaba confirmada.
return [{
  json: {
    codigo: 404,
    estado: 'rechazado',
    mensaje: 'La cita no existe o no estaba confirmada'
  }
}];
}

wf04_rechazo_404.meta = {"flujo":"WF-04 Reasignacion de cupos","nodo":"Rechazo 404","modo":"runOnceForAllItems","asincrona":false,"variables":[]};

module.exports = wf04_rechazo_404;
