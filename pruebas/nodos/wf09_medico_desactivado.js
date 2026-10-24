// WF-09 Administracion de personas · Medico desactivado
// modo: runOnceForAllItems
// usa: $(), $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-09_administracion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf09_medico_desactivado($input, $, $json, $env, DateTime) {
// respuesta 200 con el resumen de lo que paso con las citas del medico.
// los conteos llegan como texto desde postgres, por eso el Number().
const r = $input.first().json;
const id = $('Valida datos').first().json.id;

return [{
  json: {
    codigo: 200,
    estado: 'actualizado',
    mensaje: r.dado_de_baja
      ? 'Medico ' + id + ' dado de baja'
      : 'Medico ' + id + ' desactivado',
    citas_reasignadas: Number(r.reasignadas),
    citas_canceladas: Number(r.canceladas),
    preferencias_liberadas: Number(r.preferencias_liberadas),
    tokens_desactivados: Number(r.tokens_desactivados),
    hash_auditoria: r.hash_auditoria
  }
}];
}

wf09_medico_desactivado.meta = {"flujo":"WF-09 Administracion de personas","nodo":"Medico desactivado","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$input"]};

module.exports = wf09_medico_desactivado;
