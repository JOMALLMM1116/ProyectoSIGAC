// WF-08 Consulta de historial clinico · Valida datos
// modo: runOnceForAllItems
// usa: $()
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-08_historial_clinico.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf08_valida_datos($input, $, $json, $env, DateTime) {
// valida el cuerpo de la consulta de historial. el medico solo
// envia el id de la cita que esta por atender: el paciente se
// deduce de la cita, nunca se recibe directamente.
//
// asi un medico no puede pedir el historial de cualquier paciente:
// solo el de un paciente con quien tiene una cita vigente.
const cuerpo = $('Hash del token').first().json.datos || {};
const medico = $('Verifica token').first().json;

const errores = [];

const idCita = Number(cuerpo.id_cita);
if (!Number.isInteger(idCita) || idCita <= 0) {
  errores.push('id_cita debe ser un entero positivo');
}

return [{
  json: {
    valido: errores.length === 0,
    errores,
    id_cita: idCita,
    id_medico: medico.id_medico
  }
}];
}

wf08_valida_datos.meta = {"flujo":"WF-08 Consulta de historial clinico","nodo":"Valida datos","modo":"runOnceForAllItems","asincrona":false,"variables":["$()"]};

module.exports = wf08_valida_datos;
