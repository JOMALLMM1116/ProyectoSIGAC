// login.js — SIGAC
// Pantalla de inicio: verifica el token con la consulta «sesion» de WF-10
// y envía a cada persona a la pantalla de su rol.
//
// Cuando el inicio falla, la sesión se cierra y la página se recarga.
// Para que el mensaje sobreviva a la recarga, se deja un aviso en
// sessionStorage que se muestra al volver y se borra enseguida.

(() => {
  const CLAVE_AVISO = 'sigac_aviso_inicio';

  const formulario = document.getElementById('formulario-inicio');
  const campoToken = document.getElementById('token');
  const botonEntrar = document.getElementById('boton-entrar');
  const mensaje = document.getElementById('mensaje');

  function mostrar(texto) {
    mensaje.textContent = texto;
    mensaje.classList.remove('oculto');
  }

  function fallar(texto) {
    sessionStorage.setItem(CLAVE_AVISO, texto);
    SESION.cerrar();
  }

  // Si ya hay una sesión abierta, directo a la pantalla del rol.
  const persona = SESION.persona();
  if (SESION.token() && persona && persona.rol) {
    window.location.replace(SESION.inicioDe(persona.rol));
    return;
  }

  // Si se vuelve de un intento fallido, se muestra el motivo.
  const aviso = sessionStorage.getItem(CLAVE_AVISO);
  if (aviso) {
    sessionStorage.removeItem(CLAVE_AVISO);
    mostrar(aviso);
  }

  campoToken.focus();

  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();

    const token = campoToken.value.trim();
    if (!token) {
      mostrar('Escribe tu token de acceso.');
      campoToken.focus();
      return;
    }

    botonEntrar.disabled = true;
    botonEntrar.textContent = 'Verificando…';

    SESION.guardar(token, null);
    const respuesta = await API.llamar('consulta', { consulta: 'sesion' });

    if (respuesta.codigo === 200 && respuesta.rol) {
      SESION.guardar(token, {
        rol: respuesta.rol,
        nombre: respuesta.nombre,
        especialidad: respuesta.especialidad || null
      });
      campoToken.value = '';
      window.location.replace(SESION.inicioDe(respuesta.rol));
      return;
    }

    if (respuesta.codigo === 401) {
      fallar('El token no es válido o está desactivado.');
    } else if (respuesta.codigo === 0) {
      fallar('No se pudo conectar con el servidor. Revisa que SIGAC esté en ejecución.');
    } else {
      fallar('No se pudo iniciar sesión (código ' + respuesta.codigo + '). Intenta de nuevo.');
    }
  });
})();

