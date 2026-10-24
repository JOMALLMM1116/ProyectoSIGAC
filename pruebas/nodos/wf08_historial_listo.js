// WF-08 Consulta de historial clinico · Historial listo
// modo: runOnceForAllItems
// usa: $(), $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-08_historial_clinico.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf08_historial_listo($input, $, $json, $env, DateTime) {
// respuesta de exito. es la unica respuesta del sistema que entrega
// informacion clinica en claro, y solo al medico con cita vigente.
// el acceso ya quedo registrado en la bitacora antes de llegar aqui.
const historial = $('Descifra').first().json;
const bitacora = $input.first().json;

return [{
  json: {
    codigo: 200,
    estado: 'consultado',
    mensaje: historial.total === 0
      ? 'El paciente no tiene notas clinicas previas'
      : 'Historial clinico del paciente',
    id_cita: historial.id_cita,
    total: historial.total,
    notas: historial.notas,
    hash_auditoria: bitacora.hash_actual
  }
}];
}

wf08_historial_listo.meta = {"flujo":"WF-08 Consulta de historial clinico","nodo":"Historial listo","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$input"]};

module.exports = wf08_historial_listo;
