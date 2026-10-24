// WF-05 · Cierre de cita · Rechazo 401
// modo: runOnceForAllItems
// usa: nada de n8n
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-05_cierre.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf05_rechazo_401($input, $, $json, $env, DateTime) {
// token ausente, invalido, o rol sin permiso para cerrar citas.
// el cierre lo hace el medico que atendio, no recepcion.
return [{
  json: {
    codigo: 401,
    estado: 'rechazado',
    mensaje: 'Token ausente o invalido, o rol sin autorizacion'
  }
}];

}

wf05_rechazo_401.meta = {"flujo":"WF-05 · Cierre de cita","nodo":"Rechazo 401","modo":"runOnceForAllItems","asincrona":false,"variables":[]};

module.exports = wf05_rechazo_401;
