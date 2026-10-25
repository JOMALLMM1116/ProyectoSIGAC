// WF-02 Clasificacion y asignacion · Reparte cupos
// modo: runOnceForAllItems
// usa: $()
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-02_clasificacion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf02_reparte_cupos($input, $, $json, $env, DateTime) {
// Busca cupo devuelve las franjas repetidas una vez por cada solicitud
// de entrada, asi que primero hay que quedarse con cada franja una vez.
const vistas = new Set();
const franjas = [];

// convierte "HH:MM" o "HH:MM:SS" en minutos desde medianoche
function aMinutos(texto) {
  const [h, m] = String(texto).split(':').map(Number);
  return h * 60 + m;
}

for (const f of $('Busca cupo').all()) {
  if (!f.json.id_medico) continue;
  const clave = f.json.id_medico + '|' + f.json.hora_inicio;
  if (vistas.has(clave)) continue;
  vistas.add(clave);

  const inicio = aMinutos(f.json.hora_inicio);
  const fin    = aMinutos(f.json.hora_fin);

  // horas que ya estan ocupadas en la base dentro de esta franja.
  // antes solo se conocia el conteo, y el calculo suponia que las
  // citas ocupaban la franja en orden y sin huecos: una cita pedida
  // a las 10:00 podia terminar asignada otra vez a otro paciente.
  const tomadas = String(f.json.horas_ocupadas || '')
    .split(',')
    .filter(Boolean)
    .map(aMinutos);

  franjas.push({
    id_medico: f.json.id_medico,
    especialidad: f.json.especialidad,
    inicio: inicio,
    fin: fin,
    // la franja de la manana empieza antes del mediodia
    nombre: inicio < 720 ? 'manana' : 'tarde',
    libres: Number(f.json.cupos) - Number(f.json.ocupados),
    ocupados: Number(f.json.ocupados),
    tomadas: tomadas
  });
}

// defecto 12.25: cada cita dura 30 minutos. un minuto esta libre solo
// si no hay otra cita que empiece menos de 30 minutos antes o despues.
// antes se comparaba solo la hora exacta: una cita a las 08:15 se
// cruzaba con otra a las 08:00 del mismo medico, y el indice
// uqcita_medico_horario de la base tampoco lo impide, porque tambien
// compara solo la hora exacta.
function estaLibre(franja, minuto) {
  return !franja.tomadas.some(t => Math.abs(t - minuto) < 30);
}

// convierte minutos desde medianoche al formato HH:MM:SS
function aHora(min) {
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' +
         String(min % 60).padStart(2, '0') + ':00';
}

// reparte las solicitudes entre las franjas con cupo disponible.
// se hace aqui y no en SQL porque todos los items se evaluan antes
// de que se inserte ninguna cita: la base todavia no refleja las
// asignaciones de este mismo lote.
//
// el sistema decide unicamente lo que el paciente no decidio: si
// pidio medico, especialidad u hora, se respeta; lo que no pidio,
// se resuelve aqui.
const solicitudes = $('Calcula prioridad').all();
const salida = [];

for (const s of solicitudes) {
  const d = s.json;

  // 1. candidatas: franjas con cupo que cumplan lo que el paciente pidio
  let candidatas = franjas.filter(f => f.libres > 0);

  if (d.id_medico_solicitado) {
    // pidio medico: solo ese. la especialidad se deduce de el.
    candidatas = candidatas.filter(f => f.id_medico === Number(d.id_medico_solicitado));
  } else {
    // sin medico pedido, la especialidad manda. si no la pidio,
    // va a Medicina General, que es el medico de primer contacto.
    const esp = d.especialidad_solicitada || 'Medicina General';
    candidatas = candidatas.filter(f => f.especialidad === esp);
  }

  const franjaPedida = d.franja_preferida && d.franja_preferida !== 'indiferente'
    ? d.franja_preferida
    : null;
  if (franjaPedida) {
    candidatas = candidatas.filter(f => f.nombre === franjaPedida);
  }

  // 2. si pidio hora exacta, solo sirve la franja que la contiene
  //    y solo si no se cruza con otra cita, ni de la base ni de
  //    este mismo lote
  let horaExacta = null;
  if (d.hora_solicitada) {
    horaExacta = aMinutos(d.hora_solicitada);
    candidatas = candidatas.filter(f =>
      horaExacta >= f.inicio &&
      horaExacta < f.fin &&
      estaLibre(f, horaExacta)
    );
  }

  // 3. entre las que quedan, la del medico con menos carga
  candidatas.sort((a, b) => a.ocupados - b.ocupados);
  const franja = candidatas[0];

  if (!franja) {
    salida.push({ json: { ...d, id_medico: null, hora_inicio: null } });
    continue;
  }

  // 4. calcular el minuto concreto
  let minuto = null;
  if (horaExacta !== null) {
    minuto = horaExacta;
  } else {
    // primer hueco de 30 minutos que no se cruce con otra cita. antes se usaba
    // inicio + 30 * ocupados, que choca con las horas pedidas por
    // otros pacientes y con las citas que ya existian en la base.
    for (let m = franja.inicio; m < franja.fin; m += 30) {
      if (estaLibre(franja, m)) {
        minuto = m;
        break;
      }
    }
    // si no queda ningun hueco libre en la franja, no hay cupo real
    if (minuto === null) {
      salida.push({ json: { ...d, id_medico: null, hora_inicio: null } });
      continue;
    }
  }

  franja.libres -= 1;
  franja.ocupados += 1;
  franja.tomadas.push(minuto);

  salida.push({
    json: { ...d, id_medico: franja.id_medico, hora_inicio: aHora(minuto) }
  });
}

return salida;
}

wf02_reparte_cupos.meta = {"flujo":"WF-02 Clasificacion y asignacion","nodo":"Reparte cupos","modo":"runOnceForAllItems","asincrona":false,"variables":["$()"]};

module.exports = wf02_reparte_cupos;
