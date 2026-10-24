// WF-09 Administracion de personas · Rechazo estado medico
// modo: runOnceForAllItems
// usa: $(), $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-09_administracion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf09_rechazo_estado_medico($input, $, $json, $env, DateTime) {
// los dos casos en que no se aplica nada: el medico no existe, o ya
// fue dado de baja. ninguna cita se toca y no se escribe en la bitacora.
const r = $input.first().json;
const id = $('Valida datos').first().json.id;

if (r.resultado === 'no_existe') {
  return [{ json: { codigo: 404, estado: 'rechazado', mensaje: 'No existe el medico ' + id } }];
}

return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'El medico ' + id + ' ya fue dado de baja; la baja es definitiva' } }];
}

wf09_rechazo_estado_medico.meta = {"flujo":"WF-09 Administracion de personas","nodo":"Rechazo estado medico","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$input"]};

module.exports = wf09_rechazo_estado_medico;
