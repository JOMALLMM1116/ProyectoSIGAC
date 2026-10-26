// pagina.js — SIGAC
// Lo común de las pantallas de trabajo: exige el rol, pinta a la persona
// en el encabezado, conecta Cerrar sesión y ofrece utilidades compartidas,
// incluidos los íconos de /img/iconos.svg.
//
// Todo el texto que viene del servidor se escribe con textContent, nunca
// con innerHTML: así un nombre con caracteres raros nunca se interpreta
// como código.

const PAGINA = (() => {

  const SVG = 'http://www.w3.org/2000/svg';

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

  const ICONO_MENSAJE = {
    exito: 'check_circle',
    error: 'warning',
    aviso: 'warning'
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

  // Crea un ícono de /img/iconos.svg. Es decorativo: el texto del botón
  // o del título ya dice lo mismo, así que se oculta a los lectores de pantalla.
  function icono(nombre, clase) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'icono' + (clase ? ' ' + clase : ''));
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const uso = document.createElementNS(SVG, 'use');
    uso.setAttribute('href', '/img/iconos.svg#i-' + nombre);
    svg.appendChild(uso);
    return svg;
  }

  // Crea un botón con ícono y texto
  function boton(texto, clase, nombreIcono) {
    const b = crear('button', clase);
    b.type = 'button';
    if (nombreIcono) {
      b.appendChild(icono(nombreIcono));
    }
    b.appendChild(document.createTextNode(texto));
    return b;
  }

  function estado(valor) {
    return crear('span', 'estado estado-' + valor, NOMBRES_ESTADO[valor] || valor);
  }

  function mostrarMensaje(elemento, tipo, texto) {
    elemento.className = 'mensaje mensaje-' + tipo;
    elemento.replaceChildren(
      icono(ICONO_MENSAJE[tipo] || 'warning'),
      document.createTextNode(' ' + texto)
    );
  }

  function ocultarMensaje(elemento) {
    elemento.className = 'mensaje oculto';
    elemento.replaceChildren();
  }

  // Texto legible de una respuesta de rechazo de n8n
  function textoError(respuesta) {
    if (respuesta.errores && respuesta.errores.length) {
      return respuesta.mensaje + ': ' + respuesta.errores.join('; ');
    }
    return respuesta.mensaje || 'Ocurrió un error inesperado';
  }

  return { iniciar, hoy, crear, icono, boton, estado, mostrarMensaje, ocultarMensaje, textoError };
})();
