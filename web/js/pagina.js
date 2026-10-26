// pagina.js — SIGAC
// Lo común de las pantallas de trabajo: exige el rol, pinta a la persona
// en el encabezado, conecta Cerrar sesión y ofrece utilidades compartidas.
//
// Todo el texto que viene del servidor se escribe con textContent, nunca
// con innerHTML: así un nombre con caracteres raros nunca se interpreta
// como código.

const PAGINA = (() => {

  const NOMBRES_ESTADO = {
    confirmada: 'Confirmada',
    atendida: 'Atendida',
    ausente: 'Ausente',
    cancelada: 'Cancelada',
    activo: 'Activo',
    inactivo: 'Inactivo',
    baja: 'Baja',
    vencida: 'Fecha pasada'
  };

  function iniciar(rol) {
    const persona = SESION.exigirRol(rol);
    if (!persona) {
      return null;
    }
    document.getElementById('nombre-persona').textContent = persona.nombre;
    const detalle = document.getElementById('detalle-persona');
    if (detalle) {
      detalle.textContent = persona.especialidad || '';
    }
    document.getElementById('boton-salir').addEventListener('click', () => SESION.cerrar());
    return persona;
  }

  // Fecha de hoy en Guatemala, en formato AAAA-MM-DD
  function hoy() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala' }).format(new Date());
  }

  // Crea un elemento con clase y texto, siempre con textContent
  function crear(etiqueta, clase, texto) {
    const el = document.createElement(etiqueta);
    if (clase) {
      el.className = clase;
    }
    if (texto !== undefined && texto !== null) {
      el.textContent = String(texto);
    }
    return el;
  }

  function estado(valor) {
    return crear('span', 'estado estado-' + valor, NOMBRES_ESTADO[valor] || valor);
  }

  function mostrarMensaje(elemento, tipo, texto) {
    elemento.className = 'mensaje mensaje-' + tipo;
    elemento.textContent = texto;
  }

  function ocultarMensaje(elemento) {
    elemento.className = 'mensaje oculto';
    elemento.textContent = '';
  }

  // Texto legible de una respuesta de rechazo de n8n
  function textoError(respuesta) {
    if (respuesta.errores && respuesta.errores.length) {
      return respuesta.mensaje + ': ' + respuesta.errores.join('; ');
    }
    return respuesta.mensaje || 'Ocurrió un error inesperado';
  }

  return { iniciar, hoy, crear, estado, mostrarMensaje, ocultarMensaje, textoError };
})();

