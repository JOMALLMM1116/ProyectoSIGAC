// WF-09 Administracion de personas · Reparte reemplazos
// modo: runOnceForAllItems
// usa: $(), $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-09_administracion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf09_reparte_reemplazos($input, $, $json, $env, DateTime) {
// decide, cita por cita, a que medico pasa o si se cancela. no toca
// la base: trabaja sobre la fotografia que armo Lee situacion del
// medico, y deja el plan listo para Aplica cambio de medico.
//
// regla: la cita conserva su fecha y hora; solo cambia el medico.
// primero se busca en la misma especialidad y, si no hay, en Medicina
// General. entre varios candidatos gana el de menor carga ese dia,
// igual que en WF-02. cada reasignacion se anota en memoria, para que
// la siguiente cita ya la cuente como ocupada.
const lectura = $input.first().json;
const datos = $('Valida datos').first().json;

// las columnas json normalmente llegan ya como objeto; si llegaran
// como texto se convierten aqui
function leer(valor, porDefecto) {
  if (valor === null || valor === undefined) return porDefecto;
  return typeof valor === 'string' ? JSON.parse(valor) : valor;
}

const medico = leer(lectura.medico, null);
const citas = leer(lectura.citas, []);
const candidatos = leer(lectura.candidatos, []);

if (!medico) {
  return [{ json: { resultado: 'no_existe' } }];
}
if (medico.baja_en) {
  return [{ json: { resultado: 'ya_baja' } }];
}

// "HH:MI" a minutos desde medianoche, para comparar horas como numeros
function minutos(hora) {
  return Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
}

// ocupacion en memoria: por candidato y por fecha, la lista de horas
const ocupacion = {};
for (const k of candidatos) {
  ocupacion[k.id] = {};
  for (const o of leer(k.ocupadas, [])) {
    if (!ocupacion[k.id][o.fecha]) ocupacion[k.id][o.fecha] = [];
    ocupacion[k.id][o.fecha].push(o.hora);
  }
}

const GENERAL = 'Medicina General';
const mismaEspecialidad = candidatos.filter(k => k.especialidad === medico.especialidad);
const generales = candidatos.filter(k => k.especialidad === GENERAL);

// si el que sale ya es de Medicina General, los dos grupos son el
// mismo y basta con revisar uno
const grupos = medico.especialidad === GENERAL ? [generales] : [mismaEspecialidad, generales];

// devuelve el candidato con menor carga que puede atender la cita,
// o null si ninguno del grupo puede
function buscar(grupo, cita) {
  const m = minutos(cita.hora);
  let mejor = null;

  for (const k of grupo) {
    // la franja de ese dia de la semana que contiene la hora de la cita
    const franja = leer(k.franjas, []).find(f =>
      f.dia === cita.dia && minutos(f.inicio) <= m && m < minutos(f.fin));
    if (!franja) continue;

    const horas = ocupacion[k.id][cita.fecha] || [];

    // ya tiene una cita que se cruza con esta. defecto 12.25: cada cita
    // dura 30 minutos, pero antes solo se comparaba la hora exacta, y una
    // cita a las 08:15 se le pasaba a un medico que ya tenia otra a las
    // 08:00. ahora se descarta si alguna empieza a menos de 30 minutos,
    // igual que en Reparte cupos de WF-02.
    if (horas.some(h => Math.abs(minutos(h) - m) < 30)) continue;

    // la franja ya llego a su cupo
    const enFranja = horas.filter(h =>
      minutos(h) >= minutos(franja.inicio) && minutos(h) < minutos(franja.fin)).length;
    if (enFranja >= franja.cupos) continue;

    // menor carga del dia; en empate, el id menor
    const carga = horas.length;
    if (!mejor || carga < mejor.carga || (carga === mejor.carga && k.id < mejor.id)) {
      mejor = { id: k.id, carga: carga };
    }
  }
  return mejor;
}

const reasignar = [];
const cancelar = [];

for (const cita of citas) {
  let elegido = null;
  for (const grupo of grupos) {
    elegido = buscar(grupo, cita);
    if (elegido) break;
  }

  if (elegido) {
    reasignar.push({ id_cita: cita.id, id_medico: elegido.id });
    if (!ocupacion[elegido.id][cita.fecha]) ocupacion[elegido.id][cita.fecha] = [];
    ocupacion[elegido.id][cita.fecha].push(cita.hora);
  } else {
    cancelar.push(cita.id);
  }
}

return [{
  json: {
    resultado: 'ok',
    id_medico: medico.id,
    baja: datos.baja,
    reasignar: reasignar,
    cancelar: cancelar,
    // las dos listas viajan como texto json para la consulta siguiente
    reasignar_json: JSON.stringify(reasignar),
    cancelar_json: JSON.stringify(cancelar)
  }
}];
}

wf09_reparte_reemplazos.meta = {"flujo":"WF-09 Administracion de personas","nodo":"Reparte reemplazos","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$input"]};

module.exports = wf09_reparte_reemplazos;
