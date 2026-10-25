// sigac.wf06.componeelreporte.test.js
//
// pruebas unitarias del nodo Compone el reporte de WF-06. arma el HTML
// del reporte semanal con los indicadores y la carga por medico, y lo
// entrega como binario a Gotenberg para convertirlo en PDF.
//
// es el unico nodo asincrono del sistema: usa await con
// this.helpers.prepareBinaryData, propio de n8n, que aqui se simula con
// jest.fn. la semana se numera con la norma ISO (defecto 12.16), asi que
// el reloj se fija en fechas conocidas.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-REP06-NN

'use strict';

const componeReporte = require('../nodos/wf06_compone_el_reporte.js');
const { ejecutar } = require('../simulacion.js');

const INDICADORES = {
  sol_semana: 41, citas_semana: 37, errores_alta: 2, errores_media: 1, errores_baja: 0,
  citas_confirmadas: 120, citas_atendidas: 80, citas_canceladas: 9, citas_ausentes: 4,
  sol_pendientes: 3, sol_asignadas: 200, sol_en_espera: 12, sol_rechazadas: 0,
  espera_pendientes: 12, espera_atendidas: 5, pacientes_activos: 73
};

const MEDICOS = [
  { nombre: 'Ana Lucia Morales Chub', especialidad: 'Medicina General', atendidas: 30, confirmadas: 40, ausentes: 1 },
  { nombre: 'Carlos Enrique Coc Ical', especialidad: 'Pediatria', atendidas: 20, confirmadas: 25, ausentes: 2 }
];

// simula this.helpers.prepareBinaryData: guarda lo que recibe
function contextoN8n() {
  const prepareBinaryData = jest.fn(async (buffer, nombre, tipo) => ({
    data: buffer.toString('base64'), fileName: nombre, mimeType: tipo
  }));
  return { helpers: { prepareBinaryData } };
}

// ejecuta el nodo en una fecha dada y devuelve la salida, el html y el mock
async function componer(fechaIso, medicos = MEDICOS, indicadores = INDICADORES) {
  jest.setSystemTime(new Date(fechaIso));
  const contexto = contextoN8n();
  const { salida, $ } = ejecutar(componeReporte, {
    anteriores: { 'Reune indicadores': indicadores, 'Carga por medico': medicos },
    contexto
  });
  const resultado = await salida;
  const html = Buffer.from(resultado[0].binary['index.html'].data, 'base64').toString('utf8');
  return { resultado, html, $, prepare: contexto.helpers.prepareBinaryData };
}

beforeAll(() => jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }));
afterAll(() => jest.useRealTimers());

// 23 de octubre de 2026, mediodia en Guatemala: semana ISO 43
const VIERNES_43 = '2026-10-23T18:00:00Z';

// ------------------------------------------------------------
// A. Semana ISO y nombre del archivo (defecto 12.16)
// ------------------------------------------------------------
describe('WF-06 · Compone el reporte · A. Semana ISO', () => {
  test('UT-REP06-01 · 23/10/2026: semana 43 de 2026', async () => {
    const { resultado } = await componer(VIERNES_43);
    expect(resultado[0].json).toEqual({ nombre_archivo: 'semana_2026-43.pdf', semana: 43, anio: 2026 });
  });

  test('UT-REP06-02 · 01/01/2026 (jueves): semana 1, con el numero en dos digitos', async () => {
    const { resultado } = await componer('2026-01-01T18:00:00Z');
    expect(resultado[0].json.nombre_archivo).toBe('semana_2026-01.pdf');
  });

  test('UT-REP06-03 · 01/01/2027 (viernes): pertenece a la semana 53 de 2026', async () => {
    const { resultado } = await componer('2027-01-01T18:00:00Z');
    expect(resultado[0].json).toEqual({ nombre_archivo: 'semana_2026-53.pdf', semana: 53, anio: 2026 });
  });

  test('UT-REP06-04 · 29/12/2025 (lunes): pertenece a la semana 1 de 2026', async () => {
    const { resultado } = await componer('2025-12-29T18:00:00Z');
    expect(resultado[0].json.nombre_archivo).toBe('semana_2026-01.pdf');
  });

  test('UT-REP06-05 · la fecha se toma en hora de Guatemala, no en UTC', async () => {
    // 24/10 a las 03:00 UTC son las 21:00 del 23/10 en Guatemala
    const { html } = await componer('2026-10-24T03:00:00Z');
    expect(html).toContain('Generado el 23/10/2026');
  });
});

// ------------------------------------------------------------
// B. Contenido del HTML
// ------------------------------------------------------------
describe('WF-06 · Compone el reporte · B. Contenido', () => {
  test('UT-REP06-06 · el encabezado muestra la semana, el anio y la fecha', async () => {
    const { html } = await componer(VIERNES_43);
    expect(html).toContain('Semana 43 del 2026');
    expect(html).toContain('Generado el 23/10/2026');
  });

  test('UT-REP06-07 · incluye cada indicador con su valor', async () => {
    const { html } = await componer(VIERNES_43);
    // los indicadores de las tablas, cada uno en su celda
    const { pacientes_activos, ...deTablas } = INDICADORES;
    for (const valor of Object.values(deTablas)) {
      expect(html).toContain(`<td class="n">${valor}</td>`);
    }
    expect(html).toContain('Solicitudes recibidas</td><td class="n">41');
    // los pacientes activos van en el pie, como texto
    expect(html).toContain(`${pacientes_activos}.`);
  });

  test('UT-REP06-08 · una fila por medico, con sus cinco columnas', async () => {
    const { html } = await componer(VIERNES_43);
    expect(html).toContain('<td>Ana Lucia Morales Chub</td>');
    expect(html).toContain('<td>Pediatria</td>');
    expect((html.match(/<td class="n">30<\/td>/g) || []).length).toBe(1);
  });

  test('UT-REP06-09 · sin medicos: la tabla queda sin filas, sin error', async () => {
    const { html } = await componer(VIERNES_43, []);
    expect(html).not.toContain('Ana Lucia');
    expect(html).toContain('Carga por medico');
  });

  test('UT-REP06-10 · el pie declara que los acumulados no son semanales', async () => {
    const { html } = await componer(VIERNES_43);
    expect(html).toContain('no es posible acotar');
  });

  test('UT-REP06-11 · no incluye datos de pacientes, aunque llegaran en la entrada', async () => {
    const conPaciente = [{ ...MEDICOS[0], dpi: '1234567890123', correo: 'ana@correo.com' }];
    const { html } = await componer(VIERNES_43, conPaciente);
    expect(html).not.toContain('1234567890123');
    expect(html).not.toContain('ana@correo.com');
  });

  test('UT-REP06-12 · es un documento HTML completo en espanol', async () => {
    const { html } = await componer(VIERNES_43);
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<html lang="es">');
    expect(html.trim().endsWith('</html>')).toBe(true);
  });
});

// ------------------------------------------------------------
// C. Binario para Gotenberg
// ------------------------------------------------------------
describe('WF-06 · Compone el reporte · C. Binario', () => {
  test('UT-REP06-13 · llama a prepareBinaryData una vez, como index.html de tipo text/html', async () => {
    const { prepare } = await componer(VIERNES_43);
    expect(prepare).toHaveBeenCalledTimes(1);
    const [buffer, nombre, tipo] = prepare.mock.calls[0];
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(nombre).toBe('index.html');
    expect(tipo).toBe('text/html');
  });

  test('UT-REP06-14 · el binario se entrega en la propiedad index.html', async () => {
    const { resultado } = await componer(VIERNES_43);
    expect(Object.keys(resultado[0].binary)).toEqual(['index.html']);
  });

  test('UT-REP06-15 · el HTML viaja en UTF-8: la raya del titulo no se pierde', async () => {
    const { html } = await componer(VIERNES_43);
    expect(html).toContain('SIGAC — Reporte semanal');
  });

  test('UT-REP06-16 · consulta Reune indicadores y Carga por medico (verify)', async () => {
    const { $ } = await componer(VIERNES_43);
    expect($).toHaveBeenCalledWith('Reune indicadores');
    expect($).toHaveBeenCalledWith('Carga por medico');
  });

  test('UT-REP06-17 · es asincrono: devuelve una promesa', () => {
    jest.setSystemTime(new Date(VIERNES_43));
    const { salida } = ejecutar(componeReporte, {
      anteriores: { 'Reune indicadores': INDICADORES, 'Carga por medico': MEDICOS },
      contexto: contextoN8n()
    });
    expect(salida).toBeInstanceOf(Promise);
    return salida;
  });

  test('UT-REP06-18 · devuelve un solo item', async () => {
    const { resultado } = await componer(VIERNES_43);
    expect(resultado).toHaveLength(1);
  });
});
