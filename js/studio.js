/*!
 * Access Binary — studio interactions
 * Lenis, GSAP ticker, blur text, magnetic talk, form, tabs
 */
(function () {
    'use strict';

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Loader */
    const loader = document.getElementById('loader');
    const loaderNum = document.getElementById('loader-num');
    let pct = 0;
    const boot = setInterval(() => {
        pct = Math.min(100, pct + 7 + Math.random() * 8);
        if (loaderNum) loaderNum.textContent = String(Math.floor(pct)).padStart(2, '0');
        if (pct >= 100) {
            clearInterval(boot);
            loader?.classList.add('done');
        }
    }, 55);
    window.addEventListener('load', () => {
        setTimeout(() => loader?.classList.add('done'), 900);
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
        document.querySelectorAll('a, button').forEach((el) => {
            el.addEventListener('mouseenter', () => document.body.classList.add('is-hover'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('is-hover'));
        });
    }

    /* Hero line fade — keep words intact, no mid-word wrap */
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

    /* Form — opens mail to the live address */
    const form = document.getElementById('contactForm');
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('emailInput');
        if (!email?.value.includes('@')) { email?.focus(); return; }
        const name = document.getElementById('nameInput')?.value || '';
        const subject = document.getElementById('subjectInput')?.value || 'hi from the site';
        const message = document.getElementById('messageInput')?.value || '';
        const body = encodeURIComponent(`From: ${name} <${email.value}>\n\n${message}`);
        window.location.href = `mailto:abin@accessbinary.in?subject=${encodeURIComponent(subject)}&body=${body}`;
        document.getElementById('formSuccess')?.classList.add('show');
        form.reset();
    });

})();
