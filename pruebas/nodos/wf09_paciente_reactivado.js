// WF-09 Administracion de personas · Paciente reactivado
// modo: runOnceForAllItems
// usa: $(), $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-09_administracion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf09_paciente_reactivado($input, $, $json, $env, DateTime) {
// traduce el resultado de la reactivacion al codigo de respuesta
const r = $input.first().json;
const id = $('Valida datos').first().json.id;

if (r.resultado === 'no_existe') {
  return [{ json: { codigo: 404, estado: 'rechazado', mensaje: 'No existe el paciente ' + id } }];
}

if (r.resultado === 'ya_baja') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'El paciente ' + id + ' fue dado de baja; la baja es definitiva' } }];
}

if (r.resultado === 'ya_activo') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'El paciente ' + id + ' ya esta activo' } }];
}

return [{
  json: {
    codigo: 200,
    estado: 'actualizado',
    mensaje: 'Paciente ' + id + ' reactivado',
    hash_auditoria: r.hash_auditoria
  }
}];
}

wf09_paciente_reactivado.meta = {"flujo":"WF-09 Administracion de personas","nodo":"Paciente reactivado","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$input"]};

module.exports = wf09_paciente_reactivado;
