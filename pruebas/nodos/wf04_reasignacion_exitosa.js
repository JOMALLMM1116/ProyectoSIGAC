// WF-04 Reasignacion de cupos · Reasignacion exitosa
// modo: runOnceForAllItems
// usa: $(), $json
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-04_reasignacion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf04_reasignacion_exitosa($input, $, $json, $env, DateTime) {
// cita cancelada y cupo reasignado al siguiente en espera.
return [{
  json: {
    codigo: 200,
    estado: 'reasignado',
    mensaje: 'Cita cancelada y cupo reasignado',
    id_cita_cancelada: $('Cancela cita').first().json.id_cita,
    id_cita_nueva: $json.id_cita_nueva,
    id_solicitud_beneficiada: $json.id_solicitud
  }
}];

}

wf04_reasignacion_exitosa.meta = {"flujo":"WF-04 Reasignacion de cupos","nodo":"Reasignacion exitosa","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$json"]};

module.exports = wf04_reasignacion_exitosa;
