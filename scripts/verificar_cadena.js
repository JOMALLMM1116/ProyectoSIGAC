// ============================================================
// SIGAC - Verificador de la bitacora de auditoria
// Analisis de Sistemas II
// Jose Manuel Maquin Leal - 4090-22-3506
// ============================================================
// Comprueba dos cosas en cada registro:
//   1. Enlace: el hash_anterior coincide con el hash_actual del
//      registro previo.
//   2. Contenido: el hash_actual corresponde realmente a los
//      datos que la fila tiene hoy.
//
// La segunda es la que detecta una alteracion: aunque alguien
// recalcule los enlaces, el hash deja de corresponder al dato.
//
// Uso:  node scripts/verificar_cadena.js
// ============================================================

const crypto = require('crypto');

const CEROS = '0'.repeat(64);

function leerBitacora() {
  const datos = require('fs').readFileSync(0, 'utf-8');

  return datos.trim().split('\n').filter(Boolean).map(linea => {
    const [id, tabla, idRegistro, hashAnterior, hashActual] = linea.split('|');
    return {
      id: Number(id),
      tabla: tabla,
      idRegistro: idRegistro,
      hashAnterior: hashAnterior,
      hashActual: hashActual
    };
  });
}

function calcularHash(hashAnterior, tabla, idRegistro) {
  return crypto
    .createHash('sha256')
    .update(hashAnterior + tabla + idRegistro)
    .digest('hex');
}

function verificar(filas) {
  const problemas = [];
  let anterior = null;

  for (const fila of filas) {
    // el registro genesis no encadena contra nadie
    if (anterior === null) {
      if (fila.hashAnterior !== CEROS) {
        problemas.push({
          id: fila.id,
          tipo: 'genesis',
          detalle: 'El primer registro deberia tener hash_anterior en ceros'
        });
      }
      anterior = fila;
      continue;
    }

    if (fila.hashAnterior !== anterior.hashActual) {
      problemas.push({
        id: fila.id,
        tipo: 'enlace roto',
        detalle: `Esperaba ${anterior.hashActual.slice(0, 12)}, ` +
                 `encontro ${fila.hashAnterior.slice(0, 12)}`
      });
    }

    const esperado = calcularHash(fila.hashAnterior, fila.tabla, fila.idRegistro);
    if (esperado !== fila.hashActual) {
      problemas.push({
        id: fila.id,
        tipo: 'contenido alterado',
        detalle: `El hash no corresponde a los datos de la fila ` +
                 `(${fila.tabla}, ${fila.idRegistro})`
      });
    }

    anterior = fila;
  }

  return problemas;
}

// ---------- ejecucion ----------

console.log('');
console.log('SIGAC - Verificacion de la bitacora de auditoria');
console.log('='.repeat(55));

let filas;
try {
  filas = leerBitacora();
} catch (e) {
  console.error('No se pudo leer la base. Los contenedores deben estar arriba.');
  process.exit(2);
}

if (filas.length === 0) {
  console.error('La bitacora esta vacia.');
  process.exit(2);
}

const problemas = verificar(filas);

console.log(`Registros analizados: ${filas.length}`);
console.log(`Rango de ids: ${filas[0].id} a ${filas[filas.length - 1].id}`);
console.log('');

if (problemas.length === 0) {
  console.log('CADENA INTEGRA');
  console.log('Todos los eslabones enlazan y ningun registro fue alterado.');
  console.log('');
  process.exit(0);
}

console.log(`CADENA ROTA - ${problemas.length} problema(s) detectado(s)`);
console.log('');
for (const p of problemas) {
  console.log(`  Registro ${p.id}  [${p.tipo}]`);
  console.log(`    ${p.detalle}`);
}
console.log('');
process.exit(1);
