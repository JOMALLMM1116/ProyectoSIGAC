// WF-09 Administracion de personas · Rechazo 401
// modo: runOnceForAllItems
// usa: nada de n8n
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-09_administracion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf09_rechazo_401($input, $, $json, $env, DateTime) {
return [{ json: { codigo: 401, estado: 'rechazado', mensaje: 'No autorizado' } }];
}

wf09_rechazo_401.meta = {"flujo":"WF-09 Administracion de personas","nodo":"Rechazo 401","modo":"runOnceForAllItems","asincrona":false,"variables":[]};

module.exports = wf09_rechazo_401;
