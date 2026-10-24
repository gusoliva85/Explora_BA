/* ===========================================================================
   MOTOR DE DIBUJO DE LOS MOCKUPS
   ===========================================================================
   Dibuja una calle de Boedo en diagonal, vista desde atras del hombro de Gus
   y desde arriba. Lo usan los tres mockups con distinta inclinacion de
   camara, que es justamente la decision que hay que tomar (D-02).

   Es un script clasico, no un modulo, para que los HTML se puedan abrir con
   doble clic desde el explorador de archivos sin levantar ningun servidor.

   ---------------------------------------------------------------------------
   SISTEMA DE COORDENADAS
   ---------------------------------------------------------------------------
   Se trabaja en "coordenadas de calle", en metros:

     s = avance a lo largo de la calle (crece hacia el fondo, arriba-izquierda)
     t = desplazamiento a lo ancho    (0 = eje de la calzada)
                                       t negativo = derecha de la pantalla
                                       t positivo = izquierda de la pantalla
     h = altura sobre el suelo

   Primero se gira al eje de la camara (de ahi sale la diagonal) y despues se
   proyecta:

     u =  s*cos(yaw) - t*sin(yaw)      lateral en pantalla
     v =  s*sin(yaw) + t*cos(yaw)      profundidad

     pantallaX = X0 + u*S
     pantallaY = Y0 - (v*KP + h*KA)*S

   KP y KA salen de la inclinacion. La version "pura" seria KP = sin(pitch) y
   KA = cos(pitch), que corresponde a una camara ortografica infinitamente
   lejos. La camara real esta a diez metros y tiene 55 grados de campo: la
   perspectiva comprime la profundidad y agranda lo cercano. Los dos
   multiplicadores aproximan ese efecto, y son los que hacen que un personaje
   parado parezca una persona y no una mancha aplastada.
   =========================================================================== */

(function (global) {
  'use strict';

  // -------------------------------------------------------------------------
  // Aleatoriedad con semilla: el mockup sale igual en cada recarga
  // -------------------------------------------------------------------------
  function crearRng(seed) {
    let a = seed >>> 0;
    const f = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.r = (lo, hi) => lo + f() * (hi - lo);
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    return f;
  }

  function sombrear(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const g = (v) => Math.max(0, Math.min(255, Math.round(v + (k > 0 ? (255 - v) * k : v * k))));
    return `rgb(${g((n >> 16) & 255)},${g((n >> 8) & 255)},${g(n & 255)})`;
  }

  // -------------------------------------------------------------------------
  // Paleta base. Cada mockup la tiñe con `temperatura`.
  // -------------------------------------------------------------------------
  const BASE = {
    cielo:      '#0a0d12',
    asfalto:    '#1f232a',
    asfaltoAlt: '#282d35',
    vereda:     '#363b43',
    cordon:     '#525862',
    fachada:    ['#4a463e', '#3f454c', '#514738', '#3d433f', '#4e403a', '#45484e'],
    persiana:   '#2d3238',
    toldo:      ['#6b3b32', '#2f4a5c', '#5a5330', '#45374f', '#3d5240'],
    cartel:     '#ded5b4',
    techo:      '#2c3237',
    tanque:     '#8e979d',
    arbol:      '#26351f',
    arbolAlt:   '#364a2c',
    auto:       ['#5e2825', '#23405a', '#454a51', '#6b6452'],
    gusCampera: '#23262e',
    gusRemera:  '#131519',
    gusJean:    '#2b3a52',
    gusPiel:    '#d8a87e',
    gusPelo:    '#16171b',
    zombi:      '#4a5633',
    zombiPiel:  '#8e9859',
    sangre:     '#7d2420',
    ambar:      '#e0a526',
    alerta:     '#d4504a'
  };

  const COMERCIOS = [
    'ALMACEN', 'VERDULERIA', 'FARMACIA', 'PIZZERIA', 'FERRETERIA',
    'PANADERIA', 'LOCUTORIO', 'LA ESQUINA', 'CARNICERIA'
  ];
  const GRAFITIS = ['BOEDO', 'AGUANTE', '1915', 'SAN LO'];

  // -------------------------------------------------------------------------
  // Escena
  // -------------------------------------------------------------------------

  function Calle(canvas, opciones) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.o = Object.assign(
      {
        pitch: 65,          // inclinacion de camara, en grados
        yaw: 106,           // giro: lo que vuelve diagonal a la calle
        escala: 48,         // pixeles por metro
        x0: 360,
        y0: 1150,
        semilla: 1,
        niebla: 0.45,       // 0 = aire limpio, 1 = sopa
        temperatura: 0,     // negativo = noche fria, positivo = luz de sodio
        oscuridad: 0.16,
        /*
         * Posicion de la camara en coordenadas de calle. La proyeccion es
         * ortografica, asi que por si sola no sabe donde esta parada la
         * camara: con una vista ortografica pura se veria la fachada de una
         * sola de las dos filas de edificios, y la de enfrente mostraria la
         * espalda. Teniendo la posicion, se puede decidir que caras miran al
         * jugador igual que lo haria una camara de verdad, y la calle pasa a
         * verse como una calle: dos hileras de frentes mirandose.
         */
        camS: -13,
        camT: -2.2
      },
      opciones || {}
    );

    const p = (this.o.pitch * Math.PI) / 180;
    const y = (this.o.yaw * Math.PI) / 180;
    this.KP = Math.sin(p) * 0.68;   // profundidad
    this.KA = Math.cos(p) * 1.45;   // altura
    this.cy = Math.cos(y);
    this.sy = Math.sin(y);
    this.S = this.o.escala;
    this.R = crearRng(this.o.semilla);

    this.C = JSON.parse(JSON.stringify(BASE));
    this.cam = { s: this.o.camS, t: this.o.camT };

    /** Cola de dibujo ordenada por profundidad (algoritmo del pintor). */
    this.cola = [];
  }

  // --- Proyeccion -----------------------------------------------------------

  Calle.prototype.prof = function (s, t) {
    return s * this.sy + t * this.cy;
  };

  /**
   * Distancia a la camara. Es la clave del algoritmo del pintor: lo mas
   * lejano se dibuja primero. Usar la distancia real y no la profundidad
   * ortografica es lo que ordena bien las dos hileras de edificios.
   */
  Calle.prototype.dist = function (s, t) {
    return Math.hypot(s - this.cam.s, t - this.cam.t);
  };

  /** @returns {{x:number,y:number}} punto en pantalla */
  Calle.prototype.P = function (s, t, h) {
    const u = s * this.cy - t * this.sy;
    const v = s * this.sy + t * this.cy;
    return {
      x: this.o.x0 + u * this.S,
      y: this.o.y0 - (v * this.KP + (h || 0) * this.KA) * this.S
    };
  };

  /** Agrega algo a la cola, con su profundidad. */
  Calle.prototype.push = function (v, fn) {
    this.cola.push({ v: v, fn: fn });
  };

  Calle.prototype.vaciarCola = function () {
    // Lo mas lejano primero: asi lo cercano lo tapa.
    this.cola.sort((a, b) => b.v - a.v);
    // (la clave `v` es la distancia a la camara, ver Calle.dist)
    for (const item of this.cola) item.fn();
    this.cola.length = 0;
  };

  // --- Utilidades de dibujo -------------------------------------------------

  /** Poligono en coordenadas de calle. */
  Calle.prototype.poly = function (puntos, fill, stroke, lw) {
    const c = this.ctx;
    c.beginPath();
    puntos.forEach((pt, i) => {
      const q = this.P(pt[0], pt[1], pt[2] || 0);
      if (i === 0) c.moveTo(q.x, q.y);
      else c.lineTo(q.x, q.y);
    });
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1.5; c.stroke(); }
  };

  /**
   * Mapea el cuadrado unidad sobre una cara vertical del mundo y ejecuta
   * `dibujar` ahi adentro. Una cara vertical se proyecta siempre como un
   * paralelogramo, asi que la transformacion afin es exacta: permite pintar
   * persianas, carteles y ventanas en coordenadas comodas de 0 a 1.
   *
   * (0,0) = abajo-izquierda de la cara, (1,1) = arriba-derecha.
   */
  Calle.prototype.cara = function (s0, t0, s1, t1, alto, dibujar) {
    const c = this.ctx;
    const o = this.P(s0, t0, 0);
    const ex = this.P(s1, t1, 0);
    const ey = this.P(s0, t0, alto);
    c.save();
    c.transform(ex.x - o.x, ex.y - o.y, ey.x - o.x, ey.y - o.y, o.x, o.y);
    dibujar(c);
    c.restore();
  };

  /** Elipse apoyada en el suelo, util para sombras y marcadores. */
  Calle.prototype.discoSuelo = function (s, t, radio, fill, stroke, lw) {
    const c = this.ctx;
    const centro = this.P(s, t, 0);
    const borde = this.P(s + radio, t, 0);
    const lado = this.P(s, t + radio, 0);
    c.save();
    c.translate(centro.x, centro.y);
    c.transform(borde.x - centro.x, borde.y - centro.y, lado.x - centro.x, lado.y - centro.y, 0, 0);
    c.beginPath();
    c.arc(0, 0, 1, 0, Math.PI * 2);
    c.restore();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
  };

  /**
   * Caja alineada a la calle. Dibuja la tapa y las caras que miran a la
   * camara, sombreadas segun su orientacion.
   */
  Calle.prototype.caja = function (s0, t0, s1, t1, alto, color, opts) {
    opts = opts || {};
    const base = opts.base || 0;      // altura desde la que arranca la caja
    const cx = (s0 + s1) / 2, ct = (t0 + t1) / 2;

    const esquinas = [[s0, t0], [s1, t0], [s1, t1], [s0, t1]];

    if (opts.sombra !== false) {
      this.discoSuelo(
        cx, ct,
        Math.max(Math.abs(s1 - s0), Math.abs(t1 - t0)) * 0.6,
        'rgba(0,0,0,0.5)'
      );
    }

    /*
     * Una cara se ve si su normal apunta hacia la camara. Se compara el
     * centro de la cara contra el centro de la caja usando la posicion real
     * de la camara, no la direccion de vista: asi las dos hileras de
     * edificios muestran su frente, que es lo que pasa en una calle.
     */
    const caras = [];
    for (let i = 0; i < 4; i++) {
      const a = esquinas[i];
      const b = esquinas[(i + 1) % 4];
      const ms = (a[0] + b[0]) / 2, mt = (a[1] + b[1]) / 2;
      // Normal exterior de la cara: del centro de la caja hacia la cara.
      const ns = ms - cx, nt = mt - ct;
      // Vector de la cara hacia la camara.
      const ks = this.cam.s - ms, kt = this.cam.t - mt;
      if (ns * ks + nt * kt > 0) {
        caras.push({ a: a, b: b, d: this.dist(ms, mt) });
      }
    }
    caras.sort((x, y) => y.d - x.d);

    for (const f of caras) {
      // Las caras transversales reciben menos luz que las frontales.
      const lateral = Math.abs(f.a[0] - f.b[0]) < 1e-6;
      const k = lateral ? -0.4 : -0.18;
      this.poly(
        [[f.a[0], f.a[1], base], [f.b[0], f.b[1], base],
         [f.b[0], f.b[1], alto], [f.a[0], f.a[1], alto]],
        opts.colorCara || sombrear(color, k),
        'rgba(0,0,0,0.55)', 1.2
      );
    }

    this.poly(
      [[s0, t0, alto], [s1, t0, alto], [s1, t1, alto], [s0, t1, alto]],
      opts.colorTapa || color,
      'rgba(0,0,0,0.5)', 1.2
    );
  };

  // =========================================================================
  // SUELO
  // =========================================================================

  Calle.prototype.suelo = function (sMin, sMax) {
    const c = this.ctx;
    const C = this.C;

    c.fillStyle = C.cielo;
    c.fillRect(0, 0, this.cv.width, this.cv.height);

    const franja = (t0, t1, color) =>
      this.poly([[sMin, t0], [sMax, t0], [sMax, t1], [sMin, t1]], color);

    franja(-8, -5, C.vereda);     // vereda derecha de la pantalla
    franja(-5.16, -5, C.cordon);
    franja(-5, 5, C.asfalto);     // calzada
    franja(5, 5.16, C.cordon);
    franja(5, 8, C.vereda);       // vereda izquierda de la pantalla

    // Baldosas: se dibujan como lineas en coordenadas de calle, asi que
    // convergen igual que todo lo demas y refuerzan la diagonal.
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.lineWidth = 1.2;
    const linea = (a, b) => {
      const p0 = this.P(a[0], a[1], 0), p1 = this.P(b[0], b[1], 0);
      c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.stroke();
    };
    for (const [ta, tb] of [[-8, -5], [5, 8]]) {
      for (let s = sMin; s <= sMax; s += 0.6) linea([s, ta], [s, tb]);
      for (let t = ta; t <= tb + 0.01; t += 0.6) linea([sMin, t], [sMax, t]);
    }

    // Parches de reparacion y manchas de humedad.
    for (let i = 0; i < 60; i++) {
      const s = this.R.r(sMin, sMax), t = this.R.r(-5, 5);
      const ls = this.R.r(0.8, 4), lt = this.R.r(0.5, 2.2);
      c.globalAlpha = this.R.r(0.15, 0.34);
      this.poly(
        [[s, t], [s + ls, t], [s + ls, t + lt], [s, t + lt]],
        this.R.chance(0.5) ? C.asfaltoAlt : '#171b20'
      );
    }
    c.globalAlpha = 1;

    // Linea central discontinua.
    for (let s = sMin; s < sMax; s += 4.2) {
      c.globalAlpha = this.R.r(0.45, 0.95);
      this.poly([[s, -0.08], [s + 2.2, -0.08], [s + 2.2, 0.08], [s, 0.08]], 'rgba(214,206,178,0.3)');
    }
    c.globalAlpha = 1;

    // Senda peatonal al fondo: marca que ahi hay una esquina.
    for (let i = 0; i < 8; i++) {
      const s = 31 + i * 0.75;
      this.poly([[s, -5], [s + 0.4, -5], [s + 0.4, 5], [s, 5]], 'rgba(214,206,178,0.13)');
    }
  };

  // =========================================================================
  // EDIFICIOS
  // =========================================================================

  /**
   * Un edificio. La cara que da a la calle lleva todo el detalle: persiana
   * metalica, toldo, cartel y rejas. Es lo que hace que una caja gris se
   * lea como una cuadra de Boedo.
   *
   * @param {number} lado -1 = fila de la derecha de la pantalla, +1 = izquierda
   */
  Calle.prototype.edificio = function (s0, largo, alto, lado, idx) {
    const C = this.C;
    const R = this.R;
    const tFrente = 8 * lado;
    const tFondo = 22 * lado;
    const s1 = s0 + largo;
    const v = this.dist(s0 + largo / 2, tFrente);

    this.push(v, () => {
      const c = this.ctx;
      const color = C.fachada[idx % C.fachada.length];

      // Volumen.
      this.caja(s0, Math.min(tFrente, tFondo), s1, Math.max(tFrente, tFondo), alto, color, {
        sombra: false,
        colorTapa: C.techo
      });

      // Tanque de agua en la azotea.
      if (largo > 5 && R.chance(0.7)) {
        const ts = s0 + R.r(1.2, largo - 1.2);
        const tt = tFrente + (tFondo - tFrente) * R.r(0.12, 0.4);
        this.caja(ts - 0.7, tt - 0.7, ts + 0.7, tt + 0.7, alto + 1.5, C.tanque,
          { sombra: false, base: alto });
      }

      // --- Cara que mira a la calle -----------------------------------------
      this.cara(s0, tFrente, s1, tFrente, alto, (cc) => {
        const W = 1, H = 1;
        const mAlto = (m) => m / alto;   // metros -> fraccion de la cara

        // Degradado general y humedad subiendo desde la vereda.
        let g = cc.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(0,0,0,0.5)');
        g.addColorStop(1, 'rgba(255,255,255,0.05)');
        cc.fillStyle = g;
        cc.fillRect(0, 0, W, H);

        // Ventanas de los pisos altos, con reja en el primero.
        const pisos = Math.max(1, Math.floor((alto - 4.2) / 3));
        const cols = Math.max(1, Math.round(largo / 2.6));
        for (let p = 0; p < pisos; p++) {
          const yb = mAlto(4.4 + p * 3);
          const yt = mAlto(4.4 + p * 3 + 1.7);
          for (let k = 0; k < cols; k++) {
            const xa = 0.07 + (k * 0.86) / cols;
            const xb = xa + 0.86 / cols - 0.07;
            cc.fillStyle = R.chance(0.22) ? 'rgba(255,207,138,0.42)' : 'rgba(140,172,198,0.1)';
            cc.fillRect(xa, yb, xb - xa, yt - yb);
            cc.strokeStyle = 'rgba(0,0,0,0.6)';
            cc.lineWidth = 0.008;
            cc.strokeRect(xa, yb, xb - xa, yt - yb);
            cc.beginPath();
            cc.moveTo((xa + xb) / 2, yb); cc.lineTo((xa + xb) / 2, yt); cc.stroke();
            if (p === 0) {
              cc.strokeStyle = 'rgba(14,16,18,0.9)';
              cc.lineWidth = 0.006;
              for (let b = 1; b < 5; b++) {
                const bx = xa + ((xb - xa) * b) / 5;
                cc.beginPath(); cc.moveTo(bx, yb); cc.lineTo(bx, yt); cc.stroke();
              }
            } else if (R.chance(0.45)) {
              cc.fillStyle = 'rgba(16,18,21,0.85)';
              cc.fillRect(xa - 0.02, yb - 0.012, xb - xa + 0.04, 0.014);
            }
          }
        }

        // Planta baja: persiana metalica acanalada.
        const yPb = mAlto(3.2);
        cc.fillStyle = C.persiana;
        cc.fillRect(0.03, 0, 0.94, yPb);
        cc.strokeStyle = 'rgba(255,255,255,0.05)';
        cc.lineWidth = 0.004;
        for (let yy = 0.006; yy < yPb; yy += mAlto(0.17)) {
          cc.beginPath(); cc.moveTo(0.04, yy); cc.lineTo(0.96, yy); cc.stroke();
        }
        g = cc.createLinearGradient(0, 0, 0, yPb);
        g.addColorStop(0, 'rgba(70,45,28,0.5)');   // oxido abajo
        g.addColorStop(1, 'rgba(70,45,28,0)');
        cc.fillStyle = g;
        cc.fillRect(0.03, 0, 0.94, yPb);

        // Graffiti.
        if (R.chance(0.45)) {
          cc.save();
          cc.globalAlpha = 0.45;
          cc.fillStyle = R.pick(['#c0392b', '#2980b9', '#d6d0b8']);
          cc.translate(0.1, yPb * 0.45);
          cc.scale(0.0016, -0.0016 * (alto / largo) * 0);
          cc.restore();
          // La escala de la cara es muy anisotropa para texto chico: se
          // dibuja como trazos, que ademas se parece mas a un aerosol.
          cc.save();
          cc.globalAlpha = 0.4;
          cc.strokeStyle = R.pick(['#c0392b', '#2980b9', '#d6d0b8']);
          cc.lineWidth = mAlto(0.1);
          cc.beginPath();
          for (let k = 0; k < 7; k++) {
            cc.moveTo(0.12 + k * 0.1, yPb * 0.25);
            cc.lineTo(0.14 + k * 0.1, yPb * 0.6);
            cc.lineTo(0.2 + k * 0.1, yPb * 0.3);
          }
          cc.stroke();
          cc.restore();
        }

        // Toldo.
        if (largo > 5) {
          const yT0 = mAlto(3.2), yT1 = mAlto(3.9);
          cc.fillStyle = C.toldo[idx % C.toldo.length];
          cc.fillRect(0.03, yT0, 0.94, yT1 - yT0);
          cc.fillStyle = 'rgba(0,0,0,0.3)';
          for (let sx = 0.03; sx < 0.97; sx += 0.1) cc.fillRect(sx, yT0, 0.05, yT1 - yT0);
        }

        // Cartel del comercio.
        if (largo > 5) {
          const yC0 = mAlto(4.0), yC1 = mAlto(5.2);
          cc.fillStyle = 'rgba(12,14,18,0.94)';
          cc.fillRect(0.06, yC0, 0.88, yC1 - yC0);
          cc.strokeStyle = 'rgba(222,213,180,0.3)';
          cc.lineWidth = 0.006;
          cc.strokeRect(0.06, yC0, 0.88, yC1 - yC0);
        }

        // Puerta de entrada.
        cc.fillStyle = '#121418';
        cc.fillRect(0.78, 0, 0.14, mAlto(2.3));
      });

      // El texto del cartel va aparte y sin deformar: dentro de la cara, la
      // escala vertical y la horizontal son muy distintas y la tipografia
      // sale ilegible.
      if (largo > 5) {
        let a = this.P(s0 + 0.5, tFrente, 4.3);
        let b = this.P(s1 - 0.5, tFrente, 4.3);
        // La hilera que avanza hacia la izquierda de la pantalla daria un
        // angulo mayor a 90 grados y el texto saldria cabeza abajo: se
        // recorre la linea al reves y queda derecho.
        if (b.x < a.x) { const tmp = a; a = b; b = tmp; }
        const alt = this.P(s0 + 0.5, tFrente, 5.0);
        const altoPx = Math.abs(alt.y - this.P(s0 + 0.5, tFrente, 4.3).y) || 10;
        const anchoPx = Math.hypot(b.x - a.x, b.y - a.y);
        c.save();
        c.translate(a.x, a.y);
        c.rotate(Math.atan2(b.y - a.y, b.x - a.x));
        c.fillStyle = C.cartel;
        c.font = `700 ${Math.max(9, altoPx * 0.78)}px ui-sans-serif, system-ui, sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(COMERCIOS[idx % COMERCIOS.length], anchoPx / 2, -altoPx * 0.1, anchoPx * 0.94);
        c.restore();
      }
    });
  };

  Calle.prototype.hilera = function (lado, sMin, sMax) {
    let s = sMin;
    let i = lado > 0 ? 3 : 0;
    while (s < sMax) {
      const largo = this.R.r(6, 11);
      this.edificio(s, largo, this.R.r(9, 17), lado, i);
      s += largo;
      i++;
    }
  };

  // =========================================================================
  // PROPS
  // =========================================================================

  Calle.prototype.auto = function (s, t, color, cruzado) {
    const v = this.dist(s, t);
    this.push(v, () => {
      const L = cruzado ? 1.85 : 4.4, A = cruzado ? 4.4 : 1.85;
      this.caja(s, t, s + L, t + A, 0.85, color, { colorTapa: sombrear(color, 0.05) });
      this.caja(s + L * 0.26, t + A * 0.13, s + L * 0.74, t + A * 0.87, 1.5,
        sombrear(color, -0.15), { sombra: false, colorTapa: 'rgba(150,180,205,0.18)' });
    });
  };

  Calle.prototype.colectivo = function (s, t) {
    const v = this.dist(s + 5.5, t + 1.25);
    this.push(v, () => {
      this.caja(s, t, s + 11, t + 2.5, 3.0, '#2c3c4c', { colorTapa: '#3a4c5e' });
      // Franja de linea: un colectivo porteño se reconoce por eso.
      this.cara(s, t, s + 11, t, 3.0, (cc) => {
        cc.fillStyle = '#b5472f';
        cc.fillRect(0, 0.42, 1, 0.14);
        cc.fillStyle = 'rgba(150,185,210,0.15)';
        for (let i = 0; i < 7; i++) cc.fillRect(0.06 + i * 0.13, 0.62, 0.09, 0.22);
      });
    });
  };

  Calle.prototype.arbol = function (s, t) {
    const v = this.dist(s, t);
    this.push(v, () => {
      const c = this.ctx;
      const C = this.C;
      this.discoSuelo(s, t, 1.2, 'rgba(0,0,0,0.45)');
      const pie = this.P(s, t, 0), copa = this.P(s, t, 3.8);
      c.strokeStyle = '#2e2922';
      c.lineWidth = Math.max(2, 0.22 * this.S * this.KA);
      c.beginPath(); c.moveTo(pie.x, pie.y); c.lineTo(copa.x, copa.y); c.stroke();
      const r = 1.4 * this.S * 0.72;
      c.fillStyle = C.arbol;
      c.beginPath(); c.arc(copa.x, copa.y, r, 0, 7); c.fill();
      for (let i = 0; i < 10; i++) {
        c.fillStyle = this.R.chance(0.5) ? C.arbolAlt : '#1f2b1b';
        const a = this.R.r(0, 7), d = this.R.r(0, 0.7) * r;
        c.beginPath();
        c.arc(copa.x + Math.cos(a) * d, copa.y + Math.sin(a) * d * 0.85, r * this.R.r(0.22, 0.42), 0, 7);
        c.fill();
      }
    });
  };

  /** Farol de sodio: poste, brazo y el charco de luz sobre la calzada. */
  Calle.prototype.farol = function (s, t) {
    const haciaCentro = t > 0 ? -1 : 1;
    const v = this.dist(s, t);
    this.push(v + 0.01, () => {
      const c = this.ctx;
      const tLuz = t + 3.2 * haciaCentro;

      this.discoSuelo(s, tLuz, 6.5, null);
      const centro = this.P(s, tLuz, 0);
      const g = c.createRadialGradient(centro.x, centro.y, 0, centro.x, centro.y, 6.5 * this.S * 0.75);
      g.addColorStop(0, 'rgba(255,200,126,0.24)');
      g.addColorStop(0.5, 'rgba(255,190,115,0.09)');
      g.addColorStop(1, 'rgba(255,185,110,0)');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(centro.x, centro.y, 6.5 * this.S * 0.95, 6.5 * this.S * this.KP * 0.9, 0, 0, 7);
      c.fill();

      const pie = this.P(s, t, 0), alto = this.P(s, t, 8), brazo = this.P(s, tLuz * 0.55 + t * 0.45, 8);
      c.strokeStyle = '#42474e';
      c.lineWidth = Math.max(2, 0.18 * this.S * this.KA);
      c.beginPath(); c.moveTo(pie.x, pie.y); c.lineTo(alto.x, alto.y); c.lineTo(brazo.x, brazo.y); c.stroke();
      c.fillStyle = 'rgba(255,214,150,0.85)';
      c.beginPath(); c.ellipse(brazo.x, brazo.y + 3, 0.34 * this.S, 0.2 * this.S, 0, 0, 7); c.fill();
    });
  };

  Calle.prototype.contenedor = function (s, t) {
    this.push(this.dist(s, t), () => {
      this.caja(s, t, s + 2.0, t + 1.1, 1.3, '#33452f', { colorTapa: '#3e5338' });
    });
  };

  Calle.prototype.bolsas = function (s, t) {
    this.push(this.dist(s, t), () => {
      const c = this.ctx;
      for (let i = 0; i < 5; i++) {
        const bs = s + this.R.r(-0.9, 0.9), bt = t + this.R.r(-0.4, 0.4), r = this.R.r(0.26, 0.44);
        this.discoSuelo(bs, bt, r, 'rgba(0,0,0,0.45)');
        const q = this.P(bs, bt, r * 0.9);
        c.fillStyle = this.R.pick(['#1b1e21', '#232629', '#171a1d']);
        c.beginPath(); c.ellipse(q.x, q.y, r * this.S, r * this.S * 0.95, 0, 0, 7); c.fill();
      }
    });
  };

  Calle.prototype.barricada = function (s, t) {
    this.push(this.dist(s, t), () => {
      const c = this.ctx;
      this.caja(s - 0.25, t - 2.1, s + 0.25, t - 1.6, 1.0, '#565b61', { sombra: false });
      this.caja(s - 0.25, t + 1.6, s + 0.25, t + 2.1, 1.0, '#565b61', { sombra: false });
      for (let i = 0; i < 5; i++) {
        const h = this.R.r(0.25, 1.1);
        const a = this.P(s + this.R.r(-0.2, 0.2), t - 2.1, h);
        const b = this.P(s + this.R.r(-0.2, 0.2), t + 2.1, h);
        c.strokeStyle = this.R.pick(['#5e4830', '#473823', '#6a5534']);
        c.lineWidth = Math.max(3, 0.28 * this.S * this.KA);
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      }
    });
  };

  /** Botiquin con resplandor: tiene que distinguirse del decorado. */
  Calle.prototype.botiquin = function (s, t) {
    this.push(this.dist(s, t) - 0.01, () => {
      const c = this.ctx;
      const centro = this.P(s, t, 0);
      const g = c.createRadialGradient(centro.x, centro.y, 0, centro.x, centro.y, 2.2 * this.S);
      g.addColorStop(0, 'rgba(224,165,38,0.32)');
      g.addColorStop(1, 'rgba(224,165,38,0)');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(centro.x, centro.y, 2.2 * this.S, 2.2 * this.S * this.KP, 0, 0, 7);
      c.fill();

      this.caja(s - 0.3, t - 0.22, s + 0.3, t + 0.22, 0.38, '#d8d3c6', { colorTapa: '#e6e2d6' });
      const q = this.P(s, t, 0.4);
      c.fillStyle = '#c0392b';
      c.fillRect(q.x - 0.05 * this.S, q.y - 0.16 * this.S, 0.1 * this.S, 0.32 * this.S);
      c.fillRect(q.x - 0.16 * this.S, q.y - 0.05 * this.S, 0.32 * this.S, 0.1 * this.S);
    });
  };

  /** Marcador del objetivo: anillo en el suelo y haz vertical. */
  Calle.prototype.marcador = function (s, t) {
    this.push(this.dist(s, t) + 0.02, () => {
      const c = this.ctx;
      const centro = this.P(s, t, 0);
      const g = c.createRadialGradient(centro.x, centro.y, 0, centro.x, centro.y, 5 * this.S);
      g.addColorStop(0, 'rgba(224,165,38,0.26)');
      g.addColorStop(1, 'rgba(224,165,38,0)');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(centro.x, centro.y, 5 * this.S, 5 * this.S * this.KP, 0, 0, 7);
      c.fill();

      c.setLineDash([0.7 * this.S, 0.5 * this.S]);
      this.discoSuelo(s, t, 2.4, null, 'rgba(224,165,38,0.85)', 3);
      c.setLineDash([]);

      const pie = this.P(s, t, 0), tope = this.P(s, t, 7);
      const h = c.createLinearGradient(tope.x, tope.y, pie.x, pie.y);
      h.addColorStop(0, 'rgba(224,165,38,0)');
      h.addColorStop(1, 'rgba(224,165,38,0.4)');
      c.strokeStyle = h;
      c.lineWidth = 0.5 * this.S;
      c.beginPath(); c.moveTo(pie.x, pie.y); c.lineTo(tope.x, tope.y); c.stroke();
    });
  };

  // =========================================================================
  // PERSONAJES
  // =========================================================================

  /**
   * Dibuja una figura humanoide de pie. Todo se construye sobre el eje
   * vertical proyectado, asi que la figura se inclina correctamente con la
   * camara y acompaña la diagonal de la calle.
   */
  Calle.prototype.figura = function (s, t, alturaTotal, dibujar) {
    const c = this.ctx;
    const pie = this.P(s, t, 0);
    const cabeza = this.P(s, t, alturaTotal);
    const alturaPx = Math.hypot(cabeza.x - pie.x, cabeza.y - pie.y);
    // Ancho: un metro medido a lo ancho de la calle, que es la direccion en
    // la que mira el personaje de costado.
    const lado = this.P(s, t + 1, 0);
    const anchoPx = Math.hypot(lado.x - pie.x, lado.y - pie.y);

    c.save();
    c.translate(pie.x, pie.y);
    // Los dos ejes locales son versores en pixeles de pantalla: el Y apunta
    // hacia la cabeza y el X hacia el costado.
    c.transform(
      (lado.x - pie.x) / anchoPx, (lado.y - pie.y) / anchoPx,
      (cabeza.x - pie.x) / alturaPx, (cabeza.y - pie.y) / alturaPx,
      0, 0
    );
    /*
     * Importante: un metro NO mide lo mismo a lo ancho que a lo alto. A lo
     * ancho mide `anchoPx`; a lo alto, `alturaPx / alturaTotal`, que depende
     * de la inclinacion de la camara. Usar el mismo numero para los dos
     * estiraba las figuras hasta dos veces y media con la camara alta, que
     * es justo lo que estos mockups tienen que dejar comparar de verdad.
     */
    dibujar(c, anchoPx, alturaPx / alturaTotal);
    c.restore();
  };

  Calle.prototype.gus = function (s, t, opts) {
    opts = opts || {};
    this.push(this.dist(s, t), () => {
      const c = this.ctx;
      const C = this.C;

      this.discoSuelo(s, t, 0.55, 'rgba(0,0,0,0.62)');

      // Halo y anillo: con la calle oscura y el personaje vestido de negro,
      // sin esto el jugador pierde de vista su propio muñeco. Cuanto mas
      // alta la camara, mas chico es Gus y mas necesario es el indicador.
      const centro = this.P(s, t, 0);
      const g = c.createRadialGradient(centro.x, centro.y, 0, centro.x, centro.y, 2.1 * this.S);
      g.addColorStop(0, 'rgba(224,165,38,0.26)');
      g.addColorStop(0.5, 'rgba(224,165,38,0.1)');
      g.addColorStop(1, 'rgba(224,165,38,0)');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(centro.x, centro.y, 2.1 * this.S, 2.1 * this.S * this.KP, 0, 0, 7);
      c.fill();
      this.discoSuelo(s, t, 0.8, null, 'rgba(240,190,70,0.65)', 2.5);

      // Cono de linterna hacia donde avanza: ademas de ambiente, dice hacia
      // donde esta mirando cuando el cuerpo es demasiado chico para notarlo.
      const pie = this.P(s, t, 0.9);
      const izq = this.P(s + 11, t - 3.2, 0);
      const der = this.P(s + 11, t + 3.2, 0);
      const cono = c.createLinearGradient(pie.x, pie.y, (izq.x + der.x) / 2, (izq.y + der.y) / 2);
      cono.addColorStop(0, 'rgba(255,226,170,0.22)');
      cono.addColorStop(1, 'rgba(255,215,150,0)');
      c.fillStyle = cono;
      c.beginPath();
      c.moveTo(pie.x, pie.y); c.lineTo(izq.x, izq.y); c.lineTo(der.x, der.y);
      c.closePath(); c.fill();

      this.figura(s, t, 1.8, (cc, mAncho, mAlto) => {
        const m = mAncho;               // 1 metro a lo ancho
        const y = (v) => -v * mAlto;    // altura en metros -> Y local
        const x = (v) => v * mAncho;

        // Piernas con el jean.
        cc.fillStyle = C.gusJean;
        cc.fillRect(x(-0.3), y(0.95), x(0.26), mAlto * 0.95);
        cc.fillRect(x(0.04), y(0.95), x(0.26), mAlto * 0.95);
        cc.fillStyle = '#15181f';
        cc.fillRect(x(-0.32), y(0.16), x(0.3), mAlto * 0.16);
        cc.fillRect(x(0.02), y(0.16), x(0.3), mAlto * 0.16);

        // Remera negra.
        cc.fillStyle = C.gusRemera;
        cc.fillRect(x(-0.26), y(1.6), x(0.52), mAlto * 0.66);

        // Campera de cuero abierta: el rasgo principal de la referencia.
        cc.fillStyle = C.gusCampera;
        for (const sgn of [-1, 1]) {
          cc.beginPath();
          cc.moveTo(x(sgn * 0.44), y(1.64));
          cc.lineTo(x(sgn * 0.1), y(1.6));
          cc.lineTo(x(sgn * 0.2), y(1.0));
          cc.lineTo(x(sgn * 0.46), y(1.02));
          cc.closePath();
          cc.fill();
        }
        cc.fillStyle = 'rgba(190,200,215,0.14)';
        cc.fillRect(x(-0.44), y(1.66), x(0.88), mAlto * 0.1);

        // Brazos.
        cc.fillStyle = '#272b33';
        cc.fillRect(x(-0.6), y(1.58), x(0.17), mAlto * 0.56);
        cc.save();
        cc.translate(x(0.44), y(1.54));
        cc.rotate(opts.arma === 'cuchillo' ? -0.5 : -0.2);
        cc.fillRect(0, 0, x(0.17), mAlto * 0.6);
        cc.restore();

        // Arma en la mano.
        if (opts.arma === 'cuchillo') {
          cc.save();
          cc.translate(x(0.74), y(1.2));
          cc.rotate(-0.45);
          cc.fillStyle = '#2b2118';
          cc.fillRect(0, 0, x(0.16), mAlto * 0.09);
          cc.fillStyle = '#c8cdd4';
          cc.beginPath();
          cc.moveTo(x(0.16), mAlto * 0.012);
          cc.lineTo(x(0.56), mAlto * 0.045);
          cc.lineTo(x(0.16), mAlto * 0.078);
          cc.closePath(); cc.fill();
          cc.restore();
        } else {
          cc.fillStyle = '#3a3f46';
          cc.fillRect(x(0.56), y(1.18), x(0.4), mAlto * 0.12);
        }

        // Cuello, cara, barba y pelo con volumen.
        cc.fillStyle = C.gusPiel;
        cc.fillRect(x(-0.07), y(1.74), x(0.14), mAlto * 0.08);
        cc.beginPath(); cc.ellipse(0, y(1.82), x(0.16), mAlto * 0.19, 0, 0, 7); cc.fill();
        cc.fillStyle = '#b8835e';
        cc.fillRect(x(-0.16), y(1.76), x(0.32), mAlto * 0.06);
        cc.fillStyle = C.gusPelo;
        cc.beginPath(); cc.ellipse(0, y(1.9), x(0.18), mAlto * 0.13, 0, 0, 7); cc.fill();
        for (let i = 0; i < 4; i++) {
          cc.beginPath();
          cc.moveTo(x(-0.13 + i * 0.085), y(1.93));
          cc.lineTo(x(-0.09 + i * 0.085), y(2.02));
          cc.lineTo(x(-0.04 + i * 0.085), y(1.93));
          cc.closePath(); cc.fill();
        }

        // Luz de borde: lo que separa una silueta negra de un fondo negro.
        cc.strokeStyle = 'rgba(255,206,145,0.45)';
        cc.lineWidth = Math.max(1.5, mAlto * 0.035);
        cc.beginPath();
        cc.moveTo(x(0.46), y(1.02));
        cc.lineTo(x(0.44), y(1.66));
        cc.lineTo(x(0.14), y(1.88));
        cc.stroke();
      });
    });
  };

  Calle.prototype.zombi = function (s, t, opts) {
    opts = opts || {};
    this.push(this.dist(s, t), () => {
      const c = this.ctx;
      const C = this.C;

      if (opts.alerta) {
        this.discoSuelo(s, t, 1.0, null, 'rgba(212,80,74,0.5)', 2.5);
      }
      this.discoSuelo(s, t, 0.5, 'rgba(0,0,0,0.55)');

      this.figura(s, t, 1.75, (cc, mAncho, mAlto) => {
        const m = mAncho;
        const y = (v) => -v * mAlto;
        const x = (v) => v * mAncho;

        // Piernas torcidas: camina mal, y se nota.
        cc.fillStyle = '#2b3126';
        cc.save(); cc.translate(x(-0.08), y(0.88)); cc.rotate(0.12);
        cc.fillRect(x(-0.15), 0, x(0.28), mAlto * 0.92); cc.restore();
        cc.save(); cc.translate(x(0.16), y(0.88)); cc.rotate(-0.15);
        cc.fillRect(x(-0.14), 0, x(0.28), mAlto * 0.92); cc.restore();

        // Torso encorvado: mas ancho y mas bajo que el de Gus. La silueta es
        // lo que permite distinguirlos de un vistazo, no el color.
        cc.fillStyle = C.zombi;
        cc.beginPath();
        cc.roundRect(x(-0.42), y(1.46), x(0.84), mAlto * 0.6, x(0.13));
        cc.fill();
        cc.fillStyle = 'rgba(0,0,0,0.4)';
        cc.fillRect(x(-0.1), y(1.32), x(0.24), mAlto * 0.28);
        cc.globalAlpha = 0.6;
        cc.fillStyle = C.sangre;
        cc.beginPath(); cc.ellipse(x(0.13), y(1.24), x(0.12), mAlto * 0.15, 0, 0, 7); cc.fill();
        cc.globalAlpha = 1;

        // Brazos extendidos hacia adelante.
        cc.fillStyle = C.zombiPiel;
        cc.save(); cc.translate(x(-0.42), y(1.4)); cc.rotate(0.6);
        cc.fillRect(x(-0.08), 0, x(0.16), mAlto * 0.82); cc.restore();
        cc.save(); cc.translate(x(0.42), y(1.4)); cc.rotate(-0.6);
        cc.fillRect(x(-0.08), 0, x(0.16), mAlto * 0.82); cc.restore();

        // Cabeza caida hacia un lado.
        cc.fillStyle = C.zombiPiel;
        cc.beginPath(); cc.ellipse(x(0.06), y(1.57), x(0.16), mAlto * 0.19, 0.2, 0, 7); cc.fill();
        cc.fillStyle = '#1a1d16';
        cc.beginPath(); cc.ellipse(x(0.1), y(1.52), x(0.06), mAlto * 0.05, 0, 0, 7); cc.fill();
      });
    });
  };

  // =========================================================================
  // ATMOSFERA
  // =========================================================================

  Calle.prototype.atmosfera = function () {
    const c = this.ctx;
    const W = this.cv.width, H = this.cv.height;

    // Niebla por profundidad: el fondo de la calle se desvanece. Ademas de
    // clima, esconde el borde del mapa y permite recortar el clip lejano.
    const lejos = this.P(60, 0, 0), cerca = this.P(-5, 0, 0);
    const g = c.createLinearGradient(lejos.x, lejos.y, cerca.x, cerca.y);
    g.addColorStop(0, `rgba(26, 33, 42, ${0.75 * this.o.niebla})`);
    g.addColorStop(0.55, `rgba(24, 30, 38, ${0.28 * this.o.niebla})`);
    g.addColorStop(1, 'rgba(22, 28, 36, 0)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    // Tinte general de la escena.
    const temp = this.o.temperatura;
    c.fillStyle = temp >= 0
      ? `rgba(40, 26, 12, ${0.05 + temp * 0.09})`
      : `rgba(14, 24, 44, ${0.05 - temp * 0.1})`;
    c.fillRect(0, 0, W, H);

    c.fillStyle = `rgba(7, 10, 15, ${this.o.oscuridad})`;
    c.fillRect(0, 0, W, H);

    // Viñeta, mas cerrada abajo que arriba.
    const v = c.createRadialGradient(W * 0.52, H * 0.52, H * 0.22, W * 0.52, H * 0.55, H * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = v;
    c.fillRect(0, 0, W, H);

    // Grano: rompe las superficies planas y disimula el bandeo.
    const r = crearRng(99);
    c.globalAlpha = 0.042;
    for (let i = 0; i < 11000; i++) {
      c.fillStyle = r() > 0.5 ? '#fff' : '#000';
      c.fillRect(r() * W, r() * H, 2, 2);
    }
    c.globalAlpha = 1;
  };

  // =========================================================================
  // ESCENA COMPLETA
  // =========================================================================

  /**
   * Arma la cuadra entera. La composicion es la misma en los tres mockups a
   * proposito: lo unico que cambia es la camara, asi que la comparacion es
   * justa.
   */
  Calle.prototype.dibujar = function () {
    this.suelo(-14, 60);

    this.hilera(-1, -7, 58);
    this.hilera(1, -7, 58);

    this.farol(2, -7.4);
    this.farol(22, 7.4);
    this.farol(42, -7.4);
    this.arbol(10, -6.6);
    this.arbol(30, -6.6);
    this.arbol(14, 6.6);
    this.arbol(34, 6.6);
    this.bolsas(6, 6.4);
    this.bolsas(26, -6.4);
    this.contenedor(18, -6.6);

    this.colectivo(26, 1.1);
    this.auto(1, -4.6, this.C.auto[1]);
    this.auto(12, -4.7, this.C.auto[0]);
    this.auto(19, 2.4, this.C.auto[3], true);   // cruzado: estrecha el paso
    this.auto(36, -4.6, this.C.auto[2]);
    this.auto(40, 2.6, this.C.auto[1]);

    this.barricada(16, -1.6);
    this.marcador(27, 0.5);
    this.botiquin(9.5, 1.6);

    // Zombis escalonados en profundidad: el de mas cerca ya te vio.
    this.zombi(7.0, -1.2, { alerta: true });
    this.zombi(13.5, 2.2, { alerta: true });
    this.zombi(21.0, -2.8, {});
    this.zombi(28.5, 3.4, {});
    this.zombi(33.0, -3.6, {});

    // Gus, en primer plano, abajo a la derecha.
    this.gus(0, -2.2, { arma: this.o.arma || 'pistola' });

    this.vaciarCola();
    this.atmosfera();
  };

  global.Calle = Calle;
  global.crearRngMockup = crearRng;
})(window);
