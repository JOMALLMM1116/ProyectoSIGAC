// WF-01 Ingesta de solicitudes · Rechazo 400
// modo: runOnceForAllItems
// usa: $json
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-01_ingesta.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf01_rechazo_400($input, $, $json, $env, DateTime) {
// los datos no pasaron la validacion.
// se devuelve el detalle para que el emisor sepa que corregir.
return [{
  json: {
    codigo: 400,
    estado: 'rechazado',
    mensaje: 'Datos invalidos',
    errores: $json.errores
  }
}];
}

wf01_rechazo_400.meta = {"flujo":"WF-01 Ingesta de solicitudes","nodo":"Rechazo 400","modo":"runOnceForAllItems","asincrona":false,"variables":["$json"]};

module.exports = wf01_rechazo_400;
