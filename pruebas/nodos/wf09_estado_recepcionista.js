// WF-09 Administracion de personas · Estado recepcionista
// modo: runOnceForAllItems
// usa: $(), $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-09_administracion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf09_estado_recepcionista($input, $, $json, $env, DateTime) {
// traduce el resultado de la consulta al codigo de respuesta.
// un solo nodo con tres salidas posibles en lugar de un If y tres
// nodos de respuesta: la decision ya la tomo la base, aqui solo se
// redacta.
const r = $input.first().json;
const id = $('Valida datos').first().json.id;

if (r.resultado === 'no_existe') {
  return [{ json: { codigo: 404, estado: 'rechazado', mensaje: 'No existe la recepcionista ' + id } }];
}

if (r.resultado === 'ya_baja') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'La recepcionista ' + id + ' ya fue dada de baja; la baja es definitiva' } }];
}

return [{
  json: {
    codigo: 200,
    estado: 'actualizado',
    mensaje: r.dada_de_baja
      ? 'Recepcionista ' + id + ' dada de baja'
      : 'Recepcionista ' + id + ' desactivada',
    tokens_desactivados: Number(r.tokens_desactivados),
    hash_auditoria: r.hash_auditoria
  }
}];
}

wf09_estado_recepcionista.meta = {"flujo":"WF-09 Administracion de personas","nodo":"Estado recepcionista","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$input"]};

module.exports = wf09_estado_recepcionista;
