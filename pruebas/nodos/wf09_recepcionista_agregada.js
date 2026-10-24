// WF-09 Administracion de personas · Recepcionista agregada
// modo: runOnceForAllItems
// usa: $(), $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-09_administracion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf09_recepcionista_agregada($input, $, $json, $env, DateTime) {
// 201 con el token en claro: es la unica vez que se muestra.
// el admin debe entregarlo a la recepcionista por un canal seguro.
const r = $input.first().json;

return [{
  json: {
    codigo: 201,
    estado: 'registrado',
    mensaje: 'Recepcionista agregada',
    id_recepcionista: r.id_recepcionista,
    token: $('Genera token').first().json.token,
    aviso: 'Guarde este token ahora: no se volvera a mostrar',
    hash_auditoria: r.hash_auditoria
  }
}];
}

wf09_recepcionista_agregada.meta = {"flujo":"WF-09 Administracion de personas","nodo":"Recepcionista agregada","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$input"]};

module.exports = wf09_recepcionista_agregada;
