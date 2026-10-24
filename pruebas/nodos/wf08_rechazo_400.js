// WF-08 Consulta de historial clinico · Rechazo 400
// modo: runOnceForAllItems
// usa: $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-08_historial_clinico.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf08_rechazo_400($input, $, $json, $env, DateTime) {
return [{ json: { codigo: 400, estado: 'rechazado', mensaje: 'Datos invalidos', errores: $input.first().json.errores } }];
}

wf08_rechazo_400.meta = {"flujo":"WF-08 Consulta de historial clinico","nodo":"Rechazo 400","modo":"runOnceForAllItems","asincrona":false,"variables":["$input"]};

module.exports = wf08_rechazo_400;
