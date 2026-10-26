// sesion.js — SIGAC
// Guarda el token y los datos de la persona mientras la pestaña esté abierta,
// decide a qué pantalla va cada rol y cierra la sesión.
//
// El token vive en sessionStorage: se borra al cerrar la pestaña y nunca se
// escribe en disco ni en el código.

const SESION = (() => {
  const CLAVE_TOKEN = 'sigac_token';
  const CLAVE_PERSONA = 'sigac_persona';

  const INICIO_POR_ROL = {
    medico: '/medico/agenda.html',
    recepcion: '/recepcion/panel.html',
    admin: '/admin/personas.html'
  };

  function guardar(token, persona) {
    sessionStorage.setItem(CLAVE_TOKEN, token);
    sessionStorage.setItem(CLAVE_PERSONA, JSON.stringify(persona));
  }

  function token() {
    return sessionStorage.getItem(CLAVE_TOKEN);
  }

  function persona() {
    try {
      return JSON.parse(sessionStorage.getItem(CLAVE_PERSONA));
    } catch {
      return null;
    }
  }

  function cerrar() {
    sessionStorage.removeItem(CLAVE_TOKEN);
    sessionStorage.removeItem(CLAVE_PERSONA);
    window.location.replace('/index.html');
  }

  function inicioDe(rol) {
    return INICIO_POR_ROL[rol] || '/index.html';
  }

  // Cada pantalla la llama al cargar. Si no hay sesión, vuelve al inicio;
  // si la persona tiene otro rol, la manda a su propia pantalla.
  function exigirRol(rol) {
    const p = persona();
    if (!token() || !p) {
      cerrar();
      return null;
    }
    if (p.rol !== rol) {
      window.location.replace(inicioDe(p.rol));
      return null;
    }
    return p;
  }

  return { guardar, token, persona, cerrar, inicioDe, exigirRol };
})();
