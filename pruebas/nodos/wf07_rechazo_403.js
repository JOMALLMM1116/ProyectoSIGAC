// WF-07 Registro de nota clinica · Rechazo 403
// modo: runOnceForAllItems
// usa: nada de n8n
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-07_nota_clinica.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf07_rechazo_403($input, $, $json, $env, DateTime) {
return [{ json: { codigo: 403, estado: 'rechazado', mensaje: 'Operacion no permitida para este rol' } }];
}

wf07_rechazo_403.meta = {"flujo":"WF-07 Registro de nota clinica","nodo":"Rechazo 403","modo":"runOnceForAllItems","asincrona":false,"variables":[]};

module.exports = wf07_rechazo_403;
