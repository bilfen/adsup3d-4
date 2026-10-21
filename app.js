// AD'S UP v2 — görselden renkli 2.5D modele ve videoya
// Tüm üretim öğrencinin tarayıcısında gerçekleşir; dış AI servisi ve API anahtarı yoktur.

const $ = (id) => document.getElementById(id);
const drop = $("drop"), preview = $("preview"), btnOlustur = $("btnOlustur");
const fileInput = $("fileInput");
const statusEl = $("status"), bar = $("bar"), barFill = $("barFill"), logEl = $("log");
const secViz = $("secViz"), vidList = $("vidList");
const canvas = $("c3d");

import { generateLocal3D, local3dProgress } from "./local3d.js";
local3dProgress((m) => log(m));

const log = (m) => { logEl.style.display = "block"; logEl.textContent += m + "\n"; logEl.scrollTop = 1e9; };
const setStatus = (t, pct) => { statusEl.textContent = t; if (pct != null) { bar.style.display = "block"; barFill.style.width = pct + "%"; } };

// ---------- 1) Görsel seçimi ----------
let file = null;
drop.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => { if (fileInput.files[0]) setFile(fileInput.files[0]); });
["dragover", "dragenter"].forEach((e) =>
  drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add("over"); }));
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", (ev) => {
  ev.preventDefault(); drop.classList.remove("over");
  if (ev.dataTransfer.files[0]) setFile(ev.dataTransfer.files[0]);
});

function setFile(f) {
  if (!f || !f.type.startsWith("image/")) return;
  file = f;
  preview.src = URL.createObjectURL(f);
  preview.style.display = "block";
  btnOlustur.disabled = false;
  setStatus("Görsel hazır: " + f.name);
  log("Görsel seçildi: " + f.name + " (" + Math.round(f.size / 1024) + " KB)");
}

// ---------- 2) Tarayıcı içi yerel 3D üretim ----------
async function generate3D(file) {
  setStatus("Görsel tarayıcıda hazırlanıyor…", 20);
  log("Yerel üretim başlıyor: " + file.name);
  try {
    const glb = await generateLocal3D(file);
    setStatus("Model hazır! (cihazda üretildi)", 100);
    log("Sonuç: renkli 2.5D kabartma modeli — görsel cihazdan çıkmadı");
    return glb;
  } catch (error) {
    throw new Error("3D üretilemedi: " + error.message + " — daha sade veya yüksek kontrastlı bir görsel deneyin");
  }
}

// ---------- 3) Three.js sahne ----------
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Videoya gömülecek logo (sağ üst)
const logoImg = new Image();
logoImg.src = "assets/logo.png";

let renderer, scene, camera, controls, model = null, turning = false, frameId = 0, recTimer = 0;
function initScene() {
  if (scene) return;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);
  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0.4, 3.2);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 1.0);
  const dir = new THREE.DirectionalLight(0xffffff, 2.4);
  dir.position.set(3, 5, 4);
  const dir2 = new THREE.DirectionalLight(0xffffff, 1.4);
  dir2.position.set(-4, 2, -3);
  scene.add(hemi, dir, dir2);
  controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
}

function drawCompositeFrame() {
  if (composite.width !== canvas.width || composite.height !== canvas.height) {
    composite.width = canvas.width;
    composite.height = canvas.height;
  }
  cctx.clearRect(0, 0, composite.width, composite.height);
  cctx.drawImage(canvas, 0, 0);
  if (logoImg.complete && logoImg.naturalWidth) {
    const pad = Math.round(composite.width * 0.022);
    const lw = Math.round(composite.width * 0.16);
    const lh = Math.round(lw * (logoImg.naturalHeight / logoImg.naturalWidth));
    const chipPadX = Math.round(lh * 0.35);
    const chipPadY = Math.round(lh * 0.25);
    const cw = lw + chipPadX * 2, ch = lh + chipPadY * 2;
    const cx = composite.width - cw - pad, cy = pad;
    cctx.save();
    cctx.globalAlpha = 0.88;
    cctx.fillStyle = "#ffffff";
    cctx.beginPath();
    if (cctx.roundRect) cctx.roundRect(cx, cy, cw, ch, Math.round(ch * 0.3));
    else cctx.rect(cx, cy, cw, ch);
    cctx.fill();
    cctx.globalAlpha = 0.92;
    cctx.drawImage(logoImg, cx + chipPadX, cy + chipPadY, lw, lh);
    cctx.restore();
  }
}

function stepScene() {
  resize();
  if (turning && model) model.rotation.y += 0.012;
  controls.update();
  renderer.render(scene, camera);
  if (recorder && recorder.state === "recording") drawCompositeFrame();
}

function loop() {
  frameId = requestAnimationFrame(loop);
  if (!recTimer) stepScene();
}

function resize() {
  if (!renderer) return;
  const w = canvas.clientWidth || 640, h = canvas.clientHeight || 480;
  if (canvas.width !== w * renderer.getPixelRatio() || canvas.height !== h * renderer.getPixelRatio()) {
    renderer.setSize(w, h, true);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}
window.addEventListener("resize", resize);

function showModel(glbBlob) {
  initScene();
  resize();
  if (!frameId) loop();
  const url = URL.createObjectURL(glbBlob);
  new GLTFLoader().load(url, (gltf) => {
    resize();
    // Renk kontrolü: texture'lı mı?
    let textured = false, texInfo = "";
    gltf.scene.traverse((o) => {
      const m = o.material;
      if (m && m.map) {
        textured = true;
        if (!texInfo && m.map.image) texInfo = m.map.image.width + "x" + m.map.image.height;
      }
    });
    window.__adsup.lastModel = { textured, texInfo, size: glbBlob.size };
    log("RENK KONTROLÜ: " + (textured ? "✔ texture VAR (renkli, " + texInfo + ")" : "✖ texture YOK (beyaz/neutral mesh)"));
    if (model) scene.remove(model);
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    model.position.x = -center.x; model.position.y = -center.y; model.position.z = -center.z;
    model.scale.setScalar(1.6 / maxDim);
    scene.add(model);
    turning = true;
    URL.revokeObjectURL(url);
    secViz.style.display = "block";
    secViz.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// ---------- 4) Video kaydı ----------
let recorder = null, chunks = [];
const composite = document.createElement("canvas");
const cctx = composite.getContext("2d");
function pickMime() {
  const cands = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  return cands.find((m) => MediaRecorder.isTypeSupported(m)) || "";
}

function startRecording() {
  resize();
  composite.width = canvas.width;
  composite.height = canvas.height;
  drawCompositeFrame();
  const stream = composite.captureStream(30);
  const mime = pickMime();
  recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6_000_000 } : undefined);
  chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  recorder.start(250);
  if (recTimer) clearInterval(recTimer);
  recTimer = setInterval(stepScene, 33);
}

function stopRecording() {
  return new Promise((res) => {
    if (recTimer) { clearInterval(recTimer); recTimer = 0; }
    if (!recorder || recorder.state === "inactive") return res(null);
    recorder.onstop = () => {
      const mime = (recorder.mimeType || "video/webm").split(";")[0];
      const ext = mime.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunks, { type: mime });
      const url = URL.createObjectURL(blob);
      addVideoCard(url, ext, blob);
      res(blob);
    };
    recorder.stop();
  });
}

function addVideoCard(url, ext, blob) {
  const kb = Math.round(blob.size / 1024);
  const wrap = document.createElement("div");
  wrap.className = "vidcard";
  wrap.innerHTML = `
    <video controls src="${url}"></video>
    <div class="meta"><span>${ext.toUpperCase()} · ${kb} KB</span>
    <span style="display:inline-flex;gap:6px;flex-wrap:wrap">
      <a class="dl" href="${url}" download="adsup-3d-video.${ext}">⬇ İndir</a>
      <button class="dl" data-drive>☁ Drive'a Kaydet</button>
    </span></div>`;
  wrap.querySelector("[data-drive]").addEventListener("click", (e) => saveToDrive(blob, e.currentTarget));
  vidList.prepend(wrap);
}

// ---------- 4.5) Google Drive'a kaydet ----------
// Kurulum (bir kezlik): console.cloud.google.com → Google Drive API etkin →
// OAuth client ID (Web) oluştur → Authorized JS origin: https://bilfen.github.io
// Client ID'yi DRIVE.clientId alanına yaz. İsteğe bağlı: ortak klasör için DRIVE.folderId.
const DRIVE = {
  clientId: "",           // ← ZORUNLU: OAuth Web Client ID ("xxxx.apps.googleusercontent.com")
  folderId: "",           // ← İSTEĞE BAĞLI: ortak klasör ID; boşsa "Drive'ım" köküne gider
  scope: "https://www.googleapis.com/auth/drive.file"
};
let driveToken = null;

function driveClientReady() {
  return typeof google !== "undefined" && google.accounts && google.accounts.oauth2;
}

function getDriveToken() {
  return new Promise((resolve, reject) => {
    if (!driveClientReady()) return reject(new Error("Google modülü yüklenemedi — internet bağlantısını kontrol edin"));
    const client = google.accounts.oauth2.initTokenClient({
      client_id: DRIVE.clientId,
      scope: DRIVE.scope,
      callback: (resp) => {
        if (resp.error) reject(new Error("Google oturumu reddedildi: " + resp.error));
        else resolve(resp.access_token);
      },
      error_callback: (err) => reject(new Error(err.message || "Google oturumu açılamadı"))
    });
    client.requestAccessToken({ prompt: "" }); // açık oturum varsa sessiz, yoksa popup açar
  });
}

async function driveUpload(token, blob, name, mime) {
  const boundary = "ADSUP" + Math.random().toString(36).slice(2);
  const meta = { name, mimeType: mime };
  if (DRIVE.folderId) meta.parents = [DRIVE.folderId];
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`,
    `--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
    blob,
    `\r\n--${boundary}--\r\n`
  ], { type: "multipart/related; boundary=" + boundary });
  const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    body
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { driveToken = null; throw new Error("Oturum yenilenmeli (401)"); }
  if (!r.ok) throw new Error("Drive hatası: " + ((j.error && j.error.message) || r.status));
  return j;
}

async function saveToDrive(blob, btn) {
  const original = btn.innerHTML;
  try {
    if (!DRIVE.clientId) {
      btn.textContent = "☁ Önce ayar gerek";
      setStatus("Drive'a kaydet için öğretmenin Google Client ID ayarı gerekli (app.js başındaki DRIVE bölümü). Kurulum talimatı README'de.");
      await new Promise(r => setTimeout(r, 4000));
      btn.innerHTML = original;
      return;
    }
    btn.disabled = true;
    btn.textContent = "☁ Yükleniyor…";
    setStatus("Google Drive'a yükleniyor…", null);
    let token = driveToken || await getDriveToken();
    let res;
    try { res = await driveUpload(token, blob, "adsup-3d-video.webm", blob.type || "video/webm"); }
    catch (e) {
      if (!/401|Oturum yenilenmeli/.test(e.message)) throw e;
      token = await getDriveToken();
      res = await driveUpload(token, blob, "adsup-3d-video.webm", blob.type || "video/webm");
    }
    driveToken = token;
    btn.textContent = "✔ Drive'a kaydedildi";
    setStatus("✔ Google Drive'a kaydedildi: " + res.name + " — " + (res.webViewLink || "https://drive.google.com/drive/my-drive"));
    log("Drive'a yüklendi: id=" + res.id);
  } catch (err) {
    console.error(err);
    btn.textContent = "⚠ Drive hatası";
    setStatus("Drive'a kaydetmede hata: " + err.message);
    log("Drive hatası: " + err.message);
  } finally {
    btn.disabled = false;
    setTimeout(() => { btn.innerHTML = original; }, 3500);
  }
}

$("btnTurn").addEventListener("click", () => { turning = !turning; });
$("btnRec5").addEventListener("click", async () => {
  turning = true;
  startRecording();
  await new Promise((r) => setTimeout(r, 10_000));
  await stopRecording();
});
$("btnRecManual").addEventListener("click", async () => {
  if (!recorder || recorder.state === "inactive") { startRecording(); $("btnRecManual").textContent = "⏹ Kaydı durdur"; }
  else { await stopRecording(); $("btnRecManual").textContent = "● Kaydı başlat / durdur"; }
});

// Test / otomasyon kancası
window.__adsup = { setFile, generate3D, showModel, composite };
Object.defineProperty(window.__adsup, "lastModel", { value: null, writable: true });

btnOlustur.addEventListener("click", async () => {
  if (!file) return;
  btnOlustur.disabled = true;
  logEl.textContent = "";
  try {
    const glb = await generate3D(file);
    showModel(glb);
  } catch (err) {
    console.error(err);
    setStatus("Hata: " + err.message + " — Lütfen tekrar deneyin.");
    bar.style.display = "none";
  } finally {
    btnOlustur.disabled = false;
  }
});
