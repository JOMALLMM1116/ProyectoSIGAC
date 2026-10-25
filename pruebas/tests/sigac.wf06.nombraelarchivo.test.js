// sigac.wf06.nombraelarchivo.test.js
//
// pruebas unitarias del nodo Nombra el archivo de WF-06. Gotenberg
// devuelve el PDF sin un nombre util; este nodo le pone el mismo nombre
// con que se guarda en disco, para que el correo lo adjunte con ese
// nombre y no con un identificador aleatorio.
//
// el nodo modifica el binario del item que recibe, asi que la entrada
// se arma a mano, con su propiedad binary.data.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-NOM06-NN

'use strict';

const nombraArchivo = require('../nodos/wf06_nombra_el_archivo.js');
const { nodosAnteriores } = require('../simulacion.js');
const { DateTime } = require('luxon');

// el item que entrega Gotenberg: el pdf en binary.data, sin nombre util
const pdf = () => ({
  json: {},
  binary: { data: { data: 'JVBERi0x', fileName: 'a1b2c3', fileExtension: 'bin', mimeType: 'application/octet-stream' } }
});

function nombrar(item, nombre = 'semana_2026-43.pdf') {
  const $ = nodosAnteriores({ 'Compone el reporte': { nombre_archivo: nombre } });
  const entrada = { first: () => item, all: () => [item] };
  return { salida: nombraArchivo.call({}, entrada, $, item.json, {}, DateTime), $ };
}

describe('WF-06 · Nombra el archivo', () => {
  test('UT-NOM06-01 · el archivo toma el nombre de Compone el reporte', () => {
    expect(nombrar(pdf()).salida[0].binary.data.fileName).toBe('semana_2026-43.pdf');
  });

  test('UT-NOM06-02 · la extension queda como pdf', () => {
    expect(nombrar(pdf()).salida[0].binary.data.fileExtension).toBe('pdf');
  });

  test('UT-NOM06-03 · el tipo queda como application/pdf', () => {
    expect(nombrar(pdf()).salida[0].binary.data.mimeType).toBe('application/pdf');
  });

  test('UT-NOM06-04 · el contenido del pdf no se toca', () => {
    expect(nombrar(pdf()).salida[0].binary.data.data).toBe('JVBERi0x');
  });

  test('UT-NOM06-05 · otro nombre de semana se aplica igual', () => {
    expect(nombrar(pdf(), 'semana_2026-01.pdf').salida[0].binary.data.fileName).toBe('semana_2026-01.pdf');
  });

  test('UT-NOM06-06 · devuelve el mismo item que recibio', () => {
    const item = pdf();
    expect(nombrar(item).salida[0]).toBe(item);
  });

  test('UT-NOM06-07 · consulta Compone el reporte (verify)', () => {
    expect(nombrar(pdf()).$).toHaveBeenCalledWith('Compone el reporte');
  });

  test('UT-NOM06-08 · sin binario en la entrada: lanza un error', () => {
    expect(() => nombrar({ json: {} })).toThrow();
  });

  test('UT-NOM06-09 · devuelve una lista con un solo item', () => {
    expect(nombrar(pdf()).salida).toHaveLength(1);
  });
});
