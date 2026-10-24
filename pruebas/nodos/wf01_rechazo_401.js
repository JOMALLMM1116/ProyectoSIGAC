// WF-01 Ingesta de solicitudes · Rechazo 401
// modo: runOnceForAllItems
// usa: nada de n8n
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-01_ingesta.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf01_rechazo_401($input, $, $json, $env, DateTime) {
// token ausente o invalido.
// el mensaje es generico a proposito: no se revela si el token
// existe pero esta inactivo, ni si el rol es incorrecto.
return [{
  json: {
    codigo: 401,
    estado: 'rechazado',
    mensaje: 'Token ausente o invalido'
  }
}];
}

wf01_rechazo_401.meta = {"flujo":"WF-01 Ingesta de solicitudes","nodo":"Rechazo 401","modo":"runOnceForAllItems","asincrona":false,"variables":[]};

module.exports = wf01_rechazo_401;
