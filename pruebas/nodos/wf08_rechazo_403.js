// WF-08 Consulta de historial clinico · Rechazo 403
// modo: runOnceForAllItems
// usa: nada de n8n
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-08_historial_clinico.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf08_rechazo_403($input, $, $json, $env, DateTime) {
return [{ json: { codigo: 403, estado: 'rechazado', mensaje: 'Operacion no permitida para este rol' } }];
}

wf08_rechazo_403.meta = {"flujo":"WF-08 Consulta de historial clinico","nodo":"Rechazo 403","modo":"runOnceForAllItems","asincrona":false,"variables":[]};

module.exports = wf08_rechazo_403;
