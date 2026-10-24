// WF-07 Registro de nota clinica · Rechazo 404
// modo: runOnceForAllItems
// usa: nada de n8n
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-07_nota_clinica.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf07_rechazo_404($input, $, $json, $env, DateTime) {
// mismo mensaje para cita inexistente, ajena o en estado no valido:
// no se revela si la cita existe pero pertenece a otro medico
return [{ json: { codigo: 404, estado: 'rechazado', mensaje: 'Cita no encontrada o no admite nota' } }];
}

wf07_rechazo_404.meta = {"flujo":"WF-07 Registro de nota clinica","nodo":"Rechazo 404","modo":"runOnceForAllItems","asincrona":false,"variables":[]};

module.exports = wf07_rechazo_404;
