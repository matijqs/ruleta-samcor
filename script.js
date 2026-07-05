document.addEventListener("DOMContentLoaded", function() {
  const popup = document.getElementById("ruleta-popup");
  const btnCerrar = document.getElementById("cerrar-ruleta");
  const btnGirar = document.getElementById("btn-girar");
  const contenedorSvg = document.getElementById("rueda-svg-container");
  
  const inputRut = document.getElementById("rut-usuario");
  const inputCelular = document.getElementById("celular-usuario");
  const inputCorreo = document.getElementById("correo-usuario");
  
  const mensajePremio = document.getElementById("mensaje-premio");
  const bloqueFormulario = document.getElementById("bloque-formulario");
  const ruedaContenedor = document.querySelector(".rueda-contenedor");

  // --- NUEVO CATÁLOGO DE PREMIOS Y PROBABILIDADES ---
  // El atributo "peso" define la probabilidad. La suma de todos los pesos es 50.
  const catalogoPremios = [
    { linea1: "5% Dcto", linea2: "Toda la tienda", color: "#FF1493", valor: "dcto_5", peso: 10 },
    { linea1: "Sigue", linea2: "Intentando", color: "#2a2a2a", valor: "perder", peso: 1 },
    { linea1: "10% Dcto", linea2: "Toda la tienda", color: "#FF4500", valor: "dcto_10", peso: 4 },
    { linea1: "Kit Renovador", linea2: "+ Silicona", color: "#32CD32", valor: "kit_silicona", peso: 10 },
    { linea1: "15% Dcto", linea2: "Toda la tienda", color: "#FFD700", valor: "dcto_15", peso: 1 },
    { linea1: "Set Tuercas", linea2: "Seguridad", color: "#00BFFF", valor: "set_tuercas", peso: 10 },
    { linea1: "Casi...", linea2: "Sigue así", color: "#333333", valor: "perder", peso: 2 },
    { linea1: "25% Dcto", linea2: "Toda la tienda", color: "#8A2BE2", valor: "dcto_25", peso: 1 },
    { linea1: "Kit Renovador", linea2: "+ Visera", color: "#FF8C00", valor: "kit_visera", peso: 10 },
    { linea1: "Sin", linea2: "Premio", color: "#111111", valor: "perder", peso: 1 }
  ];

  function validarRUT(rut) {
    let valor = rut.replace(/\./g, '').replace(/\s/g, '');
    if (!/^[0-9]+[-|‐]{1}[0-9kK]{1}$/.test(valor)) return false;
    let tmp = valor.split('-');
    let digv = tmp[1].toLowerCase();
    let rutNum = tmp[0];
    let M = 0, S = 1;
    for (; rutNum; rutNum = Math.floor(rutNum / 10)) {
      S = (S + rutNum % 10 * (9 - M++ % 6)) % 11;
    }
    let dvEsperado = S ? S - 1 : 'k';
    return dvEsperado.toString() === digv;
  }

  inputRut.addEventListener('input', function(e) {
    let valor = e.target.value.replace(/[^0-9kK]/g, '');
    if (valor.length > 1) {
      valor = valor.slice(0, -1) + '-' + valor.slice(-1);
    }
    e.target.value = valor;
  });

  function generarRuedaSVG() {
    const centro = 500;
    let svgHTML = `<svg id="rueda-svg" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="metal-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF8B0" /><stop offset="25%" stop-color="#F1C40F" /><stop offset="50%" stop-color="#B8860B" /><stop offset="75%" stop-color="#F1C40F" /><stop offset="100%" stop-color="#FFF8B0" />
        </linearGradient>
        <filter id="neon-glow"><feGaussianBlur stdDeviation="4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="texto-sombra"><feDropShadow dx="1" dy="2" stdDeviation="1" flood-color="#000" flood-opacity="0.8"/></filter>
      </defs>`;
      
    svgHTML += `<circle cx="${centro}" cy="${centro}" r="480" fill="#1a1a1a" />`;
    svgHTML += `<circle cx="${centro}" cy="${centro}" r="480" fill="none" stroke="url(#metal-gold)" stroke-width="20" />`;
    svgHTML += `<circle cx="${centro}" cy="${centro}" r="425" fill="none" stroke="url(#metal-gold)" stroke-width="12" />`;

    for(let j=0; j<24; j++) {
      let anguloLuz = (j * 15) * Math.PI / 180;
      let luzX = centro + 452 * Math.cos(anguloLuz);
      let luzY = centro + 452 * Math.sin(anguloLuz);
      let colorLuz = j % 2 === 0 ? "#FFFFFF" : "#FFD700";
      svgHTML += `<circle cx="${luzX}" cy="${luzY}" r="9" fill="${colorLuz}" filter="url(#neon-glow)" />`;
    }

    const radioInterior = 419;
    const numSegmentos = catalogoPremios.length;
    const anguloPorSegmento = 360 / numSegmentos;
    
    // El desfase asegura que matemáticamente el segmento 0 empiece perfectamente alineado al centro superior
    const desfase = -90 - (anguloPorSegmento / 2);

    catalogoPremios.forEach((premio, index) => {
      const inicioAngulo = index * anguloPorSegmento + desfase;
      const finAngulo = (index + 1) * anguloPorSegmento + desfase;
      const startRad = inicioAngulo * Math.PI / 180;
      const endRad = finAngulo * Math.PI / 180;
      const x1 = centro + radioInterior * Math.cos(startRad);
      const y1 = centro + radioInterior * Math.sin(startRad);
      const x2 = centro + radioInterior * Math.cos(endRad);
      const y2 = centro + radioInterior * Math.sin(endRad);

      const d = ["M", centro, centro, "L", x1, y1, "A", radioInterior, radioInterior, 0, 0, 1, x2, y2, "Z"].join(" ");
      svgHTML += `<path d="${d}" fill="${premio.color}" stroke="#fff" stroke-width="2" />`;

      const medioAngulo = inicioAngulo + (anguloPorSegmento / 2);
      const medioRad = medioAngulo * Math.PI / 180;
      
      // Empujamos el texto más al borde y achicamos la fuente para que quepan los 10 segmentos
      const radioTexto = 300; 
      const tx = centro + radioTexto * Math.cos(medioRad);
      const ty = centro + radioTexto * Math.sin(medioRad);
      let rotacionTexto = medioAngulo + 90;

      svgHTML += `
        <text x="${tx}" y="${ty}" font-family="Inter, sans-serif" font-weight="900" font-size="20" fill="#fff" text-anchor="middle" filter="url(#texto-sombra)" transform="rotate(${rotacionTexto}, ${tx}, ${ty})">
          <tspan x="${tx}" dy="-12">${premio.linea1}</tspan>
          <tspan x="${tx}" dy="26">${premio.linea2}</tspan>
        </text>`;
    });

    svgHTML += `
      <circle cx="${centro}" cy="${centro}" r="90" fill="#111" stroke="url(#metal-gold)" stroke-width="15" />
      <circle cx="${centro}" cy="${centro}" r="70" fill="url(#metal-gold)" />
      <text x="${centro}" y="${centro + 8}" font-family="Inter, sans-serif" font-weight="900" font-size="24" fill="#111" text-anchor="middle">SAMCOR</text>
    </svg>`;
    
    contenedorSvg.innerHTML = svgHTML;
  }

  generarRuedaSVG();
  const ruedaAnimable = document.getElementById("rueda-svg");

  setTimeout(() => { popup.classList.add("visible"); }, 1000); 
  btnCerrar.addEventListener("click", () => { popup.classList.remove("visible"); });

  btnGirar.addEventListener("click", () => {
    const rut = inputRut.value.trim();
    const celular = inputCelular.value.trim();
    const correo = inputCorreo.value.trim();
    
    if (!rut || !celular || !correo) { alert("Por favor, completa todos los campos."); return; }
    if (!validarRUT(rut)) { alert("El RUT ingresado no es válido. Verifica el formato."); return; }
    if (!correo.includes("@")) { alert("Ingresa un correo válido."); return; }

    const claveStorage = "samcor_ruleta_" + rut;
    if (localStorage.getItem(claveStorage) === "true") {
      alert("Este RUT ya ha participado en la ruleta. ¡Gracias por tu interés!");
      return;
    }

    btnGirar.disabled = true; inputRut.disabled = true; inputCelular.disabled = true; inputCorreo.disabled = true;
    bloqueFormulario.classList.add("oculto");
    ruedaContenedor.classList.add("modo-giro");

    // --- ALGORITMO DE PROBABILIDAD (TRUCAJE) ---
    // 1. Sumar todos los pesos (Total = 50)
    let pesoTotal = catalogoPremios.reduce((acc, p) => acc + p.peso, 0);
    // 2. Elegir un número aleatorio entre 0 y 50
    let randomP = Math.random() * pesoTotal;
    let sumaPesos = 0;
    let indiceGanador = 0;

    // 3. Determinar qué premio ganó según el peso
    for (let i = 0; i < catalogoPremios.length; i++) {
      sumaPesos += catalogoPremios[i].peso;
      if (randomP <= sumaPesos) {
        indiceGanador = i;
        break;
      }
    }

    // 4. Calcular los grados de rotación para forzar la rueda a detenerse en el indiceGanador
    const anguloPorSegmento = 360 / catalogoPremios.length;
    // Rotación base para que el segmento ganador quede exactamente apuntando al centro arriba (0 grados)
    const rotacionBase = 360 - (indiceGanador * anguloPorSegmento);
    // Añadimos un pequeño desvío aleatorio para que no caiga siempre exactamente en el centro matemático del premio
    const desvioAleatorio = (Math.random() * (anguloPorSegmento - 6)) - ((anguloPorSegmento - 6) / 2);
    
    // Damos 8 vueltas completas de espectáculo (2880 grados) + la rotación calculada
    const rotacionTotal = 2880 + rotacionBase + desvioAleatorio; 

    ruedaAnimable.style.transform = `rotate(${rotacionTotal}deg)`;

    setTimeout(() => {
      const premioGanado = catalogoPremios[indiceGanador];
      const textoCompleto = `${premioGanado.linea1} ${premioGanado.linea2}`;
      
      mensajePremio.innerText = premioGanado.valor === "perder" 
        ? "Casi... ¡Gracias por participar! Revisa nuestras ofertas."
        : `¡FELICIDADES! Ganaste: ${textoCompleto}. Revisa tu correo o SMS.`;
      
      mensajePremio.classList.remove("mensaje-oculto");
      mensajePremio.classList.add("mensaje-visible");
      
      // Activar el bloqueo en producción para evitar que tiren más de una vez
      // localStorage.setItem(claveStorage, "true"); 

      // --- ENVÍO DE DATOS A GOOGLE SHEETS ---
      // REEMPLAZA ESTA URL POR LA QUE TE DIO GOOGLE APPS SCRIPT
      const webhookURL = "https://script.google.com/macros/s/AKfycbx_Juhv1TXGKdVS-1gfbXC_U-my6txghftrND3CA4Dhehlc4NpkX0gjAxuJR9c8TXxl1A/exec";

      const paqueteDatos = {
        rut: rut,
        celular: celular,
        correo: correo,
        premio_texto: textoCompleto,
        premio_codigo: premioGanado.valor,
        fecha: new Date().toLocaleString("es-CL") // Guarda la hora local de Chile
      };

      // Usamos Content-Type text/plain para evitar bloqueos de seguridad (CORS) del navegador
      fetch(webhookURL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain" 
        },
        body: JSON.stringify(paqueteDatos)
      })
      .then(respuesta => {
        console.log("¡Lead guardado en la planilla exitosamente!");
      })
      .catch(error => {
        console.error("Error de conexión:", error);
      });

    }, 6000); 
  });
});
