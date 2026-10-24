// WF-07 Registro de nota clinica · Nota registrada
// modo: runOnceForAllItems
// usa: $(), $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-07_nota_clinica.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf07_nota_registrada($input, $, $json, $env, DateTime) {
// respuesta de exito. el texto clinico no se devuelve:
// solo los identificadores y el hash de auditoria.
const nota = $('Guarda nota').first().json;
const bitacora = $input.first().json;

return [{
  json: {
    codigo: 201,
    estado: 'registrada',
    mensaje: 'Nota clinica registrada',
    id_nota: nota.id,
    id_cita: nota.id_cita,
    creado_en: nota.creado_en,
    hash_auditoria: bitacora.hash_actual
  }
}];
}

wf07_nota_registrada.meta = {"flujo":"WF-07 Registro de nota clinica","nodo":"Nota registrada","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$input"]};

module.exports = wf07_nota_registrada;
