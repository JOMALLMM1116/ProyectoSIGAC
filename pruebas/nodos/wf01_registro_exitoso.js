// WF-01 Ingesta de solicitudes · Registro exitoso
// modo: runOnceForAllItems
// usa: $(), $json
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-01_ingesta.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf01_registro_exitoso($input, $, $json, $env, DateTime) {
// solicitud registrada y auditada.
// se devuelve el id para que el emisor pueda dar seguimiento.
return [{
  json: {
    codigo: 201,
    estado: 'registrado',
    mensaje: 'Solicitud de cita registrada',
    id_solicitud: $('Guarda solicitud').first().json.id_solicitud,
    estado_solicitud: $('Guarda solicitud').first().json.estado,
    hash_auditoria: $json.hash_actual
  }
}];
}

wf01_registro_exitoso.meta = {"flujo":"WF-01 Ingesta de solicitudes","nodo":"Registro exitoso","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$json"]};

module.exports = wf01_registro_exitoso;
