// WF-07 Registro de nota clinica · Valida datos
// modo: runOnceForAllItems
// usa: $()
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-07_nota_clinica.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf07_valida_datos($input, $, $json, $env, DateTime) {
// valida el cuerpo de la nota clinica. igual que WF-01, los
// errores se acumulan y se devuelven todos en una sola respuesta.
//
// el id_medico NO se lee del cuerpo: sale del token verificado.
// asi nadie puede firmar una nota a nombre de otro medico.
const cuerpo = $('Hash del token').first().json.datos || {};
const medico = $('Verifica token').first().json;

const errores = [];
const MAX = 2000;

// defecto 12.24: antes se convertia con Number(), y Number(true) es 1,
// de modo que "id_cita": true se aceptaba como la cita 1. ahora solo se
// acepta un numero o un texto que contenga un entero positivo, igual
// que id_medico_solicitado en WF-01 (defecto 12.23).
const valorCita = (typeof cuerpo.id_cita === 'number' || typeof cuerpo.id_cita === 'string')
  ? String(cuerpo.id_cita).trim()
  : '';
const idCita = /^[1-9]\d*$/.test(valorCita) ? Number(valorCita) : null;
if (idCita === null) {
  errores.push('id_cita debe ser un entero positivo');
}

const diagnostico = typeof cuerpo.diagnostico === 'string' ? cuerpo.diagnostico.trim() : '';
if (!diagnostico) {
  errores.push('diagnostico es obligatorio');
} else if (diagnostico.length > MAX) {
  errores.push(`diagnostico no puede exceder ${MAX} caracteres`);
}

// indicaciones es opcional: una consulta puede no requerir tratamiento
let indicaciones = null;
if (cuerpo.indicaciones !== undefined && cuerpo.indicaciones !== null && cuerpo.indicaciones !== '') {
  if (typeof cuerpo.indicaciones !== 'string') {
    errores.push('indicaciones debe ser texto');
  } else {
    indicaciones = cuerpo.indicaciones.trim();
    if (indicaciones.length > MAX) {
      errores.push(`indicaciones no puede exceder ${MAX} caracteres`);
    }
  }
}

return [{
  json: {
    valido: errores.length === 0,
    errores,
    id_cita: idCita,
    id_medico: medico.id_medico,
    diagnostico,
    indicaciones
  }
}];
}

wf07_valida_datos.meta = {"flujo":"WF-07 Registro de nota clinica","nodo":"Valida datos","modo":"runOnceForAllItems","asincrona":false,"variables":["$()"]};

module.exports = wf07_valida_datos;
