// WF-04 Reasignacion de cupos · Cancelado sin reasignar
// modo: runOnceForAllItems
// usa: $()
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-04_reasignacion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf04_cancelado_sin_reasignar($input, $, $json, $env, DateTime) {
// se cancelo la cita pero nadie esperaba ese dia.
// el cupo queda libre para futuras solicitudes.
return [{
  json: {
    codigo: 200,
    estado: 'cancelado',
    mensaje: 'Cita cancelada. No habia nadie en lista de espera para esa fecha',
    id_cita_cancelada: $('Cancela cita').first().json.id_cita
  }
}];
}

wf04_cancelado_sin_reasignar.meta = {"flujo":"WF-04 Reasignacion de cupos","nodo":"Cancelado sin reasignar","modo":"runOnceForAllItems","asincrona":false,"variables":["$()"]};

module.exports = wf04_cancelado_sin_reasignar;
