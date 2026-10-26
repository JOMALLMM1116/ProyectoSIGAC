// api.js — SIGAC
// Única función que llama a n8n. Todas las pantallas pasan por aquí,
// de modo que el token, los errores y la falta de conexión se manejan
// en un solo lugar.
//
// Requiere que sesion.js se haya cargado antes.

const API = (() => {

  async function llamar(ruta, cuerpo = {}) {
    const cabeceras = { 'Content-Type': 'application/json' };
    const token = SESION.token();
    if (token) {
      cabeceras['X-SIGAC-Token'] = token;
    }

    let respuesta;
    try {
      respuesta = await fetch('/api/' + ruta, {
        method: 'POST',
        headers: cabeceras,
        body: JSON.stringify(cuerpo),
        cache: 'no-store'
      });
    } catch {
      return {
        codigo: 0,
        estado: 'sin_conexion',
        mensaje: 'No se pudo conectar con el servidor'
      };
    }

    let datos;
    try {
      datos = await respuesta.json();
    } catch {
      datos = {
        codigo: respuesta.status,
        estado: 'error',
        mensaje: 'El servidor no devolvió una respuesta válida'
      };
    }

    // Un 401 con sesión abierta significa que el token dejó de valer
    // (desactivado o dado de baja): se cierra la sesión.
    if (respuesta.status === 401 && token) {
      SESION.cerrar();
    }

    return datos;
  }

  return { llamar };
})();
