// WF-02 Clasificacion y asignacion · Calcula prioridad
// modo: runOnceForAllItems
// usa: $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-02_clasificacion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf02_calcula_prioridad($input, $, $json, $env, DateTime) {
// la prioridad sale del tipo de consulta: 1 mayor urgencia, 5 menor.
// el turno reparte los items del mismo lote en horarios distintos,
// porque todos se evaluan antes de que se inserte ninguna cita.
//
// los cuatro campos de preferencia se propagan tal cual: este nodo
// no decide nada sobre ellos, pero Reparte cupos los necesita para
// respetar lo que el paciente si pidio.
const tipos = { urgencia: 1, control: 3, general: 5 };

return $input.all().map((item, i) => ({
  json: {
    id_solicitud: item.json.id,
    id_paciente: item.json.id_paciente,
    tipo_consulta: item.json.tipo_consulta,
    fecha_preferida: item.json.fecha_preferida,
    prioridad: tipos[item.json.tipo_consulta] || 5,
    turno: i,
    franja_preferida: item.json.franja_preferida,
    hora_solicitada: item.json.hora_solicitada,
    especialidad_solicitada: item.json.especialidad_solicitada,
    id_medico_solicitado: item.json.id_medico_solicitado
  }
}));
}

wf02_calcula_prioridad.meta = {"flujo":"WF-02 Clasificacion y asignacion","nodo":"Calcula prioridad","modo":"runOnceForAllItems","asincrona":false,"variables":["$input"]};

module.exports = wf02_calcula_prioridad;
