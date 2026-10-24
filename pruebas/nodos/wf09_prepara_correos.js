// WF-09 Administracion de personas · Prepara correos
// modo: runOnceForAllItems
// usa: $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-09_administracion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf09_prepara_correos($input, $, $json, $env, DateTime) {
// arma un item por cada paciente que debe recibir aviso: uno por cita
// reasignada y uno por cita cancelada. si el medico no tenia citas,
// devuelve una lista vacia y Envia correo no se ejecuta; la respuesta
// al admin sale por la otra rama y no depende de esta.
const r = $input.first().json;

function leer(valor) {
  if (!valor) return [];
  return typeof valor === 'string' ? JSON.parse(valor) : valor;
}

const correos = [];

for (const c of leer(r.detalle_reasignadas)) {
  correos.push({
    json: {
      para: c.correo,
      asunto: 'SIGAC - Cambio de medico en su cita del ' + c.fecha,
      texto:
        'Estimado(a) ' + c.paciente + ':\n\n' +
        'Le informamos que su cita del ' + c.fecha + ' a las ' + c.hora +
        ' sigue en pie, pero sera atendida por ' + c.medico_nuevo +
        ' (' + c.especialidad + '), porque el medico asignado anteriormente ya no esta disponible.\n\n' +
        'No necesita hacer nada: la fecha y la hora se mantienen.\n\n' +
        'Clinica - SIGAC'
    }
  });
}

for (const c of leer(r.detalle_canceladas)) {
  correos.push({
    json: {
      para: c.correo,
      asunto: 'SIGAC - Su cita del ' + c.fecha + ' no esta disponible',
      texto:
        'Estimado(a) ' + c.paciente + ':\n\n' +
        'Lamentamos informarle que la cita que tenia programada para el ' + c.fecha +
        ' a las ' + c.hora + ' ya no esta disponible, porque el medico asignado no podra atenderla ' +
        'y no encontramos otro medico libre en ese horario.\n\n' +
        'Por favor, llame a la clinica para recibir mas informacion y reprogramar su cita.\n\n' +
        'Clinica - SIGAC'
    }
  });
}

return correos;
}

wf09_prepara_correos.meta = {"flujo":"WF-09 Administracion de personas","nodo":"Prepara correos","modo":"runOnceForAllItems","asincrona":false,"variables":["$input"]};

module.exports = wf09_prepara_correos;
