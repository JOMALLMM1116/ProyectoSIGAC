// WF-09 Administracion de personas · Rechazo 400
// modo: runOnceForAllItems
// usa: $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-09_administracion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf09_rechazo_400($input, $, $json, $env, DateTime) {
return [{ json: { codigo: 400, estado: 'rechazado', mensaje: 'Datos invalidos', errores: $input.first().json.errores } }];
}

wf09_rechazo_400.meta = {"flujo":"WF-09 Administracion de personas","nodo":"Rechazo 400","modo":"runOnceForAllItems","asincrona":false,"variables":["$input"]};

module.exports = wf09_rechazo_400;
