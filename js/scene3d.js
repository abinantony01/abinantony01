/**
 * ACCESS BINARY — Immersive 3D Lab
 * Procedural PCB, neon traces, skill orbs, bloom, scroll-camera.
 * Full CDN URLs so GitHub Pages does not depend on import maps for the core scene.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

(function boot() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = matchMedia('(pointer: coarse)').matches;
    const isMobile = window.innerWidth < 768 || isTouch;

    const canvas = document.getElementById('webgl-world');
    const loader = document.getElementById('boot-loader');
    const bootLog = document.getElementById('boot-log');
    const bootFill = document.getElementById('boot-fill');
    const skipBtn = document.getElementById('skip3d');
    const hud = document.getElementById('lab-hud');
    const tooltip = document.getElementById('lab-tooltip');

    if (!canvas || typeof THREE === 'undefined') return;

    const state = {
        quality: isMobile ? 'low' : 'high',
        paused: reduced,
        bloom: !isMobile && !reduced,
        mouse: { x: 0, y: 0 },
        targetMouse: { x: 0, y: 0 },
        scroll: 0,
        highlight: null,
        hovered: null,
        clock: new THREE.Clock(),
        ready: false,
        inspect: false,
        sound: false,
        orbit: { yaw: 0.35, pitch: 0.42, dragging: false, lx: 0, ly: 0 },
    };

    const CHIP_MAP = {};
    const SECTION_STATIONS = [
        { id: 'hero',        pos: [0, 3.8, 8.4],  look: [0, 0.2, 0] },
        { id: 'about',       pos: [2.8, 2.4, 5.6], look: [0.2, 0.4, 0] },
        { id: 'skills',      pos: [0, 6.2, 4.8],  look: [0, 0.6, 0] },
        { id: 'circuits',    pos: [0, 7.4, 0.8],  look: [0, 0, 0] },
        { id: 'raspberrypi', pos: [-2.4, 2.2, 3.6], look: [-1.6, 0.35, 0.4] },
        { id: 'ai',          pos: [0.4, 3.6, 7.2], look: [0, 1.8, 0] },
        { id: 'projects',    pos: [3.6, 3.2, 6.4], look: [0.4, 0.3, 0] },
        { id: 'contact',     pos: [0, 5.2, 11],   look: [0, 0.4, 0] },
    ];

    /* ---------- Boot sequence ---------- */
    const bootLines = [
        'ACCESS BINARY OS v3.0 — Vi Microsystems Lab',
        'Detecting WebGL2 renderer…',
        'Mounting FR4 substrate @ 8×5 cm',
        'Routing copper traces (SPI / I2C / UART / CAN)',
        'Soldering STM32 · RP2350 · AD9833 · ESP32',
        'Loading TinyML core + OpenCV vision stack',
        'Calibrating bloom / ACES tone mapping',
        'Lab online. Welcome, Abin.',
    ];

    function logBoot(i, pct) {
        if (bootFill) bootFill.style.width = pct + '%';
        if (bootLog && bootLines[i]) {
            const line = document.createElement('div');
            line.textContent = '> ' + bootLines[i];
            bootLog.appendChild(line);
            bootLog.scrollTop = bootLog.scrollHeight;
        }
    }

    function dismissLoader() {
        if (!loader) return;
        loader.classList.add('boot-done');
        setTimeout(() => loader.remove(), 700);
        document.body.classList.add('lab-live');
    }

    if (skipBtn) skipBtn.addEventListener('click', dismissLoader);

    /* ---------- Renderer ---------- */
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: state.quality === 'high',
            alpha: true,
            powerPreference: 'high-performance',
        });
    } catch (err) {
        console.warn('WebGL unavailable — 2D fallback', err);
        dismissLoader();
        document.body.classList.add('lab-live');
        return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, state.quality === 'high' ? 1.6 : 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050810, 0.046);
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 80);
    camera.position.set(0, 3.8, 8.4);

    const camPos = new THREE.Vector3().fromArray(SECTION_STATIONS[0].pos);
    const camLook = new THREE.Vector3().fromArray(SECTION_STATIONS[0].look);
    const camPosLerp = camPos.clone();
    const camLookLerp = camLook.clone();

    /* ---------- Lights ---------- */
    scene.add(new THREE.AmbientLight(0x1a2a3a, 0.55));

    const key = new THREE.PointLight(0x00ff88, 18, 24, 2);
    key.position.set(2.2, 4.5, 3);
    scene.add(key);

    const fill = new THREE.PointLight(0x00d4ff, 14, 22, 2);
    fill.position.set(-3, 3.2, 2.4);
    scene.add(fill);

    const rim = new THREE.PointLight(0xc51a4a, 10, 16, 2);
    rim.position.set(-1.8, 1.6, -1.2);
    scene.add(rim);

    const hemi = new THREE.HemisphereLight(0x00d4ff, 0x0a3d2a, 0.35);
    scene.add(hemi);

    const mouseLight = new THREE.SpotLight(0x00ff88, 10, 20, 0.42, 0.55, 1.1);
    mouseLight.position.set(0, 7.5, 5);
    const mouseTarget = new THREE.Object3D();
    mouseTarget.position.set(0, 0, 0);
    scene.add(mouseLight);
    scene.add(mouseTarget);
    mouseLight.target = mouseTarget;

    /* ---------- Helpers ---------- */
    function makeLabel(text, color = '#00ff88', scale = 0.9) {
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 128;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, 512, 128);
        ctx.font = '700 42px "JetBrains Mono", monospace';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
        ctx.fillText(text, 256, 64);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
        const spr = new THREE.Sprite(mat);
        spr.scale.set(1.8 * scale, 0.45 * scale, 1);
        return spr;
    }

    function addPins(parent, w, d, countW, countD, y) {
        const pinGeo = new THREE.BoxGeometry(0.04, 0.12, 0.03);
        const pinMat = new THREE.MeshStandardMaterial({
            color: 0xc9a227, metalness: 0.95, roughness: 0.25,
        });
        const spacingW = (w - 0.12) / Math.max(countW - 1, 1);
        const spacingD = (d - 0.12) / Math.max(countD - 1, 1);
        for (let i = 0; i < countW; i++) {
            for (const side of [-1, 1]) {
                const pin = new THREE.Mesh(pinGeo, pinMat);
                pin.position.set(-w / 2 + 0.06 + i * spacingW, y, side * (d / 2 + 0.04));
                parent.add(pin);
            }
        }
        for (let i = 1; i < countD - 1; i++) {
            for (const side of [-1, 1]) {
                const pin = new THREE.Mesh(pinGeo, pinMat);
                pin.position.set(side * (w / 2 + 0.04), y, -d / 2 + 0.06 + i * spacingD);
                parent.add(pin);
            }
        }
    }

    function createChip({ w, h, d, color, name, emissive = 0x111111 }) {
        const g = new THREE.Group();
        g.name = name;
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({
                color,
                metalness: 0.55,
                roughness: 0.32,
                emissive,
                emissiveIntensity: 0.25,
            })
        );
        body.castShadow = false;
        g.add(body);

        const lid = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.72, 0.02, d * 0.72),
            new THREE.MeshStandardMaterial({ color: 0x0a0e14, metalness: 0.4, roughness: 0.5 })
        );
        lid.position.y = h / 2 + 0.01;
        g.add(lid);

        addPins(g, w, d, Math.max(4, Math.round(w * 6)), Math.max(4, Math.round(d * 6)), -h / 2 + 0.02);

        const label = makeLabel(name, '#e8f4f8', Math.min(1, w * 0.7));
        label.position.y = h / 2 + 0.28;
        g.add(label);

        CHIP_MAP[name.toLowerCase()] = g;
        return g;
    }

    /* ---------- PCB ---------- */
    const lab = new THREE.Group();
    scene.add(lab);

    const pcb = new THREE.Group();
    lab.add(pcb);

    const board = new THREE.Mesh(
        new THREE.BoxGeometry(8.2, 0.09, 5.1),
        new THREE.MeshStandardMaterial({
            color: 0x0b3d28,
            metalness: 0.22,
            roughness: 0.55,
            emissive: 0x032016,
            emissiveIntensity: 0.4,
        })
    );
    pcb.add(board);

    const edge = new THREE.Mesh(
        new THREE.BoxGeometry(8.28, 0.04, 5.18),
        new THREE.MeshStandardMaterial({ color: 0x083322, metalness: 0.3, roughness: 0.7 })
    );
    edge.position.y = -0.06;
    pcb.add(edge);

    /* Copper traces + live current */
    const tracePos = [];
    const tracePaths = [];
    const rng = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < 64; i++) {
        let x = rng(-3.7, 3.7);
        let z = rng(-2.2, 2.2);
        const path = [new THREE.Vector3(x, 0.07, z)];
        const segs = 2 + Math.floor(Math.random() * 5);
        for (let s = 0; s < segs; s++) {
            const horiz = Math.random() > 0.5;
            const nx = horiz ? x + rng(-1.4, 1.4) : x;
            const nz = horiz ? z : z + rng(-1.1, 1.1);
            if (Math.abs(nx) > 3.9 || Math.abs(nz) > 2.35) break;
            tracePos.push(x, 0.055, z, nx, 0.055, nz);
            x = nx;
            z = nz;
            path.push(new THREE.Vector3(x, 0.07, z));
        }
        if (path.length > 1) tracePaths.push(path);
    }
    const traceGeo = new THREE.BufferGeometry();
    traceGeo.setAttribute('position', new THREE.Float32BufferAttribute(tracePos, 3));
    pcb.add(new THREE.LineSegments(
        traceGeo,
        new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.42 })
    ));

    const eCount = isMobile ? 16 : 42;
    const electrons = [];
    const eGeo = new THREE.SphereGeometry(0.032, 8, 8);
    for (let i = 0; i < eCount && tracePaths.length; i++) {
        const mat = new THREE.MeshBasicMaterial({
            color: i % 3 === 0 ? 0x00d4ff : 0x00ff88,
        });
        const mesh = new THREE.Mesh(eGeo, mat);
        pcb.add(mesh);
        electrons.push({
            mesh,
            path: tracePaths[i % tracePaths.length],
            t: Math.random(),
            speed: 0.22 + Math.random() * 0.45,
        });
    }

    /* Pads */
    const padGeo = new THREE.CircleGeometry(0.045, 10);
    const padMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37, metalness: 1, roughness: 0.2, emissive: 0x3a2a00, emissiveIntensity: 0.3,
    });
    padGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 70; i++) {
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(rng(-3.8, 3.8), 0.052, rng(-2.3, 2.3));
        pcb.add(pad);
    }

    /* Chips on board */
    const stm = createChip({ w: 1.35, h: 0.16, d: 1.35, color: 0x1a1f2e, name: 'STM32', emissive: 0x001122 });
    stm.position.set(0.15, 0.13, 0.1);
    pcb.add(stm);

    const rp = createChip({ w: 1.05, h: 0.14, d: 1.05, color: 0x4a1020, name: 'RP2350', emissive: 0x2a0610 });
    rp.position.set(-2.15, 0.12, 0.55);
    pcb.add(rp);

    const dds = createChip({ w: 0.85, h: 0.12, d: 0.55, color: 0x142018, name: 'AD9833', emissive: 0x002210 });
    dds.position.set(2.2, 0.11, -0.9);
    pcb.add(dds);

    const esp = createChip({ w: 0.95, h: 0.12, d: 0.7, color: 0x1a2230, name: 'ESP32', emissive: 0x001830 });
    esp.position.set(2.05, 0.11, 1.15);
    pcb.add(esp);

    CHIP_MAP.stm32 = stm;
    CHIP_MAP.rp2350 = rp;
    CHIP_MAP.ad9833 = dds;
    CHIP_MAP.esp32 = esp;

    /* USB-C */
    const usb = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.12, 0.55, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x8a93a0, metalness: 0.9, roughness: 0.25 })
    );
    usb.rotation.z = Math.PI / 2;
    usb.position.set(-4.05, 0.1, 0);
    pcb.add(usb);

    /* Pin headers */
    const hdrGeo = new THREE.BoxGeometry(0.08, 0.28, 2.2);
    const hdrMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.2, roughness: 0.6 });
    const hdrL = new THREE.Mesh(hdrGeo, hdrMat);
    hdrL.position.set(-3.4, 0.18, 0);
    pcb.add(hdrL);
    const hdrR = hdrL.clone();
    hdrR.position.set(3.4, 0.18, 0);
    pcb.add(hdrR);

    /* Crystal */
    const xtal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16),
        new THREE.MeshStandardMaterial({ color: 0xc0c8d0, metalness: 0.85, roughness: 0.2 })
    );
    xtal.position.set(-0.95, 0.12, -1.55);
    pcb.add(xtal);

    /* Status LEDs */
    const leds = [];
    const ledColors = [0x00ff88, 0x00d4ff, 0xffd700, 0xc51a4a];
    ledColors.forEach((c, i) => {
        const led = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 12, 12),
            new THREE.MeshStandardMaterial({
                color: c, emissive: c, emissiveIntensity: 1.4, roughness: 0.2, metalness: 0.1,
            })
        );
        led.position.set(1.1 + i * 0.28, 0.14, -2.05);
        pcb.add(led);
        leds.push(led);
    });

    /* Mounting holes + gold fingers + scan sweep */
    const holeGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 16);
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x0a0e14, metalness: 0.8, roughness: 0.3 });
    [[-3.7, -2.15], [3.7, -2.15], [-3.7, 2.15], [3.7, 2.15]].forEach(([hx, hz]) => {
        const hole = new THREE.Mesh(holeGeo, holeMat);
        hole.position.set(hx, 0.02, hz);
        pcb.add(hole);
    });
    const fingerGeo = new THREE.BoxGeometry(0.12, 0.02, 0.42);
    const fingerMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37, metalness: 1, roughness: 0.15, emissive: 0x3a2a00, emissiveIntensity: 0.35,
    });
    for (let i = 0; i < 8; i++) {
        const f = new THREE.Mesh(fingerGeo, fingerMat);
        f.position.set(4.02, 0.06, -1.4 + i * 0.4);
        pcb.add(f);
    }
    const scan = new THREE.Mesh(
        new THREE.PlaneGeometry(8.15, 0.04),
        new THREE.MeshBasicMaterial({
            color: 0x00d4ff, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false,
        })
    );
    scan.rotation.x = Math.PI / 2;
    scan.position.y = 0.12;
    pcb.add(scan);

    /* 3D oscilloscope — AD9833 function generator */
    const scope = new THREE.Group();
    scope.position.set(2.15, 0.92, -0.9);
    pcb.add(scope);
    const scopePts = isMobile ? 64 : 120;
    const scopeArr = new Float32Array(scopePts * 3);
    const scopeGeo = new THREE.BufferGeometry();
    scopeGeo.setAttribute('position', new THREE.BufferAttribute(scopeArr, 3));
    const scopeLine = new THREE.Line(
        scopeGeo,
        new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.95 })
    );
    scope.add(scopeLine);
    const scopeFrame = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.7, 0.78)),
        new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.55 })
    );
    scope.add(scopeFrame);
    const scopeLbl = makeLabel('DDS  SCOPE', '#00d4ff', 0.55);
    scopeLbl.position.set(0, 0.52, 0);
    scope.add(scopeLbl);

    /* ---------- Floating skill orbs ---------- */
    const orbs = new THREE.Group();
    lab.add(orbs);

    const skillData = [
        { name: 'TinyML', color: 0x7c3aed, section: 'ai' },
        { name: 'ROS2', color: 0xf59e0b, section: 'ai' },
        { name: 'OpenCV', color: 0x00d4ff, section: 'ai' },
        { name: 'Kotlin', color: 0x7c3aed, section: 'skills' },
        { name: 'KiCad', color: 0x00ff88, section: 'circuits' },
        { name: 'Pi', color: 0xc51a4a, section: 'raspberrypi' },
    ];

    const icoGeo = new THREE.IcosahedronGeometry(0.32, 0);
    skillData.forEach((s, i) => {
        const g = new THREE.Group();
        const mesh = new THREE.Mesh(
            icoGeo,
            new THREE.MeshStandardMaterial({
                color: s.color,
                emissive: s.color,
                emissiveIntensity: 0.55,
                metalness: 0.35,
                roughness: 0.25,
                wireframe: i % 2 === 0,
            })
        );
        g.add(mesh);
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.48, 0.012, 8, 48),
            new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.7 })
        );
        ring.rotation.x = Math.PI / 2.4;
        g.add(ring);
        const lbl = makeLabel(s.name, '#' + s.color.toString(16).padStart(6, '0'), 0.72);
        lbl.position.y = 0.7;
        g.add(lbl);
        const angle = (i / skillData.length) * Math.PI * 2;
        g.userData = { angle, radius: 4.6, speed: 0.12 + i * 0.01, bob: i, section: s.section, name: s.name };
        orbs.add(g);
        CHIP_MAP[s.name.toLowerCase()] = g;
    });

    /* ---------- Neural net (AI zone) ---------- */
    const net = new THREE.Group();
    net.position.set(0, 2.35, 0);
    lab.add(net);

    const layers = [5, 7, 6, 4];
    const nodes = [];
    const nodeGeo = new THREE.SphereGeometry(0.055, 10, 10);
    layers.forEach((count, li) => {
        for (let n = 0; n < count; n++) {
            const node = new THREE.Mesh(
                nodeGeo,
                new THREE.MeshStandardMaterial({
                    color: 0xa78bfa, emissive: 0x7c3aed, emissiveIntensity: 0.8,
                })
            );
            node.position.set(
                (li - 1.5) * 0.85,
                (n - (count - 1) / 2) * 0.38,
                0
            );
            net.add(node);
            nodes.push({ mesh: node, li, n });
        }
    });
    const netLines = [];
    const nPos = [];
    nodes.forEach((a) => {
        nodes.forEach((b) => {
            if (b.li === a.li + 1 && Math.random() > 0.45) {
                nPos.push(a.mesh.position.x, a.mesh.position.y, a.mesh.position.z);
                nPos.push(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z);
            }
        });
    });
    const nGeo = new THREE.BufferGeometry();
    nGeo.setAttribute('position', new THREE.Float32BufferAttribute(nPos, 3));
    const nLine = new THREE.LineSegments(
        nGeo,
        new THREE.LineBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.22 })
    );
    net.add(nLine);
    netLines.push(nLine);

    /* ---------- Particles ---------- */
    const pCount = isMobile ? 280 : 900;
    const pGeo = new THREE.BufferGeometry();
    const pArr = new Float32Array(pCount * 3);
    const pCol = new Float32Array(pCount * 3);
    const palette = [
        new THREE.Color(0x00ff88),
        new THREE.Color(0x00d4ff),
        new THREE.Color(0x7c3aed),
        new THREE.Color(0xffd700),
        new THREE.Color(0xc51a4a),
    ];
    for (let i = 0; i < pCount; i++) {
        pArr[i * 3] = rng(-18, 18);
        pArr[i * 3 + 1] = rng(-4, 14);
        pArr[i * 3 + 2] = rng(-16, 16);
        const c = palette[i % palette.length];
        pCol[i * 3] = c.r;
        pCol[i * 3 + 1] = c.g;
        pCol[i * 3 + 2] = c.b;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    const points = new THREE.Points(
        pGeo,
        new THREE.PointsMaterial({
            size: isMobile ? 0.035 : 0.045,
            vertexColors: true,
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
        })
    );
    scene.add(points);

    /* Binary rain */
    const rainCount = isMobile ? 70 : 200;
    const rainArr = new Float32Array(rainCount * 3);
    const rainVel = new Float32Array(rainCount);
    for (let i = 0; i < rainCount; i++) {
        rainArr[i * 3] = rng(-16, 16);
        rainArr[i * 3 + 1] = rng(-2, 14);
        rainArr[i * 3 + 2] = rng(-14, 10);
        rainVel[i] = 0.4 + Math.random() * 1.6;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainArr, 3));
    const rain = new THREE.Points(
        rainGeo,
        new THREE.PointsMaterial({
            color: 0x00ff88,
            size: 0.05,
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
        })
    );
    scene.add(rain);

    /* ---------- Grid / rings ---------- */
    const grid = new THREE.GridHelper(40, 40, 0x00ff88, 0x0a2218);
    grid.position.y = -2.2;
    grid.material.transparent = true;
    grid.material.opacity = 0.18;
    scene.add(grid);

    const halo = new THREE.Mesh(
        new THREE.TorusGeometry(5.6, 0.018, 8, 120),
        new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.35 })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.02;
    lab.add(halo);

    const halo2 = halo.clone();
    halo2.scale.set(1.18, 1.18, 1.18);
    halo2.material = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.18 });
    lab.add(halo2);

    /* ---------- Bloom (optional — addons need the HTML import map) ---------- */
    let composer = null;
    if (state.bloom) {
        Promise.all([
            import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js'),
            import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js'),
            import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js'),
        ]).then(([{ EffectComposer }, { RenderPass }, { UnrealBloomPass }]) => {
            composer = new EffectComposer(renderer);
            composer.addPass(new RenderPass(scene, camera));
            const bloom = new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                0.88, 0.48, 0.55
            );
            composer.addPass(bloom);
            state._bloom = bloom;
            composer.setSize(window.innerWidth, window.innerHeight);
        }).catch(() => {
            composer = null;
            state.bloom = false;
        });
    }

    /* ---------- Camera from scroll ---------- */
    const camCurve = new THREE.CatmullRomCurve3(
        SECTION_STATIONS.map((s) => new THREE.Vector3().fromArray(s.pos)),
        false, 'catmullrom', 0.18
    );
    const lookCurve = new THREE.CatmullRomCurve3(
        SECTION_STATIONS.map((s) => new THREE.Vector3().fromArray(s.look)),
        false, 'catmullrom', 0.18
    );

    function updateScroll() {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        state.scroll = Math.min(1, Math.max(0, window.scrollY / max));
        if (state.inspect) return;
        camCurve.getPoint(state.scroll, camPos);
        lookCurve.getPoint(state.scroll, camLook);
    }

    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();

    window.addEventListener('mousemove', (e) => {
        if (!state.orbit.dragging) {
            state.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            state.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        } else {
            const dx = e.clientX - state.orbit.lx;
            const dy = e.clientY - state.orbit.ly;
            state.orbit.yaw -= dx * 0.005;
            state.orbit.pitch = Math.max(0.12, Math.min(1.15, state.orbit.pitch + dy * 0.004));
            state.orbit.lx = e.clientX;
            state.orbit.ly = e.clientY;
        }
        if (tooltip) {
            tooltip.style.left = e.clientX + 16 + 'px';
            tooltip.style.top = e.clientY + 16 + 'px';
        }
    }, { passive: true });

    window.addEventListener('mousedown', (e) => {
        if (!state.inspect) return;
        if (e.target.closest('a, button, input, textarea, nav, .lab-dock, .chip-inspect')) return;
        state.orbit.dragging = true;
        state.orbit.lx = e.clientX;
        state.orbit.ly = e.clientY;
    });
    window.addEventListener('mouseup', () => { state.orbit.dragging = false; });

    window.addEventListener('deviceorientation', (e) => {
        if (e.gamma == null || state.inspect) return;
        state.targetMouse.x = Math.max(-1, Math.min(1, e.gamma / 35));
        state.targetMouse.y = Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 40));
    }, { passive: true });

    /* ---------- Raycaster ---------- */
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pickables = [...orbs.children, stm, rp, dds, esp];

    function pick(e) {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(pickables, true);
        if (!hits.length) {
            state.hovered = null;
            if (tooltip) tooltip.classList.remove('show');
            return;
        }
        let obj = hits[0].object;
        while (obj && !obj.userData.section && !CHIP_MAP[obj.name?.toLowerCase()]) {
            obj = obj.parent;
        }
        if (!obj) {
            state.hovered = null;
            if (tooltip) tooltip.classList.remove('show');
            return;
        }
        state.hovered = obj;
        const label = obj.userData.name || obj.name;
        if (tooltip && label) {
            tooltip.textContent = label + (obj.userData.section ? '  →  warp' : '  →  inspect');
            tooltip.classList.add('show');
        }
    }

    window.addEventListener('mousemove', pick, { passive: true });
    window.addEventListener('click', (e) => {
        if (e.target.closest('a, button, input, textarea, .nav-links, .lab-dock, .chip-inspect')) return;
        if (!state.hovered) return;
        const sec = state.hovered.userData.section;
        if (sec) {
            const el = document.getElementById(sec);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        const key = (state.hovered.name || state.hovered.userData.name || '').toLowerCase();
        if (CHIP_INFO[key]) openChipPanel(key);
    });

    const CHIP_INFO = {
        stm32: {
            title: 'STM32',
            meta: 'MCU  ·  Cortex-M  ·  Vi Microsystems',
            body: 'Workhorse controller on the lab PCB — F / H / N6 series firmware, timers, DMA, and analog front-ends for the function generator and EV kit.',
        },
        rp2350: {
            title: 'RP2350',
            meta: 'Pico 2  ·  Raspberry Pi Approved',
            body: 'Indoor AI Environment Board silicon. Dual-core with on-chip TinyML inference for air quality, humidity, and CO₂ — no cloud required.',
        },
        ad9833: {
            title: 'AD9833',
            meta: 'DDS  ·  3 MHz → 10 MHz',
            body: 'Direct digital synthesis behind the lab-grade function generator. Sine, square, and triangle up to 3 MHz today — 10 MHz successor in progress.',
        },
        esp32: {
            title: 'ESP32',
            meta: 'Wi-Fi  ·  BLE  ·  IoT',
            body: 'Wireless bridge to Android (Kotlin) dashboards — live sensor streams, relay control, and waveform preview over BLE / Classic.',
        },
    };

    function openChipPanel(key) {
        const info = CHIP_INFO[key];
        const panel = document.getElementById('chip-inspect');
        if (!info || !panel) return;
        document.getElementById('inspect-title').textContent = info.title;
        document.getElementById('inspect-meta').textContent = info.meta;
        document.getElementById('inspect-body').textContent = info.body;
        panel.classList.add('open');
        highlight(key);
    }

    function closeChipPanel() {
        const panel = document.getElementById('chip-inspect');
        if (panel) panel.classList.remove('open');
        highlight(null);
    }
    document.getElementById('inspect-close')?.addEventListener('click', closeChipPanel);

    const LIGHT_KEYS = [
        [0x00ff88, 0x00d4ff, 0xc51a4a],
        [0x00d4ff, 0x7c3aed, 0x00ff88],
        [0x7c3aed, 0x00d4ff, 0xffd700],
        [0x00ff88, 0xd4af37, 0x00d4ff],
        [0xc51a4a, 0xff6b9d, 0x00ff88],
        [0xa78bfa, 0x00d4ff, 0x7c3aed],
        [0x00d4ff, 0x00ff88, 0xf59e0b],
        [0x00ff88, 0x00d4ff, 0x7c3aed],
    ];
    const cA = new THREE.Color();
    const cB = new THREE.Color();

    /* ---------- Highlight API ---------- */
    function highlight(key) {
        Object.values(CHIP_MAP).forEach((g) => {
            g.scale.setScalar(1);
        });
        if (!key) {
            state.highlight = null;
            return;
        }
        const g = CHIP_MAP[String(key).toLowerCase()];
        if (g) {
            state.highlight = g;
            g.scale.setScalar(1.12);
        }
    }

    /* ---------- Quality ---------- */
    function setQuality(q) {
        state.quality = q;
        const high = q === 'high';
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 1.6 : 1));
        if (state._bloom) state._bloom.strength = high ? 0.88 : 0.28;
        document.body.classList.toggle('lab-low', !high);
        const btn = document.getElementById('qualityToggle');
        if (btn) btn.textContent = high ? 'Quality · High' : 'Quality · Low';
    }

    function togglePause() {
        state.paused = !state.paused;
        const btn = document.getElementById('motionToggle');
        if (btn) btn.textContent = state.paused ? 'Motion · Off' : 'Motion · On';
    }

    function toggleInspect() {
        state.inspect = !state.inspect;
        document.body.classList.toggle('lab-inspect', state.inspect);
        const btn = document.getElementById('inspectToggle');
        if (btn) btn.textContent = state.inspect ? 'Inspect · On' : 'Inspect · Off';
        if (!state.inspect) updateScroll();
    }

    let audioCtl = null;
    function toggleSound() {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtl) {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            osc.type = 'sine';
            osc.frequency.value = 78;
            osc2.type = 'triangle';
            osc2.frequency.value = 156;
            filter.type = 'lowpass';
            filter.frequency.value = 380;
            gain.gain.value = 0.028;
            osc.connect(filter);
            osc2.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc2.start();
            audioCtl = { ctx, gain, on: true };
        } else {
            audioCtl.on = !audioCtl.on;
            if (audioCtl.ctx.state === 'suspended') audioCtl.ctx.resume();
            audioCtl.gain.gain.value = audioCtl.on ? 0.028 : 0;
        }
        state.sound = !!(audioCtl && audioCtl.on);
        const btn = document.getElementById('soundToggle');
        if (btn) btn.textContent = state.sound ? 'Sound · On' : 'Sound · Off';
    }

    window.AB3D = { highlight, setQuality, togglePause, toggleInspect, toggleSound, openChipPanel, closeChipPanel, state };

    /* ---------- Resize ---------- */
    function onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        if (composer) composer.setSize(w, h);
    }
    window.addEventListener('resize', onResize, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) state._wasPaused = state.paused, state.paused = true;
        else if (state._wasPaused === false) state.paused = false;
    });

    /* ---------- Animate ---------- */
    let frames = 0;
    let fpsT = 0;
    let fps = 60;

    function tick() {
        requestAnimationFrame(tick);
        const dt = Math.min(0.05, state.clock.getDelta());
        const t = state.clock.elapsedTime;

        frames++;
        fpsT += dt;
        if (fpsT >= 0.5) {
            fps = Math.round(frames / fpsT);
            frames = 0;
            fpsT = 0;
            const fpsEl = document.getElementById('hud-fps');
            if (fpsEl) fpsEl.textContent = String(fps);
        }

        if (!state.paused && !reduced) {
            if (!state.inspect) {
                pcb.rotation.y = Math.sin(t * 0.15) * 0.08;
                lab.rotation.y += dt * 0.04;
            }

            orbs.children.forEach((g) => {
                const u = g.userData;
                u.angle += dt * u.speed;
                g.position.set(
                    Math.cos(u.angle) * u.radius,
                    1.15 + Math.sin(t * 0.9 + u.bob) * 0.28,
                    Math.sin(u.angle) * u.radius * 0.72
                );
                g.rotation.y += dt * 0.6;
                g.rotation.x += dt * 0.2;
            });

            halo.rotation.z = t * 0.08;
            halo2.rotation.z = -t * 0.05;
            net.rotation.y = Math.sin(t * 0.2) * 0.25;
            points.rotation.y = t * 0.012;
            scan.position.z = Math.sin(t * 0.55) * 2.15;

            leds.forEach((led, i) => {
                led.material.emissiveIntensity = 0.7 + Math.sin(t * 4 + i * 1.3) * 0.7;
            });

            nodes.forEach((n, i) => {
                n.mesh.material.emissiveIntensity = 0.45 + Math.sin(t * 3.2 + i * 0.4) * 0.55;
            });

            electrons.forEach((el) => {
                const path = el.path;
                if (!path || path.length < 2) return;
                el.t += dt * el.speed;
                if (el.t > path.length - 1) el.t = 0;
                const i0 = Math.floor(el.t);
                const i1 = Math.min(path.length - 1, i0 + 1);
                const k = el.t - i0;
                el.mesh.position.lerpVectors(path[i0], path[i1], k);
            });

            const wave = Math.floor(t / 4) % 3;
            for (let i = 0; i < scopePts; i++) {
                const x = (i / (scopePts - 1) - 0.5) * 1.52;
                const ph = i * 0.32 + t * 7;
                let y = Math.sin(ph);
                if (wave === 1) y = Math.sign(Math.sin(ph));
                if (wave === 2) y = (2 / Math.PI) * Math.asin(Math.sin(ph));
                scopeArr[i * 3] = x;
                scopeArr[i * 3 + 1] = y * 0.24;
                scopeArr[i * 3 + 2] = 0;
            }
            scopeGeo.attributes.position.needsUpdate = true;
            scope.rotation.y = Math.sin(t * 0.4) * 0.15;

            for (let i = 0; i < rainCount; i++) {
                rainArr[i * 3 + 1] -= rainVel[i] * dt;
                if (rainArr[i * 3 + 1] < -3) rainArr[i * 3 + 1] = 14;
            }
            rainGeo.attributes.position.needsUpdate = true;

            key.intensity = 16 + Math.sin(t * 0.7) * 3;
            rim.intensity = 8 + Math.sin(t * 1.1) * 2.5;

            const n = LIGHT_KEYS.length - 1;
            const f = state.scroll * n;
            const i = Math.min(n - 1, Math.floor(f));
            const k = f - i;
            cA.setHex(LIGHT_KEYS[i][0]).lerp(cB.setHex(LIGHT_KEYS[i + 1][0]), k);
            key.color.copy(cA);
            mouseLight.color.copy(cA);
            cA.setHex(LIGHT_KEYS[i][1]).lerp(cB.setHex(LIGHT_KEYS[i + 1][1]), k);
            fill.color.copy(cA);
            cA.setHex(LIGHT_KEYS[i][2]).lerp(cB.setHex(LIGHT_KEYS[i + 1][2]), k);
            rim.color.copy(cA);
        }

        state.mouse.x += (state.targetMouse.x - state.mouse.x) * 0.045;
        state.mouse.y += (state.targetMouse.y - state.mouse.y) * 0.045;

        mouseTarget.position.set(state.mouse.x * 4.2, 0.1, -state.mouse.y * 3.2);
        mouseLight.position.set(state.mouse.x * 2.4, 7.2, 4.5);

        if (state.inspect) {
            const r = 7.4;
            const yaw = state.orbit.yaw;
            const pitch = state.orbit.pitch;
            camPos.set(
                Math.sin(yaw) * Math.cos(pitch) * r,
                Math.sin(pitch) * r + 0.8,
                Math.cos(yaw) * Math.cos(pitch) * r
            );
            camLook.set(0, 0.15, 0);
        }

        camPosLerp.lerp(camPos, state.inspect ? 0.08 : 0.045);
        camLookLerp.lerp(camLook, 0.05);
        camera.position.copy(camPosLerp);
        if (!state.inspect) {
            camera.position.x += state.mouse.x * 0.85;
            camera.position.y += state.mouse.y * 0.45;
        }
        camera.lookAt(camLookLerp);
        if (!state.paused && !reduced) {
            camera.fov = 48 + Math.sin(t * 0.25) * 0.8;
            camera.updateProjectionMatrix();
        }

        if (state.highlight) {
            const s = 1.08 + Math.sin(t * 3) * 0.05;
            state.highlight.scale.setScalar(s);
        }

        const camEl = document.getElementById('hud-cam');
        if (camEl) {
            camEl.textContent =
                camera.position.x.toFixed(1) + '  ' +
                camera.position.y.toFixed(1) + '  ' +
                camera.position.z.toFixed(1);
        }
        const scrEl = document.getElementById('hud-scroll');
        if (scrEl) scrEl.textContent = state.inspect ? 'INSPECT' : Math.round(state.scroll * 100) + '%';
        const bar = document.getElementById('scroll-progress');
        if (bar) bar.style.transform = 'scaleX(' + state.scroll + ')';

        if (composer && state.quality === 'high') composer.render();
        else renderer.render(scene, camera);
    }

    /* ---------- Boot then go ---------- */
    let step = 0;
    const bootTimer = setInterval(() => {
        logBoot(step, Math.round(((step + 1) / bootLines.length) * 100));
        step++;
        if (step >= bootLines.length) {
            clearInterval(bootTimer);
            setTimeout(dismissLoader, 420);
        }
    }, 220);

    setTimeout(dismissLoader, 3200);

    state.ready = true;
    tick();
})();
