// WF-05 · Cierre de cita · Cierre exitoso
// modo: runOnceForAllItems
// usa: $json
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-05_cierre.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf05_cierre_exitoso($input, $, $json, $env, DateTime) {
// la cita queda cerrada. el horario NO se libera: a diferencia
// de una cancelacion, aqui la consulta si ocurrio o el paciente
// no se presento, pero el cupo se consumio igual.
return [{
  json: {
    codigo: 200,
    estado: 'cerrada',
    mensaje: 'Cita cerrada correctamente',
    id_cita: $json.id_cita,
    resultado: $json.estado
  }
}];
}

wf05_cierre_exitoso.meta = {"flujo":"WF-05 · Cierre de cita","nodo":"Cierre exitoso","modo":"runOnceForAllItems","asincrona":false,"variables":["$json"]};

module.exports = wf05_cierre_exitoso;
