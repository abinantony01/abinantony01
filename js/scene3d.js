/**
 * Access Binary — studio mark
 * Hold-to-blast panels, magnetic hover, scroll explode.
 * Quiet materials. No neon HUD.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

(function () {
    const canvas = document.getElementById('webgl-world');
    const hit = document.getElementById('mark-hit');
    const loader = document.getElementById('loader');
    const loaderNum = document.getElementById('loader-num');
    if (!canvas) return;

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = innerWidth < 768;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
    } catch {
        if (loader) loader.classList.add('done');
        return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 40);
    camera.position.set(0, 0.08, 6.6);

    function sizeToStage() {
        const host = canvas.parentElement;
        const w = Math.max(1, host?.clientWidth || innerWidth);
        const h = Math.max(1, host?.clientHeight || innerHeight);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
    }
    sizeToStage();
    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
        new ResizeObserver(sizeToStage).observe(canvas.parentElement);
    }

    scene.add(new THREE.AmbientLight(0x2a2622, 0.55));
    const key = new THREE.DirectionalLight(0xffe6c4, 1.85);
    key.position.set(3.2, 4.4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8a9aaa, 0.55);
    fill.position.set(-4, 1.2, 2);
    scene.add(fill);
    const rim = new THREE.PointLight(0xc47a3a, 8, 14, 2);
    rim.position.set(0, -1.4, 3);
    scene.add(rim);

    const mark = new THREE.Group();
    scene.add(mark);

    const A = [
        '0010100',
        '0100010',
        '1000001',
        '1000001',
        '1111111',
        '1000001',
        '1000001',
    ];
    const geo = new THREE.BoxGeometry(0.38, 0.08, 0.38);
    const fr4 = new THREE.MeshStandardMaterial({ color: 0x1a6b3c, metalness: 0.22, roughness: 0.52, emissive: 0x062214, emissiveIntensity: 0.18 });
    const copper = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.82, roughness: 0.28 });
    const panels = [];
    A.forEach((row, r) => {
        [...row].forEach((ch, c) => {
            if (ch !== '1') return;
            const mesh = new THREE.Mesh(geo, r === 4 ? copper : fr4);
            const x = (c - 3) * 0.46;
            const y = (3 - r) * 0.46;
            mesh.position.set(x, y, 0);
            const dir = new THREE.Vector3(x, y, (Math.random() - 0.5) * 2).normalize();
            mesh.userData = {
                home: new THREE.Vector3(x, y, 0),
                dir,
                spin: new THREE.Vector3((Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 1.4),
            };
            mark.add(mesh);
            panels.push(mesh);
        });
    });

    const sparks = [];
    const sGeo = new THREE.SphereGeometry(0.018, 6, 6);
    const sMat = new THREE.MeshBasicMaterial({ color: 0xffc14d });
    for (let i = 0; i < (mobile ? 18 : 40); i++) {
        const s = new THREE.Mesh(sGeo, sMat);
        s.visible = false;
        mark.add(s);
        sparks.push({ mesh: s, v: new THREE.Vector3(), life: 0 });
    }

    const st = {
        explode: 0,
        hold: 0,
        holding: false,
        charged: false,
        holdMs: 0,
        hover: 0,
        mouse: { x: 0, y: 0 },
        target: { x: 0, y: 0 },
        scroll: 0,
    };

    const clock = new THREE.Clock();
    const tmp = new THREE.Vector3();

    function spawnSparks() {
        sparks.forEach((s) => {
            s.mesh.position.set((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.2, 0.2);
            s.v.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, Math.random() * 3);
            s.life = 0.5 + Math.random() * 0.6;
            s.mesh.visible = true;
        });
    }

    function setCharge(on) {
        document.body.classList.toggle('is-charging', on);
    }

    if (hit) {
        hit.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            st.holding = true;
            st.holdMs = 0;
            st.charged = false;
        });
        hit.addEventListener('pointerenter', () => { st.hover = 1; });
        hit.addEventListener('pointerleave', () => { st.hover = 0; });
    }
    window.addEventListener('pointerup', () => {
        st.holding = false;
        st.charged = false;
        setCharge(false);
    });
    window.addEventListener('pointermove', (e) => {
        const box = (hit || canvas).getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        st.target.x = Math.max(-1, Math.min(1, (e.clientX - cx) / Math.max(1, box.width / 2)));
        st.target.y = Math.max(-1, Math.min(1, -(e.clientY - cy) / Math.max(1, box.height / 2)));
    }, { passive: true });
    window.addEventListener('resize', sizeToStage, { passive: true });

    window.AB3D = st;

    function tick() {
        requestAnimationFrame(tick);
        const dt = Math.min(0.05, clock.getDelta());
        const t = clock.elapsedTime;

        if (st.holding) {
            st.holdMs += dt * 1000;
            if (st.holdMs > 480 && !st.charged) {
                st.charged = true;
                setCharge(true);
                spawnSparks();
            }
            const after = Math.max(0, st.holdMs - 480) / 700;
            st.hold += (Math.min(1, after) - st.hold) * 0.12;
        } else {
            st.hold += (0 - st.hold) * 0.08;
        }

        st.explode += (Math.max(st.hold, st.hover * 0.08) - st.explode) * 0.08;

        st.mouse.x += (st.target.x - st.mouse.x) * 0.06;
        st.mouse.y += (st.target.y - st.mouse.y) * 0.06;

        if (!reduced) {
            mark.rotation.y = Math.sin(t * 0.22) * 0.18 + st.mouse.x * 0.25;
            mark.rotation.x = Math.sin(t * 0.17) * 0.08 - st.mouse.y * 0.18;
        }

        panels.forEach((p, i) => {
            const u = p.userData;
            const amp = st.explode * (1.6 + (i % 5) * 0.12);
            tmp.copy(u.home).addScaledVector(u.dir, amp * 2.4);
            tmp.z += amp * 1.1;
            p.position.lerp(tmp, 0.12);
            p.rotation.x = u.spin.x * st.explode;
            p.rotation.y = u.spin.y * st.explode;
            p.rotation.z = u.spin.z * st.explode * 0.6;
        });

        sparks.forEach((s) => {
            if (!s.mesh.visible) return;
            s.life -= dt;
            s.mesh.position.addScaledVector(s.v, dt);
            s.v.y -= 2.4 * dt;
            if (s.life <= 0) s.mesh.visible = false;
        });

        camera.position.x += (st.mouse.x * 0.35 - camera.position.x) * 0.04;
        camera.position.y += (0.15 + st.mouse.y * 0.2 - camera.position.y) * 0.04;
        camera.lookAt(0, 0.1, 0);

        renderer.render(scene, camera);
    }

    let pct = 0;
    const boot = setInterval(() => {
        pct = Math.min(100, pct + (mobile ? 8 : 4) + Math.random() * 6);
        if (loaderNum) loaderNum.textContent = String(Math.floor(pct)).padStart(2, '0');
        if (pct >= 100) {
            clearInterval(boot);
            setTimeout(() => loader && loader.classList.add('done'), 220);
        }
    }, 70);
    setTimeout(() => loader && loader.classList.add('done'), 2400);

    tick();
})();
