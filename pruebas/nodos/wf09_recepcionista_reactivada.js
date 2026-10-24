// WF-09 Administracion de personas · Recepcionista reactivada
// modo: runOnceForAllItems
// usa: $(), $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-09_administracion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf09_recepcionista_reactivada($input, $, $json, $env, DateTime) {
// traduce el resultado de la reactivacion al codigo de respuesta.
// solo en el caso ok se devuelve el token nuevo: en los rechazos
// no se guardo nada, asi que el token generado se descarta.
const r = $input.first().json;
const id = $('Valida datos').first().json.id;

if (r.resultado === 'no_existe') {
  return [{ json: { codigo: 404, estado: 'rechazado', mensaje: 'No existe la recepcionista ' + id } }];
}

if (r.resultado === 'ya_baja') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'La recepcionista ' + id + ' fue dada de baja; la baja es definitiva' } }];
}

if (r.resultado === 'ya_activa') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'La recepcionista ' + id + ' ya esta activa' } }];
}

return [{
  json: {
    codigo: 200,
    estado: 'actualizado',
    mensaje: 'Recepcionista ' + id + ' reactivada con token nuevo',
    token: $('Genera token nuevo').first().json.token,
    aviso: 'Guarde este token ahora: no se volvera a mostrar. El token anterior sigue desactivado',
    hash_auditoria: r.hash_auditoria
  }
}];
}

wf09_recepcionista_reactivada.meta = {"flujo":"WF-09 Administracion de personas","nodo":"Recepcionista reactivada","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$input"]};

module.exports = wf09_recepcionista_reactivada;
