/**
 * ===========================================================================
 * INSPECCIONAR UN .GLB — en que se le va el peso
 * ===========================================================================
 * Abre un `.glb` y dice cuanto pesa cada cosa: geometria, texturas,
 * animaciones. Sin dependencias: lee el contenedor GLB y el JSON de glTF,
 * que es todo lo que hace falta.
 *
 * Existe porque la regla del proyecto es medir antes de elegir (12R.A), y
 * "pesa 4 MB" no es una medicion: no dice si el problema son las texturas
 * —que se arregla— o los triangulos —que no—.
 *
 *   node tools/inspeccionar-glb.mjs public/modelos/arbol-01.glb
 *   node tools/inspeccionar-glb.mjs "_assets/.../zombi.glb" --json
 *
 * Nota: acepta rutas a `_assets/` porque es una herramienta de medicion que
 * corre a mano, no codigo del juego. Lo que esta prohibido por D-33 es que
 * el JUEGO referencie esa carpeta.
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

/** Cuantos bytes ocupa cada tipo de componente de glTF. */
const BYTES_POR_COMPONENTE = {
  5120: 1, // BYTE
  5121: 1, // UNSIGNED_BYTE
  5122: 2, // SHORT
  5123: 2, // UNSIGNED_SHORT
  5125: 4, // UNSIGNED_INT
  5126: 4 // FLOAT
};

/** Cuantos componentes tiene cada tipo. */
const COMPONENTES_POR_TIPO = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16
};

/** Separa un GLB en su JSON y su buffer binario. */
export function leerGlb(ruta) {
  const buf = readFileSync(ruta);

  if (buf.readUInt32LE(0) !== 0x46546c67) {
    throw new Error(`${basename(ruta)} no es un GLB (falta la firma "glTF")`);
  }

  let offset = 12;
  let json = null;
  let bin = null;

  while (offset < buf.length) {
    const largo = buf.readUInt32LE(offset);
    const tipo = buf.readUInt32LE(offset + 4);
    const datos = buf.subarray(offset + 8, offset + 8 + largo);

    if (tipo === 0x4e4f534a) json = JSON.parse(datos.toString('utf8'));
    else if (tipo === 0x004e4942) bin = datos;

    offset += 8 + largo + ((4 - (largo % 4)) % 4);
  }

  if (!json) throw new Error(`${basename(ruta)} no tiene chunk JSON`);
  return { json, bin, pesoTotal: buf.length };
}

/** Todo lo que hace falta saber antes de decidir si un modelo entra. */
export function inspeccionar(ruta) {
  const { json, pesoTotal } = leerGlb(ruta);

  // --- Triangulos y vertices ----------------------------------------------
  let triangulos = 0;
  let vertices = 0;
  let primitivas = 0;

  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      primitivas++;
      const modo = prim.mode ?? 4; // 4 = TRIANGLES
      const cuenta =
        prim.indices != null
          ? json.accessors[prim.indices].count
          : json.accessors[prim.attributes.POSITION].count;
      if (modo === 4) triangulos += cuenta / 3;
      else if (modo === 5 || modo === 6) triangulos += Math.max(0, cuenta - 2);
      vertices += json.accessors[prim.attributes.POSITION].count;
    }
  }

  // --- Donde esta el peso --------------------------------------------------
  // Las imagenes se miden por su vista del buffer; la geometria y las
  // animaciones, sumando lo que ocupa cada accessor que las alimenta.
  let bytesImagenes = 0;
  for (const img of json.images ?? []) {
    if (img.bufferView != null) bytesImagenes += json.bufferViews[img.bufferView].byteLength ?? 0;
  }

  const bytesDeAccessor = (i) => {
    const a = json.accessors[i];
    if (!a) return 0;
    return a.count * COMPONENTES_POR_TIPO[a.type] * BYTES_POR_COMPONENTE[a.componentType];
  };

  let bytesGeometria = 0;
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      if (prim.indices != null) bytesGeometria += bytesDeAccessor(prim.indices);
      for (const i of Object.values(prim.attributes ?? {})) bytesGeometria += bytesDeAccessor(i);
    }
  }

  let bytesAnimacion = 0;
  const animaciones = [];
  for (const anim of json.animations ?? []) {
    let bytes = 0;
    let duracion = 0;
    for (const s of anim.samplers ?? []) {
      bytes += bytesDeAccessor(s.input) + bytesDeAccessor(s.output);
      const entrada = json.accessors[s.input];
      if (entrada?.max?.[0] != null) duracion = Math.max(duracion, entrada.max[0]);
    }
    bytesAnimacion += bytes;
    animaciones.push({ nombre: anim.name ?? '(sin nombre)', bytes, duracion: +duracion.toFixed(2) });
  }

  return {
    archivo: basename(ruta),
    pesoTotal,
    triangulos: Math.round(triangulos),
    vertices,
    mallas: (json.meshes ?? []).length,
    primitivas,
    materiales: (json.materials ?? []).length,
    texturas: (json.textures ?? []).length,
    imagenes: (json.images ?? []).length,
    huesos: (json.skins ?? []).reduce((n, s) => n + (s.joints?.length ?? 0), 0),
    nodos: (json.nodes ?? []).length,
    animaciones,
    bytesImagenes,
    bytesGeometria,
    bytesAnimacion,
    draco: (json.extensionsUsed ?? []).includes('KHR_draco_mesh_compression'),
    extensiones: json.extensionsUsed ?? [],
    generador: json.asset?.generator ?? '—'
  };
}

// --- Cuando se corre a mano ------------------------------------------------

const esPrincipal = process.argv[1]?.replace(/\\/g, '/').endsWith('tools/inspeccionar-glb.mjs');

if (esPrincipal) {
  const rutas = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const comoJson = process.argv.includes('--json');

  if (!rutas.length) {
    console.error('Uso: node tools/inspeccionar-glb.mjs <archivo.glb> [...] [--json]');
    process.exit(1);
  }

  const mb = (b) => (b / 1048576).toFixed(2) + ' MB';
  const pct = (b, t) => (t ? Math.round((b / t) * 100) + ' %' : '—');
  const resultados = [];

  for (const ruta of rutas) {
    try {
      resultados.push(inspeccionar(ruta));
    } catch (e) {
      console.error(`✗ ${ruta}: ${e.message}`);
    }
  }

  if (comoJson) {
    console.log(JSON.stringify(resultados, null, 2));
  } else {
    for (const r of resultados) {
      console.log(`\n${'='.repeat(64)}\n${r.archivo}  —  ${mb(r.pesoTotal)}\n${'='.repeat(64)}`);
      console.log(`  generado por     ${r.generador}`);
      console.log(`  triangulos       ${r.triangulos.toLocaleString('es-AR')}`);
      console.log(`  vertices         ${r.vertices.toLocaleString('es-AR')}`);
      console.log(`  mallas / prims   ${r.mallas} / ${r.primitivas}`);
      console.log(`  materiales       ${r.materiales}`);
      console.log(`  texturas / imgs  ${r.texturas} / ${r.imagenes}`);
      console.log(`  huesos           ${r.huesos || '— (sin esqueleto)'}`);
      console.log(`  nodos            ${r.nodos}`);
      console.log(`  Draco            ${r.draco ? 'si' : 'NO'}`);
      if (r.extensiones.length) console.log(`  extensiones      ${r.extensiones.join(', ')}`);
      console.log(`\n  EN QUE SE LE VA EL PESO`);
      console.log(`    texturas       ${mb(r.bytesImagenes).padStart(9)}   ${pct(r.bytesImagenes, r.pesoTotal)}`);
      console.log(`    geometria      ${mb(r.bytesGeometria).padStart(9)}   ${pct(r.bytesGeometria, r.pesoTotal)}`);
      console.log(`    animacion      ${mb(r.bytesAnimacion).padStart(9)}   ${pct(r.bytesAnimacion, r.pesoTotal)}`);
      if (r.animaciones.length) {
        console.log(`\n  ANIMACIONES (${r.animaciones.length})`);
        for (const a of r.animaciones) {
          console.log(`    ${a.nombre.padEnd(28)} ${String(a.duracion).padStart(6)} s   ${mb(a.bytes)}`);
        }
      }
    }
    console.log();
  }
}
