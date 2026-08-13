/*!
 * Access Binary — studio interactions
 * Lenis, GSAP ticker, blur text, magnetic talk, form, tabs
 */
(function () {
    'use strict';

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Loader already handled in scene. Fallback: */
    window.addEventListener('load', () => {
        setTimeout(() => document.getElementById('loader')?.classList.add('done'), 400);
    });

    /* Lenis + GSAP */
    let lenis;
    if (window.Lenis && !reduced) {
        lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
        if (window.gsap && window.ScrollTrigger) {
            gsap.registerPlugin(ScrollTrigger);
            lenis.on('scroll', ScrollTrigger.update);
        }
    }

    document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
            const el = document.querySelector(a.getAttribute('href'));
            if (!el) return;
            e.preventDefault();
            if (lenis) lenis.scrollTo(el, { offset: -20 });
            else el.scrollIntoView({ behavior: 'smooth' });
            document.getElementById('navLinks')?.classList.remove('open');
        });
    });

    document.getElementById('navToggler')?.addEventListener('click', () => {
        document.getElementById('navLinks')?.classList.toggle('open');
    });

    /* Studio cursor */
    const fine = matchMedia('(pointer: fine)').matches;
    const dot = document.querySelector('.cur-dot');
    const ring = document.querySelector('.cur-ring');
    if (fine && dot && ring) {
        let x = 0, y = 0, rx = 0, ry = 0;
        window.addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
        (function loop() {
            rx += (x - rx) * 0.16;
            ry += (y - ry) * 0.16;
            dot.style.left = x + 'px';
            dot.style.top = y + 'px';
            ring.style.left = rx + 'px';
            ring.style.top = ry + 'px';
            requestAnimationFrame(loop);
        })();
        document.querySelectorAll('a, button, #mark-hit').forEach((el) => {
            el.addEventListener('mouseenter', () => document.body.classList.add('is-hover'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('is-hover'));
        });
    }

    /* Blur-in characters for hero */
    const heroLines = document.querySelectorAll('[data-split]');
    heroLines.forEach((el) => {
        const text = el.textContent;
        el.textContent = '';
        [...text].forEach((ch, i) => {
            const s = document.createElement('span');
            s.textContent = ch === ' ' ? '\u00A0' : ch;
            s.style.display = 'inline-block';
            s.style.filter = 'blur(12px)';
            s.style.opacity = '0';
            s.style.transition = `opacity 0.7s ease ${0.9 + i * 0.035}s, filter 0.7s ease ${0.9 + i * 0.035}s`;
            el.appendChild(s);
        });
    });
    requestAnimationFrame(() => {
        document.querySelectorAll('[data-split] span').forEach((s) => {
            s.style.opacity = '1';
            s.style.filter = 'blur(0)';
        });
    });

    /* Scroll reveal */
    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (en.isIntersecting) {
                    en.target.classList.add('in');
                    io.unobserve(en.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        reveals.forEach((el) => io.observe(el));
    } else {
        reveals.forEach((el) => el.classList.add('in'));
    }

    /* Tabs */
    document.querySelectorAll('.tabs button').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tabs button').forEach((b) => b.classList.remove('on'));
            document.querySelectorAll('.panel').forEach((p) => p.classList.remove('on'));
            btn.classList.add('on');
            document.getElementById('tab-' + btn.dataset.tab)?.classList.add('on');
        });
    });

    /* Form */
    const form = document.getElementById('contactForm');
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('emailInput');
        if (!email?.value.includes('@')) { email?.focus(); return; }
        document.getElementById('formSuccess')?.classList.add('show');
        form.reset();
    });

    /* Hover sound — tiny click, only after gesture */
    let ctx;
    function tick() {
        try {
            ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = 420;
            g.gain.value = 0.03;
            o.connect(g); g.connect(ctx.destination);
            o.start();
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
            o.stop(ctx.currentTime + 0.09);
        } catch (_) { /* ignore */ }
    }
    document.getElementById('mark-hit')?.addEventListener('pointerdown', tick);
})();
