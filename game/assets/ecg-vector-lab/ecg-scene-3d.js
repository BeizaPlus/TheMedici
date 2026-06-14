/**
 * ECG Vector Lab — 3D torso (ref 02 limb ring + precordial fan).
 * Electrodes carry Z depth so rotation reveals frontal vs horizontal planes.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BODY_W = 206.326;
const BODY_H = 185;
const GLB_PATH = 'assets/ecg-vector-lab/character/boy.glb';

/** @param {string} key electrode id */
function electrodeDepthZ(key, nx, ny) {
  if (key === 'RA') return 0.1;
  if (key === 'LA') return 0.14;
  if (key === 'RL') return -0.12;
  if (key === 'LL') return -0.06;
  if (key === 'HC' || key === 'heart') return 0.2;
  if (/^V\d$/.test(key)) {
    var vi = parseInt(key.slice(1), 10) - 1;
    return 0.16 + vi * 0.028;
  }
  return 0.08 * (0.5 - Math.abs(nx - 0.5));
}

/** 2D lab body coords → world (+Y up, +Z anterior toward viewer). */
export function bodyPtToWorld(bx, by, key) {
  var nx = bx / BODY_W;
  var ny = by / BODY_H;
  var x = (nx - 0.5) * 1.05;
  var y = (0.5 - ny) * 1.18;
  var z = electrodeDepthZ(key || '', nx, ny);
  return new THREE.Vector3(x, y, z);
}

function r(d) {
  return (d * Math.PI) / 180;
}

export class EcgScene3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x12121a);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.05, 40);
    this.camera.position.set(0, 0.08, 2.35);

    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0.05, 0.08);
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 4.5;
    this.controls.maxPolarAngle = Math.PI * 0.92;
    this.controls.enableZoom = false;
    this.controls.update();

    var amb = new THREE.AmbientLight(0xffffff, 0.55);
    var key = new THREE.DirectionalLight(0xfff4e6, 1.05);
    key.position.set(1.2, 2, 2.5);
    var fill = new THREE.DirectionalLight(0x8899cc, 0.35);
    fill.position.set(-2, 0.5, 1);
    this.scene.add(amb, key, fill);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.manikinGroup = new THREE.Group();
    this.guidesGroup = new THREE.Group();
    this.electrodeGroup = new THREE.Group();
    this.scopeGroup = new THREE.Group();
    this.root.add(this.manikinGroup, this.guidesGroup, this.electrodeGroup, this.scopeGroup);

    this.electrodeMeshes = {};
    this.triLines = null;
    this.limbRing = null;
    this.vFan = null;
    this.scopeRing = null;
    this.vectorArrow = null;
    this._lastLab = null;

    this._buildProceduralManikin();
    this._buildGuideMeshes();
    this._tryLoadGlb();
  }

  _manikinMat() {
    return new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.88,
      metalness: 0.04,
    });
  }

  _buildProceduralManikin() {
    while (this.manikinGroup.children.length) this.manikinGroup.remove(this.manikinGroup.children[0]);
    var mat = this._manikinMat();
    var g = new THREE.Group();

    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.21, 0.52, 28), mat);
    torso.position.y = 0.02;
    g.add(torso);

    var chest = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 18), mat);
    chest.position.set(0, 0.12, 0.06);
    chest.scale.set(1.05, 0.88, 0.62);
    g.add(chest);

    var head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 22, 16), mat);
    head.position.y = 0.46;
    g.add(head);

    function limb(rTop, rBot, len, x, y, z, rotZ) {
      var m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, 12), mat);
      m.position.set(x, y, z);
      if (rotZ) m.rotation.z = rotZ;
      g.add(m);
    }
    limb(0.06, 0.05, 0.38, -0.38, 0.18, 0.02, 0.35);
    limb(0.06, 0.05, 0.38, 0.38, 0.18, 0.02, -0.35);
    limb(0.07, 0.06, 0.48, -0.14, -0.42, -0.04, 0.06);
    limb(0.07, 0.06, 0.48, 0.14, -0.42, -0.04, -0.06);

    this.manikinGroup.add(g);
  }

  _tryLoadGlb() {
    var loader = new GLTFLoader();
    var self = this;
    loader.load(
      GLB_PATH,
      function (gltf) {
        while (self.manikinGroup.children.length) self.manikinGroup.remove(self.manikinGroup.children[0]);
        var model = gltf.scene;
        model.traverse(function (o) {
          if (o.isMesh) {
            o.material = self._manikinMat();
            o.castShadow = false;
          }
        });
        var box = new THREE.Box3().setFromObject(model);
        var size = box.getSize(new THREE.Vector3());
        var maxDim = Math.max(size.x, size.y, size.z) || 1;
        var s = 1.15 / maxDim;
        model.scale.setScalar(s);
        box.setFromObject(model);
        var center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.y += 0.05;
        self.manikinGroup.add(model);
      },
      undefined,
      function () {
        /* keep procedural manikin */
      }
    );
  }

  _buildGuideMeshes() {
    /* Ref 02 — blue limb hexaxial ring (frontal plane, faces viewer at rest). */
    var ringGeo = new THREE.TorusGeometry(0.4, 0.006, 10, 80);
    this.limbRing = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.55 })
    );
    this.limbRing.position.set(0, 0.08, 0.12);
    this.guidesGroup.add(this.limbRing);

    var ringLabel = this._makeLabel('Frontal · limb ring (ref 02)', 0.52, 0.08, 0.12);
    this.guidesGroup.add(ringLabel);

    /* Ref 02 — red precordial fan (horizontal plane on chest). */
    var fanPts = [];
    for (var i = 0; i <= 32; i++) {
      var t = i / 32;
      var ang = Math.PI * 0.15 + t * Math.PI * 0.7;
      var rx = 0.08 + Math.cos(ang) * 0.34;
      var rz = 0.22 + Math.sin(ang) * 0.12;
      fanPts.push(new THREE.Vector3(-0.34 + t * 0.68, 0.1, rz));
    }
    var fanGeo = new THREE.BufferGeometry().setFromPoints(fanPts);
    this.vFan = new THREE.Line(
      fanGeo,
      new THREE.LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.7 })
    );
    this.guidesGroup.add(this.vFan);
    this.vFanFallback = this.vFan.geometry;

    var fanLabel = this._makeLabel('Horizontal · V1–V6 fan (ref 02)', 0, 0.28, 0.28);
    this.guidesGroup.add(fanLabel);
  }

  _makeLabel(text, x, y, z) {
    var cv = document.createElement('canvas');
    var ctx = cv.getContext('2d');
    ctx.font = '600 22px Archivo,sans-serif';
    var w = ctx.measureText(text).width + 16;
    cv.width = w;
    cv.height = 32;
    ctx.font = '600 22px Archivo,sans-serif';
    ctx.fillStyle = 'rgba(232,184,75,0.95)';
    ctx.fillText(text, 8, 22);
    var tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(w / 280, 0.12, 1);
    sp.position.set(x, y, z);
    return sp;
  }

  _ensureElectrode(name, color) {
    if (this.electrodeMeshes[name]) return this.electrodeMeshes[name];
    var mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 16, 12),
      new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.25, roughness: 0.4 })
    );
    this.electrodeGroup.add(mesh);
    this.electrodeMeshes[name] = mesh;
    return mesh;
  }

  _syncElectrodes(lab) {
    var limbColors = { RA: 0xf8fafc, LA: 0x111827, RL: 0x5c6370, LL: 0x0284c7 };
    var self = this;
    Object.keys(lab.EL_BODY || {}).forEach(function (n) {
      var p = lab.EL_BODY[n];
      var mesh = self._ensureElectrode(n, limbColors[n] || 0x0284c7);
      var w = bodyPtToWorld(p.x, p.y, n);
      mesh.position.copy(w);
      mesh.visible = lab.showTri !== false || lab.placingLeads;
    });
    REF_KEYS.forEach(function (n) {
      var p = lab.PRE_BODY[n];
      if (!p) return;
      var mesh = self._ensureElectrode(n, 0xef4444);
      mesh.position.copy(bodyPtToWorld(p.x, p.y, n));
      mesh.visible = !!lab.placingLeads;
    });
  }

  _syncEinthoven(lab) {
    if (this.triLines) {
      this.guidesGroup.remove(this.triLines);
      this.triLines.geometry.dispose();
      this.triLines.material.dispose();
      this.triLines = null;
    }
    if (!lab.showTri) return;
    var ra = bodyPtToWorld(lab.EL_BODY.RA.x, lab.EL_BODY.RA.y, 'RA');
    var la = bodyPtToWorld(lab.EL_BODY.LA.x, lab.EL_BODY.LA.y, 'LA');
    var ll = bodyPtToWorld(lab.EL_BODY.LL.x, lab.EL_BODY.LL.y, 'LL');
    var segs = [
      { a: ra, b: la, n: 'I' },
      { a: ra, b: ll, n: 'II' },
      { a: la, b: ll, n: 'III' },
    ];
    var pts = [];
    segs.forEach(function (s) {
      pts.push(s.a.clone(), s.b.clone());
    });
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    this.triLines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72 })
    );
    this.guidesGroup.add(this.triLines);
  }

  _syncScope(lab) {
    while (this.scopeGroup.children.length) this.scopeGroup.remove(this.scopeGroup.children[0]);
    if (!lab.showScope && !lab.showVector) return;

    var hc = bodyPtToWorld(lab.HC_BODY.x, lab.HC_BODY.y, 'HC');
    var sr = 0.36 * (lab.scopeScale || 1);

    if (lab.showScope) {
      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(sr, 0.005, 8, 64),
        new THREE.MeshBasicMaterial({ color: 0xe8b84b, transparent: true, opacity: 0.75 })
      );
      ring.position.copy(hc);
      this.scopeGroup.add(ring);
    }

    if (lab.showVector) {
      var va = lab.vec || { vx: 0, vy: 0, on: false };
      if (va.on) {
        var len = 0.28;
        var dir = new THREE.Vector3(va.vx, -va.vy, 0).normalize().multiplyScalar(len);
        var origin = hc.clone();
        var arrow = new THREE.ArrowHelper(dir, origin, len, 0x0284c7, 0.06, 0.04);
        this.scopeGroup.add(arrow);
      }
    }
  }

  _syncVFan(lab) {
    if (!this.vFan || !lab.PRE_BODY) return;
    var pts = [];
    REF_KEYS.forEach(function (k) {
      var p = lab.PRE_BODY[k];
      if (p) pts.push(bodyPtToWorld(p.x, p.y, k));
    });
    if (pts.length >= 2) {
      if (this.vFan.geometry) this.vFan.geometry.dispose();
      this.vFan.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    }
  }

  sync(lab) {
    this._lastLab = lab;
    if (this.limbRing) this.limbRing.visible = lab.showLimbRing !== false;
    if (this.vFan) this.vFan.visible = lab.showVFan !== false;
    this._syncElectrodes(lab);
    this._syncVFan(lab);
    this._syncEinthoven(lab);
    this._syncScope(lab);
    this.controls.enabled = !lab.placingLeads && !lab.placingScope && !lab.placingHeart;
  }

  resize(w, h) {
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
    this.controls.dispose();
  }
}

var REF_KEYS = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

export function createEcgScene3d(canvas) {
  return new EcgScene3D(canvas);
}
