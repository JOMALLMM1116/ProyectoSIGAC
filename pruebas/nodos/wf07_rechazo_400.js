// WF-07 Registro de nota clinica · Rechazo 400
// modo: runOnceForAllItems
// usa: $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-07_nota_clinica.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf07_rechazo_400($input, $, $json, $env, DateTime) {
return [{ json: { codigo: 400, estado: 'rechazado', mensaje: 'Datos invalidos', errores: $input.first().json.errores } }];
}

wf07_rechazo_400.meta = {"flujo":"WF-07 Registro de nota clinica","nodo":"Rechazo 400","modo":"runOnceForAllItems","asincrona":false,"variables":["$input"]};

module.exports = wf07_rechazo_400;
