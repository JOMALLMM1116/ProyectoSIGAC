// WF-06 Reporte semanal · Compone el reporte
// modo: runOnceForAllItems · asincrona
// usa: $(), DateTime, this.helpers
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-06_reporte.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

async function wf06_compone_el_reporte($input, $, $json, $env, DateTime) {
// el reporte es agregado: solo conteos y nombres de medicos.
// no lleva ningun dato de paciente, ni siquiera enmascarado.
const ind = $('Reune indicadores').first().json;
const medicos = $('Carga por medico').all().map(m => m.json);

// la semana se calcula con luxon, que trae la semana ISO del
// calendario: empieza en lunes y la semana 1 es la que contiene el
// primer jueves del anio. el calculo anterior contaba bloques de 7
// dias desde el 1 de enero y se desfasaba una semana en 2026.
// el anio es el de la semana ISO: el 1 de enero puede pertenecer
// todavia a la ultima semana del anio anterior.
const ahora  = DateTime.now().setZone('America/Guatemala');
const fecha  = ahora.toFormat('dd/MM/yyyy');
const semana = ahora.weekNumber;
const anio   = ahora.weekYear;

const filasMedicos = medicos.map(m => `
  <tr>
    <td>${m.nombre}</td>
    <td>${m.especialidad}</td>
    <td class="n">${m.atendidas}</td>
    <td class="n">${m.confirmadas}</td>
    <td class="n">${m.ausentes}</td>
  </tr>`).join('');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<style>
  body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 40px; }
  h1 { font-size: 20px; margin: 0 0 4px 0; color: #1B2A5E; }
  .sub { font-size: 12px; color: #666; margin-bottom: 24px; }
  h2 { font-size: 13px; margin: 24px 0 8px 0; color: #1B2A5E;
       border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; background: #f2f4f8; padding: 6px 8px; font-weight: bold; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  td.n, th.n { text-align: right; }
  .nota { font-size: 10px; color: #777; margin: 4px 0 12px 0; }
  .pie { margin-top: 32px; font-size: 9px; color: #888;
         border-top: 1px solid #ddd; padding-top: 8px; }
</style>
</head>
<body>

<h1>SIGAC — Reporte semanal de indicadores</h1>
<div class="sub">Semana ${semana} del ${anio} &middot; Generado el ${fecha}</div>

<h2>Actividad de los ultimos 7 dias</h2>
<table>
  <tr><td>Solicitudes recibidas</td><td class="n">${ind.sol_semana}</td></tr>
  <tr><td>Citas creadas</td><td class="n">${ind.citas_semana}</td></tr>
  <tr><td>Errores de severidad alta</td><td class="n">${ind.errores_alta}</td></tr>
  <tr><td>Errores de severidad media</td><td class="n">${ind.errores_media}</td></tr>
  <tr><td>Errores de severidad baja</td><td class="n">${ind.errores_baja}</td></tr>
</table>

<h2>Citas por estado (acumulado)</h2>
<table>
  <tr><td>Confirmadas</td><td class="n">${ind.citas_confirmadas}</td></tr>
  <tr><td>Atendidas</td><td class="n">${ind.citas_atendidas}</td></tr>
  <tr><td>Canceladas</td><td class="n">${ind.citas_canceladas}</td></tr>
  <tr><td>Ausentes</td><td class="n">${ind.citas_ausentes}</td></tr>
</table>

<h2>Solicitudes por estado (acumulado)</h2>
<table>
  <tr><td>Pendientes de clasificar</td><td class="n">${ind.sol_pendientes}</td></tr>
  <tr><td>Asignadas</td><td class="n">${ind.sol_asignadas}</td></tr>
  <tr><td>En lista de espera</td><td class="n">${ind.sol_en_espera}</td></tr>
  <tr><td>Rechazadas</td><td class="n">${ind.sol_rechazadas}</td></tr>
</table>

<h2>Carga por medico (acumulado)</h2>
<table>
  <tr>
    <th>Medico</th><th>Especialidad</th>
    <th class="n">Atendidas</th><th class="n">Confirmadas</th><th class="n">Ausentes</th>
  </tr>
  ${filasMedicos}
</table>

<h2>Lista de espera (estado actual)</h2>
<table>
  <tr><td>Solicitudes aguardando cupo</td><td class="n">${ind.espera_pendientes}</td></tr>
  <tr><td>Reasignaciones completadas</td><td class="n">${ind.espera_atendidas}</td></tr>
</table>

<div class="pie">
  Documento generado automaticamente por SIGAC.
  Contiene unicamente informacion agregada: no incluye datos identificativos
  ni clinicos de ningun paciente. Pacientes registrados activos:
  ${ind.pacientes_activos}.
  <br><br>
  Los indicadores marcados como acumulado reflejan el estado total del sistema
  y no el periodo semanal. La base registra la fecha de creacion de cada cita,
  pero no la fecha en que cambia de estado, de modo que no es posible acotar
  por semana cuantas citas fueron atendidas o canceladas.
</div>

</body>
</html>`;

return [{
  json: {
    nombre_archivo: `semana_${anio}-${String(semana).padStart(2, '0')}.pdf`,
    semana: semana,
    anio: anio
  },
  binary: {
    'index.html': await this.helpers.prepareBinaryData(
      Buffer.from(html, 'utf8'),
      'index.html',
      'text/html'
    )
  }
}];
}

wf06_compone_el_reporte.meta = {"flujo":"WF-06 Reporte semanal","nodo":"Compone el reporte","modo":"runOnceForAllItems","asincrona":true,"variables":["$()","DateTime","this.helpers"]};

module.exports = wf06_compone_el_reporte;
