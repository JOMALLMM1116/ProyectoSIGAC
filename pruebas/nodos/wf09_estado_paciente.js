// WF-09 Administracion de personas · Estado paciente
// modo: runOnceForAllItems
// usa: $(), $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-09_administracion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf09_estado_paciente($input, $, $json, $env, DateTime) {
// traduce el resultado de la consulta al codigo de respuesta.
// en el caso con_pendientes se informa cuantas citas y solicitudes
// tiene, para que recepcion sepa que debe resolver antes.
const r = $input.first().json;
const id = $('Valida datos').first().json.id;

// count(*) llega como texto desde postgres, por eso el Number()
const citas = Number(r.citas_futuras);
const solicitudes = Number(r.solicitudes_pendientes);

if (r.resultado === 'no_existe') {
  return [{ json: { codigo: 404, estado: 'rechazado', mensaje: 'No existe el paciente ' + id } }];
}

if (r.resultado === 'ya_baja') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'El paciente ' + id + ' ya fue dado de baja; la baja es definitiva' } }];
}

if (r.resultado === 'con_pendientes') {
  return [{
    json: {
      codigo: 409,
      estado: 'rechazado',
      mensaje: 'El paciente ' + id + ' tiene citas o solicitudes en curso; deben cancelarse o resolverse primero',
      citas_futuras: citas,
      solicitudes_pendientes: solicitudes
    }
  }];
}

return [{
  json: {
    codigo: 200,
    estado: 'actualizado',
    mensaje: r.dado_de_baja
      ? 'Paciente ' + id + ' dado de baja'
      : 'Paciente ' + id + ' desactivado',
    hash_auditoria: r.hash_auditoria
  }
}];
}

wf09_estado_paciente.meta = {"flujo":"WF-09 Administracion de personas","nodo":"Estado paciente","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$input"]};

module.exports = wf09_estado_paciente;
