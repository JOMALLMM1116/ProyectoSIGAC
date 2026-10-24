// WF-01 Ingesta de solicitudes · Rechazo 409
// modo: runOnceForAllItems
// usa: nada de n8n
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-01_ingesta.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf01_rechazo_409($input, $, $json, $env, DateTime) {
// cambio 5: el paciente existe pero esta inactivo o dado de baja.
// 409 y no 403: el token y el rol son validos, lo que impide la
// operacion es el estado del paciente.
return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'El paciente no esta habilitado para solicitar citas' } }];
}

wf01_rechazo_409.meta = {"flujo":"WF-01 Ingesta de solicitudes","nodo":"Rechazo 409","modo":"runOnceForAllItems","asincrona":false,"variables":[]};

module.exports = wf01_rechazo_409;
