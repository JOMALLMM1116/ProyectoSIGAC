// WF-09 Administracion de personas · Medico reactivado
// modo: runOnceForAllItems
// usa: $(), $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-09_administracion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf09_medico_reactivado($input, $, $json, $env, DateTime) {
// traduce el resultado de la reactivacion al codigo de respuesta.
// solo en el caso ok se devuelve el token nuevo.
const r = $input.first().json;
const id = $('Valida datos').first().json.id;

if (r.resultado === 'no_existe') {
  return [{ json: { codigo: 404, estado: 'rechazado', mensaje: 'No existe el medico ' + id } }];
}

if (r.resultado === 'ya_baja') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'El medico ' + id + ' fue dado de baja; la baja es definitiva' } }];
}

if (r.resultado === 'ya_activo') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'El medico ' + id + ' ya esta activo' } }];
}

return [{
  json: {
    codigo: 200,
    estado: 'actualizado',
    mensaje: 'Medico ' + id + ' reactivado con token nuevo',
    token: $('Genera token medico nuevo').first().json.token,
    aviso: 'Guarde este token ahora: no se volvera a mostrar. Sus citas anteriores no se restauran',
    hash_auditoria: r.hash_auditoria
  }
}];
}

wf09_medico_reactivado.meta = {"flujo":"WF-09 Administracion de personas","nodo":"Medico reactivado","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$input"]};

module.exports = wf09_medico_reactivado;
