// WF-01 Ingesta de solicitudes · Rechazo 403
// modo: runOnceForAllItems
// usa: nada de n8n
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-01_ingesta.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf01_rechazo_403($input, $, $json, $env, DateTime) {
// el token es valido pero el rol no tiene permiso para
// crear citas. solo recepcion puede hacerlo.
return [{
  json: {
    codigo: 403,
    estado: 'rechazado',
    mensaje: 'El rol no autoriza esta operacion'
  }
}];
}

wf01_rechazo_403.meta = {"flujo":"WF-01 Ingesta de solicitudes","nodo":"Rechazo 403","modo":"runOnceForAllItems","asincrona":false,"variables":[]};

module.exports = wf01_rechazo_403;
