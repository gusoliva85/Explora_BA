import { describe, it, expect } from 'vitest';
import {
  fovVertical,
  alturaCamara,
  metrosVisiblesAdelante,
  distanciaAlJugador,
  altoEnPantalla,
  medirEncuadre
} from '../src/player/encuadre.js';
import { CAMERA, UNITS, ZOMBIE_STANDARD } from '../src/config/balance.js';

/** El telefono de referencia, en vertical (D-15). */
const TEL = { ancho: 412, alto: 915 };

describe('la geometria del encuadre', () => {
  it('el campo vertical sale del horizontal y del aspecto', () => {
    // Con la pantalla mas alta que ancha, el vertical es MAS grande.
    const v = fovVertical(38, true, TEL.ancho / TEL.alto);
    expect(v).toBeGreaterThan(38);
    // Y si el campo ya era vertical, no se toca.
    expect(fovVertical(50, false, 0.45)).toBe(50);
  });

  it('la camara sube con el angulo y con la distancia', () => {
    const base = { alturaFoco: 1.2, pitchGrados: 48, distancia: 15 };
    expect(alturaCamara(base)).toBeGreaterThan(alturaCamara({ ...base, pitchGrados: 30 }));
    expect(alturaCamara(base)).toBeGreaterThan(alturaCamara({ ...base, distancia: 10 }));
  });

  it('bajar el angulo hace ver MAS lejos, no menos', () => {
    // Es lo contrario de lo que parece, y es el motivo de que esto este
    // medido y no discutido: el borde de arriba se acerca al horizonte.
    const base = {
      alturaFoco: 1.2, distancia: 15, fovVerticalGrados: 74.8
    };
    const alto = metrosVisiblesAdelante({ ...base, pitchGrados: 60 });
    const bajo = metrosVisiblesAdelante({ ...base, pitchGrados: 45 });
    expect(bajo).toBeGreaterThan(alto);
  });

  it('si el borde de arriba llega al horizonte, se ve hasta el infinito', () => {
    expect(metrosVisiblesAdelante({
      alturaFoco: 1.2, pitchGrados: 30, distancia: 15, fovVerticalGrados: 74.8
    })).toBe(Infinity);
  });

  it('correr la mira hacia adelante acerca al jugador y aleja el horizonte', () => {
    const base = {
      alturaFoco: 1.2, pitchGrados: 48, distancia: 15, fovVerticalGrados: 74.8
    };
    expect(distanciaAlJugador({ ...base, adelanto: 3 }))
      .toBeLessThan(distanciaAlJugador({ ...base, adelanto: 0 }));
    expect(metrosVisiblesAdelante({ ...base, adelanto: 3 }))
      .toBeGreaterThan(metrosVisiblesAdelante({ ...base, adelanto: 0 }));
  });

  it('lo lejano se ve mas chico, y lo mirado desde mas arriba tambien', () => {
    const base = {
      alturaObjeto: 1.8, alturaFoco: 1.2, distancia: 15,
      fovVerticalGrados: 74.8, altoPantalla: TEL.alto
    };
    const cerca = altoEnPantalla({ ...base, pitchGrados: 48 });
    expect(altoEnPantalla({ ...base, pitchGrados: 48, distancia: 25 })).toBeLessThan(cerca);
    // A 75 grados las figuras se achatan: es lo que mostraron los mockups.
    expect(altoEnPantalla({ ...base, pitchGrados: 75 })).toBeLessThan(cerca);
  });
});

describe('la camara del juego cumple lo que promete D-23', () => {
  const m = medirEncuadre(CAMERA, TEL.ancho, TEL.alto, UNITS.playerHeight);

  it('Gus se lee como personaje, no como icono', () => {
    /*
     * Con la camara vieja median 29 px; ahora son 42.
     *
     * El piso es 40 y no mas, porque el techo no lo pone el angulo: lo pone
     * el ancho. Para que la calzada de 10 m entre entera con un campo de 38
     * grados hay que estar a 14,5 m como minimo, y a esa distancia 42 px es
     * lo que hay. Acercarse mas achica la calle; abrir el campo achica a Gus
     * en la misma proporcion. El salto grande no lo va a dar la camara, lo
     * va a dar el modelo (12R.11).
     */
    expect(m.pixelesGus).toBeGreaterThanOrEqual(40);
  });

  it('Gus queda en la mitad de abajo, pero no atras de los botones', () => {
    // Corriendo la mira hacia adelante Gus baja en el encuadre. Pasado el
    // 72 % queda donde estan el joystick y el boton de atacar.
    expect(m.posicionGus).toBeGreaterThan(0.55);
    expect(m.posicionGus).toBeLessThan(0.72);
  });

  it('se ve mas calle por delante que el radio de deteccion de un zombi', () => {
    // Si se ve menos que lo que el zombi detecta, te encuentra antes de que
    // vos lo veas, y eso es un cambio de dificultad disfrazado de cambio
    // visual. Es el piso duro de D-23.
    expect(m.metrosAdelante).toBeGreaterThan(ZOMBIE_STANDARD.sightRange);
  });

  it('la calzada entera entra a lo ancho', () => {
    // Lo que de verdad se paga al acercar la camara es el ancho, y es la
    // restriccion que manda: la calzada mide 10 m entre cordones y si no
    // entra, el juego se vuelve un pasillo.
    expect(m.anchoVisible).toBeGreaterThanOrEqual(UNITS.streetWidth);
  });

  it('la camara no vuela por encima de las fachadas', () => {
    // Un edificio de dos plantas mide unos 7 m. Si la camara va mas alta que
    // los edificios bajos, se pierde la sensacion de estar en una calle.
    expect(m.alturaCamara).toBeLessThan(14);
  });

  it('el jugador puede alejar y acercar sin romper el encuadre', () => {
    for (const distancia of [CAMERA.distanceMin, CAMERA.distanceMax]) {
      const v = medirEncuadre({ ...CAMERA, distance: distancia }, TEL.ancho, TEL.alto);
      expect(v.metrosAdelante).toBeGreaterThan(ZOMBIE_STANDARD.sightRange);
      expect(v.pixelesGus).toBeGreaterThan(20);
    }
  });

  it('en el angulo mas alto que permite, todavia se ve algo de calle', () => {
    const v = medirEncuadre({ ...CAMERA, pitchDegrees: CAMERA.pitchMax }, TEL.ancho, TEL.alto);
    expect(v.metrosAdelante).toBeGreaterThan(ZOMBIE_STANDARD.sightRange);
  });
});
