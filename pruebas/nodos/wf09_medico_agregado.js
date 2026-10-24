// WF-09 Administracion de personas · Medico agregado
// modo: runOnceForAllItems
// usa: $(), $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-09_administracion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf09_medico_agregado($input, $, $json, $env, DateTime) {
// traduce el resultado del alta al codigo de respuesta.
// solo en el caso ok se devuelve el token: si el colegiado estaba
// duplicado no se guardo nada y el token generado se descarta.
const r = $input.first().json;
const datos = $('Valida datos').first().json;

if (r.resultado === 'colegiado_duplicado') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'Ya existe un medico con el colegiado ' + datos.colegiado } }];
}

return [{
  json: {
    codigo: 201,
    estado: 'registrado',
    mensaje: 'Medico agregado con el horario estandar',
    id_medico: r.id_medico,
    especialidad: datos.especialidad,
    franjas_de_horario: Number(r.franjas),
    token: $('Genera token medico').first().json.token,
    aviso: 'Guarde este token ahora: no se volvera a mostrar',
    hash_auditoria: r.hash_auditoria
  }
}];
}

wf09_medico_agregado.meta = {"flujo":"WF-09 Administracion de personas","nodo":"Medico agregado","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$input"]};

module.exports = wf09_medico_agregado;
