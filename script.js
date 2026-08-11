/**
 * =========================================================
 * RULETA SAMCOR — Frontend
 * v3 · El premio lo decide el servidor. Este archivo solo
 *      dibuja la rueda, valida el formulario y anima.
 * =========================================================
 */
(function () {
  'use strict';

  // -------------------------------------------------------
  // CONFIGURACIÓN
  // -------------------------------------------------------
  var WEBHOOK = 'https://script.google.com/macros/s/AKfycbyFR-EZojLmuA2LKe7tii22kR_RN9qlw5M1rjfFZeJza9xXGrghf9rT-c8Tg1R0q_SNsw/exec';

  // Debe coincidir con TOKEN_RULETA en las propiedades del Apps Script.
  var TOKEN = 'sam_r7Kq92xL';

  var DURACION_GIRO_MS = 6000;   // igual que la transición de #rueda-svg en el CSS
  var RETRASO_APARICION = 2500;

  /**
   * Solo se usa para DIBUJAR la rueda. El orden debe ser idéntico
   * al CATALOGO del Code.gs: el servidor devuelve un índice y la
   * flecha se detiene en esa posición.
   */
  var CATALOGO = [
    { linea1: '5% Dcto',       linea2: 'Toda la tienda', color: '#FF1493' },
    { linea1: 'Sigue',         linea2: 'Intentando',     color: '#2a2a2a' },
    { linea1: '10% Dcto',      linea2: 'Toda la tienda', color: '#FF4500' },
    { linea1: 'Kit Renovador', linea2: '+ Silicona',     color: '#32CD32' },
    { linea1: '15% Dcto',      linea2: 'Toda la tienda', color: '#FFD700' },
    { linea1: 'Set Tuercas',   linea2: 'Seguridad',      color: '#00BFFF' },
    { linea1: 'Casi...',       linea2: 'Sigue así',      color: '#333333' },
    { linea1: '20% Dcto',      linea2: 'Toda la tienda', color: '#8A2BE2' },
    { linea1: 'Kit Renovador', linea2: '+ Visera',       color: '#FF8C00' },
    { linea1: 'Sin',           linea2: 'Premio',         color: '#111111' }
  ];

  // -------------------------------------------------------
  // ARRANQUE
  // -------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

  function iniciar() {
    var popup = document.getElementById('ruleta-popup');
    if (!popup) return;   // el HTML no está en esta página: no hacemos nada

    document.body.appendChild(popup);

    var el = {
      popup: popup,
      cerrar: document.getElementById('cerrar-ruleta'),
      girar: document.getElementById('btn-girar'),
      svgCont: document.getElementById('rueda-svg-container'),
      rut: document.getElementById('rut-usuario'),
      celular: document.getElementById('celular-usuario'),
      correo: document.getElementById('correo-usuario'),
      acepta: document.getElementById('acepta-terminos'),
      trampa: document.getElementById('empresa-usuario'),
      mensaje: document.getElementById('mensaje-premio'),
      formulario: document.getElementById('bloque-formulario'),
      rueda: document.querySelector('.rueda-contenedor')
    };

    dibujarRueda(el.svgCont);
    var svg = document.getElementById('rueda-svg');

    var girando = false;
    var textoBoton = el.girar.textContent;

    // --- Aparición ---
    if (!localStorage.getItem('samcor_ruleta_completada') &&
        !sessionStorage.getItem('samcor_ruleta_cerrada')) {
      setTimeout(abrir, RETRASO_APARICION);
    }

    function abrir() {
      el.popup.classList.add('visible');
      document.body.classList.add('ruleta-abierta');
      if (el.rut) el.rut.focus();
    }

    function cerrar() {
      if (girando) return;   // no dejamos cerrar en medio del giro
      el.popup.classList.remove('visible');
      document.body.classList.remove('ruleta-abierta');
      sessionStorage.setItem('samcor_ruleta_cerrada', 'true');
    }

    el.cerrar.addEventListener('click', cerrar);

    // Cerrar con Escape o tocando el fondo: salidas de emergencia
    // para cuando la caja no cabe en pantallas muy bajas.
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && el.popup.classList.contains('visible')) cerrar();
    });
    el.popup.addEventListener('click', function (ev) {
      if (ev.target === el.popup) cerrar();
    });

    // --- Formato del RUT (solo al salir del campo, para no pelear
    //     con el cursor mientras la persona escribe) ---
    el.rut.addEventListener('blur', function () {
      var v = el.rut.value.replace(/[^0-9kK]/g, '');
      if (v.length > 1) el.rut.value = v.slice(0, -1) + '-' + v.slice(-1).toLowerCase();
    });

    [el.rut, el.celular, el.correo].forEach(function (campo) {
      campo.addEventListener('input', function () { limpiarError(campo); });
    });

    // --- Giro ---
    el.girar.addEventListener('click', function () {
      if (girando) return;

      var rut = normalizarRut(el.rut.value);
      var celular = el.celular.value.trim();
      var correo = el.correo.value.trim().toLowerCase();
      var valido = true;

      limpiarTodo();

      if (!validarRut(rut)) { marcarError(el.rut, 'Revisa el RUT: debe ir con guion, como 12345678-9.'); valido = false; }
      if (!normalizarCelular(celular)) { marcarError(el.celular, 'Escribe un celular chileno de 9 dígitos.'); valido = false; }
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(correo)) { marcarError(el.correo, 'Revisa el correo.'); valido = false; }
      if (!el.acepta.checked) { marcarError(el.acepta, 'Necesitamos tu autorización para continuar.'); valido = false; }

      if (!valido) return;

      girando = true;
      bloquearFormulario(true);
      el.girar.textContent = 'Preparando tu giro...';

      fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          token: TOKEN,
          rut: rut,
          celular: celular,
          correo: correo,
          acepta: true,
          empresa: el.trampa ? el.trampa.value : ''
        })
      })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(procesarRespuesta)
        .catch(function () {
          fallar('No pudimos conectar. Revisa tu conexión e inténtalo otra vez.');
        });
    });

    function procesarRespuesta(data) {
      if (!data || data.estado !== 'exito') {
        var mensajes = {
          duplicado: data && data.mensaje ? data.mensaje : 'Este RUT ya participó en la ruleta.',
          invalido: data && data.mensaje ? data.mensaje : 'Revisa los datos ingresados.',
          rechazado: 'No pudimos validar la solicitud. Recarga la página e inténtalo de nuevo.'
        };
        var texto = mensajes[data && data.estado] || 'No pudimos registrar tu participación. Inténtalo en unos minutos.';

        // Un duplicado no se reintenta: el formulario queda cerrado.
        fallar(texto, data && data.estado === 'duplicado');
        return;
      }

      // Guardamos el bloqueo SOLO cuando el servidor confirmó.
      try {
        localStorage.setItem('samcor_ruleta_completada', 'true');
      } catch (e) { /* modo incógnito */ }

      el.formulario.classList.add('oculto');
      el.rueda.classList.add('modo-giro');

      var indice = (typeof data.indice === 'number' && data.indice >= 0 && data.indice < CATALOGO.length)
        ? data.indice : 0;

      girar(indice, function () { mostrarPremio(data); });
      medirConversion(data);
    }

    function girar(indice, alTerminar) {
      var porSegmento = 360 / CATALOGO.length;
      var base = 360 - (indice * porSegmento);
      var margen = porSegmento - 6;
      var desvio = (Math.random() * margen) - (margen / 2);

      // Pequeño respiro para que la rueda alcance a subir antes de girar.
      setTimeout(function () {
        svg.style.transform = 'rotate(' + (2880 + base + desvio) + 'deg)';
      }, 150);

      var terminado = false;
      function fin() {
        if (terminado) return;
        terminado = true;
        girando = false;
        alTerminar();
      }

      svg.addEventListener('transitionend', fin, { once: true });
      setTimeout(fin, DURACION_GIRO_MS + 900);   // red de seguridad
    }

    function mostrarPremio(data) {
      var texto = data.premio && data.premio.texto ? data.premio.texto : 'tu premio';

      vaciar(el.mensaje);
      el.mensaje.appendChild(document.createTextNode('¡Ganaste ' + texto + '!'));

      if (data.cupon && data.cupon !== 'PENDIENTE') {
        var codigo = document.createElement('span');
        codigo.className = 'codigo-cupon';
        codigo.textContent = data.cupon;
        el.mensaje.appendChild(codigo);

        var detalle = document.createElement('span');
        detalle.style.cssText = 'display:block;margin-top:10px;font-size:0.85rem;font-weight:400;';
        detalle.textContent = 'Úsalo en el carrito antes del ' + data.vence + '. Te lo enviamos también por correo.';
        el.mensaje.appendChild(detalle);
      } else {
        var nota = document.createElement('span');
        nota.style.cssText = 'display:block;margin-top:10px;font-size:0.85rem;font-weight:400;';
        nota.textContent = data.correo_enviado
          ? 'Te enviamos los detalles por correo.'
          : 'Te contactaremos para coordinar la entrega.';
        el.mensaje.appendChild(nota);
      }

      el.mensaje.classList.remove('mensaje-oculto', 'mensaje-aviso');
      el.mensaje.classList.add('mensaje-visible');
    }

    function fallar(texto, definitivo) {
      girando = false;
      vaciar(el.mensaje);
      el.mensaje.textContent = texto;
      el.mensaje.classList.remove('mensaje-oculto');
      el.mensaje.classList.add('mensaje-visible', 'mensaje-aviso');

      if (definitivo) {
        el.formulario.classList.add('oculto');
        try { localStorage.setItem('samcor_ruleta_completada', 'true'); } catch (e) {}
      } else {
        bloquearFormulario(false);
        el.girar.textContent = textoBoton;
      }
    }

    function bloquearFormulario(estado) {
      el.girar.disabled = estado;
      el.rut.disabled = estado;
      el.celular.disabled = estado;
      el.correo.disabled = estado;
      el.acepta.disabled = estado;
    }

    function marcarError(campo, texto) {
      campo.classList.add('con-error');
      var aviso = document.getElementById('error-' + campo.id);
      if (aviso) {
        aviso.textContent = texto;
        aviso.classList.add('visible');
      }
    }

    function limpiarError(campo) {
      campo.classList.remove('con-error');
      var aviso = document.getElementById('error-' + campo.id);
      if (aviso) aviso.classList.remove('visible');
    }

    function limpiarTodo() {
      [el.rut, el.celular, el.correo, el.acepta].forEach(limpiarError);
      el.mensaje.classList.add('mensaje-oculto');
      el.mensaje.classList.remove('mensaje-visible', 'mensaje-aviso');
    }

    function vaciar(nodo) {
      while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
    }

    function medirConversion(data) {
      try {
        if (typeof gtag === 'function') {
          gtag('event', 'generate_lead', {
            event_category: 'ruleta',
            event_label: data.premio ? data.premio.valor : '',
            value: 1
          });
        }
        if (typeof fbq === 'function') fbq('track', 'Lead');
      } catch (e) { /* sin analítica, seguimos igual */ }
    }
  }

  // -------------------------------------------------------
  // VALIDACIÓN
  // -------------------------------------------------------
  function normalizarRut(valor) {
    return (valor || '').replace(/\./g, '').replace(/\s/g, '')
      .replace(/[‐–—]/g, '-').toLowerCase().trim();
  }

  function validarRut(rut) {
    if (!/^\d{7,8}-[0-9k]$/.test(rut)) return false;
    var partes = rut.split('-');
    var m = 0, s = 1;
    for (var n = parseInt(partes[0], 10); n; n = Math.floor(n / 10)) {
      s = (s + (n % 10) * (9 - (m++ % 6))) % 11;
    }
    return (s ? String(s - 1) : 'k') === partes[1];
  }

  function normalizarCelular(valor) {
    var d = (valor || '').replace(/\D/g, '');
    if (d.indexOf('56') === 0) d = d.slice(2);
    if (d.length === 9 && d.charAt(0) === '9') return '+56' + d;
    if (d.length === 8) return '+569' + d;
    return '';
  }

  // -------------------------------------------------------
  // DIBUJO DE LA RUEDA
  // -------------------------------------------------------
  function dibujarRueda(contenedor) {
    var c = 500;
    var svg = '<svg id="rueda-svg" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="metal-gold" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#FFF8B0"/><stop offset="25%" stop-color="#F1C40F"/>' +
      '<stop offset="50%" stop-color="#B8860B"/><stop offset="75%" stop-color="#F1C40F"/>' +
      '<stop offset="100%" stop-color="#FFF8B0"/></linearGradient>' +
      '<filter id="neon-glow"><feGaussianBlur stdDeviation="4" result="b"/>' +
      '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="texto-sombra"><feDropShadow dx="1" dy="2" stdDeviation="1" flood-color="#000" flood-opacity="0.8"/></filter>' +
      '</defs>';

    svg += '<circle cx="' + c + '" cy="' + c + '" r="480" fill="#1a1a1a"/>' +
           '<circle cx="' + c + '" cy="' + c + '" r="480" fill="none" stroke="url(#metal-gold)" stroke-width="20"/>' +
           '<circle cx="' + c + '" cy="' + c + '" r="425" fill="none" stroke="url(#metal-gold)" stroke-width="12"/>';

    // Las 24 luces van dentro de UN grupo con un solo filtro.
    // Antes cada una tenía el suyo: 24 desenfoques por cuadro,
    // que es lo que hacía tiritar la animación en celulares.
    svg += '<g filter="url(#neon-glow)">';
    for (var j = 0; j < 24; j++) {
      var a = (j * 15) * Math.PI / 180;
      svg += '<circle cx="' + (c + 452 * Math.cos(a)) + '" cy="' + (c + 452 * Math.sin(a)) +
             '" r="9" fill="' + (j % 2 === 0 ? '#FFFFFF' : '#FFD700') + '"/>';
    }
    svg += '</g>';

    var radio = 419;
    var porSeg = 360 / CATALOGO.length;
    var desfase = -90 - (porSeg / 2);

    CATALOGO.forEach(function (p, i) {
      var ini = i * porSeg + desfase;
      var fin = (i + 1) * porSeg + desfase;
      var r1 = ini * Math.PI / 180;
      var r2 = fin * Math.PI / 180;

      svg += '<path d="M ' + c + ' ' + c +
             ' L ' + (c + radio * Math.cos(r1)) + ' ' + (c + radio * Math.sin(r1)) +
             ' A ' + radio + ' ' + radio + ' 0 0 1 ' +
             (c + radio * Math.cos(r2)) + ' ' + (c + radio * Math.sin(r2)) +
             ' Z" fill="' + p.color + '" stroke="#fff" stroke-width="2"/>';

      var medio = ini + porSeg / 2;
      var rm = medio * Math.PI / 180;
      var tx = c + 300 * Math.cos(rm);
      var ty = c + 300 * Math.sin(rm);

      // 26px en vez de 20: a 320px de ancho, el texto anterior era ilegible.
      svg += '<text x="' + tx + '" y="' + ty + '" font-family="Inter, sans-serif" font-weight="900" ' +
             'font-size="26" fill="#fff" text-anchor="middle" filter="url(#texto-sombra)" ' +
             'transform="rotate(' + (medio + 90) + ', ' + tx + ', ' + ty + ')">' +
             '<tspan x="' + tx + '" dy="-12">' + p.linea1 + '</tspan>' +
             '<tspan x="' + tx + '" dy="30">' + p.linea2 + '</tspan></text>';
    });

    svg += '<circle cx="' + c + '" cy="' + c + '" r="90" fill="#111" stroke="url(#metal-gold)" stroke-width="15"/>' +
           '<circle cx="' + c + '" cy="' + c + '" r="70" fill="url(#metal-gold)"/>' +
           '<text x="' + c + '" y="' + (c + 8) + '" font-family="Inter, sans-serif" font-weight="900" ' +
           'font-size="24" fill="#111" text-anchor="middle">SAMCOR</text></svg>';

    contenedor.innerHTML = svg;
  }
})();
