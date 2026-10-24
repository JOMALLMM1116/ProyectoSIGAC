// WF-05 · Cierre de cita · Rechazo 404
// modo: runOnceForAllItems
// usa: nada de n8n
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-05_cierre.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf05_rechazo_404($input, $, $json, $env, DateTime) {
// la cita no existe, ya fue cerrada o cancelada, es una cita
// futura, o el resultado enviado no era atendida ni ausente.
// mensaje unico a proposito: no se revela cual de los casos es.
return [{
  json: {
    codigo: 404,
    estado: 'rechazado',
    mensaje: 'La cita no existe o no esta en condiciones de cerrarse'
  }
}];
}

wf05_rechazo_404.meta = {"flujo":"WF-05 · Cierre de cita","nodo":"Rechazo 404","modo":"runOnceForAllItems","asincrona":false,"variables":[]};

module.exports = wf05_rechazo_404;
