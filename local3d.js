// local3d.js — tamamı tarayıcıda çalışan, kotasız renkli 2.5D kabartma motoru
// Görselin kenar renklerini arka plan olarak tahmin eder; renk/ışık farkını derinliğe
// dönüştürür ve Three.js ile texture'lı bir GLB üretir.

import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

let progressLog = null;
export function local3dProgress(cb) { progressLog = cb || null; }
const notify = (message) => { if (progressLog) progressLog(message); };

function samplePixel(data, width, x, y) {
  const i = (Math.max(0, y) * width + Math.max(0, x)) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

function colorDistance(a, b) {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db) / 441.7;
}

export async function generateLocal3D(file) {
  notify("Görsel cihazda analiz ediliyor…");
  const bitmap = await createImageBitmap(file);
  const maxSide = 512;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const W = Math.max(2, Math.round(bitmap.width * scale));
  const H = Math.max(2, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, W, H);
  bitmap.close();
  const pixels = ctx.getImageData(0, 0, W, H).data;

  const corners = [samplePixel(pixels, W, 0, 0), samplePixel(pixels, W, W - 1, 0), samplePixel(pixels, W, 0, H - 1), samplePixel(pixels, W, W - 1, H - 1)];
  const bg = [0, 1, 2, 3].map((c) => corners.reduce((sum, p) => sum + p[c], 0) / corners.length);
  const strength = new Float32Array(W * H);
  let active = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = samplePixel(pixels, W, x, y);
    const alpha = p[3] / 255;
    const diff = colorDistance(p, bg);
    const s = bg[3] < 245 ? alpha : Math.max(0, Math.min(1, (diff - 0.035) / 0.22)) * alpha;
    strength[y * W + x] = s;
    if (s > 0.12) active++;
  }
  const useWholeImage = active < W * H * 0.025;
  if (useWholeImage) strength.fill(1);

  let x0 = W - 1, y0 = H - 1, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (strength[y * W + x] > 0.12) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  if (x1 <= x0 || y1 <= y0) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1; }
  const pad = Math.max(3, Math.round(Math.max(x1 - x0, y1 - y0) * 0.04));
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);

  notify("Renklerden derinlik haritası oluşturuluyor…");
  const N = 128, bw = x1 - x0, bh = y1 - y0;
  const positions = [], uvs = [], indices = [], masks = new Float32Array((N + 1) * (N + 1));
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const u = i / N, v = j / N;
    const px = Math.round(x0 + u * bw), py = Math.round(y0 + v * bh);
    const p = samplePixel(pixels, W, px, py);
    const mask = strength[py * W + px];
    masks[j * (N + 1) + i] = mask;
    const luminance = (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
    const dome = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
    const detail = (0.5 - luminance) * 0.10;
    const depth = (0.10 + dome * 0.22 + detail) * (useWholeImage ? 1 : Math.max(0.15, mask));
    positions.push(u - 0.5, (0.5 - v) * (bh / bw), depth);
    uvs.push(px / W, 1 - py / H);
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const tl = j * (N + 1) + i, tr = tl + 1, bl = (j + 1) * (N + 1) + i, br = bl + 1;
    const visible = useWholeImage || (masks[tl] + masks[tr] + masks[bl] + masks[br]) / 4 > 0.10;
    if (visible) indices.push(tl, bl, tr, tr, bl, br);
  }
  if (!indices.length) throw new Error("Görselden yüzey oluşturulamadı");

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({
    map: texture, side: THREE.DoubleSide, roughness: 0.8, metalness: 0,
    transparent: !useWholeImage, alphaTest: useWholeImage ? 0 : 0.08
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "browser_relief";

  notify("3D dosyası hazırlanıyor…");
  const glb = await new Promise((resolve, reject) => new GLTFExporter().parse(
    mesh,
    (result) => resolve(new Blob([result], { type: "model/gltf-binary" })),
    reject,
    { binary: true }
  ));
  notify("Yerel 2.5D model hazır ✓");
  return glb;
}

export default { generateLocal3D, local3dProgress };
