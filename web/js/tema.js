// tema.js — SIGAC
// Aplica el modo de color elegido (claro, intermedio u oscuro) y lo recuerda.
// Se carga en el <head> de cada página, antes de que se dibuje, para que no
// haya un destello del modo claro al abrir la página en modo oscuro.
//
// La preferencia se guarda en localStorage: no es un dato sensible, y así
// sobrevive al cerrar la pestaña, a diferencia del token.

const TEMA = (() => {
  const CLAVE = 'sigac_tema';
  const TEMAS = ['claro', 'intermedio', 'oscuro'];

  function guardado() {
    try {
      const t = localStorage.getItem(CLAVE);
      return TEMAS.includes(t) ? t : null;
    } catch {
      return null;
    }
  }

  function delSistema() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'oscuro'
      : 'claro';
  }

  function aplicar(tema) {
    document.documentElement.setAttribute('data-tema', tema);
    document.querySelectorAll('.selector-tema button').forEach(boton => {
      boton.setAttribute('aria-pressed', String(boton.dataset.tema === tema));
    });
  }

  function elegir(tema) {
    if (!TEMAS.includes(tema)) {
      return;
    }
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      // Si el navegador no permite guardar, el modo se aplica igual.
    }
    aplicar(tema);
  }

  // Antes de dibujar: el modo guardado o, la primera vez, el del sistema.
  aplicar(guardado() || delSistema());

  // Cuando la página termina de cargar: conecta los botones del selector.
  document.addEventListener('DOMContentLoaded', () => {
    aplicar(document.documentElement.getAttribute('data-tema'));
    document.querySelectorAll('.selector-tema button').forEach(boton => {
      boton.addEventListener('click', () => elegir(boton.dataset.tema));
    });
  });

  return { elegir };
})();
