/*!
 * ACCESS BINARY — Abin Antony Portfolio
 * scripts.js — Particles, typewriter, skill bars,
 *              tabs, scroll reveal, form, navbar
 */
(function () {
    'use strict';

    /* ============================================================
       1. PAGE LOAD FADE-IN
    ============================================================ */
    document.body.classList.add('loading');
    window.addEventListener('load', () => {
        document.body.classList.remove('loading');
        document.body.classList.add('loaded');
    });

    setTimeout(() => {
        const boot = document.getElementById('boot-loader');
        if (boot && !boot.classList.contains('boot-done')) {
            boot.classList.add('boot-done');
            document.body.classList.add('lab-live');
        }
        const heroVid = document.querySelector('.hero-video');
        if (heroVid && document.body.classList.contains('lab-live')) {
            heroVid.pause();
        }
    }, 4800);

    /* ============================================================
       2. NAVBAR — scroll class + scroll-to-top
    ============================================================ */
    const nav = document.getElementById('mainNav');
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    function handleScroll() {
        nav.classList.toggle('scrolled', window.scrollY > 60);
        if (scrollTopBtn) {
            scrollTopBtn.classList.toggle('visible', window.scrollY > 500);
        }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /* ============================================================
       3. MOBILE NAV TOGGLE
    ============================================================ */
    const navToggler = document.getElementById('navToggler');
    const navLinks = document.getElementById('navLinks');

    if (navToggler && navLinks) {
        navToggler.addEventListener('click', (e) => {
            e.stopPropagation();
            navToggler.classList.toggle('open');
            navLinks.classList.toggle('open');
        });

        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navToggler.classList.remove('open');
                navLinks.classList.remove('open');
            });
        });

        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target)) {
                navToggler.classList.remove('open');
                navLinks.classList.remove('open');
            }
        });
    }

    /* ============================================================
       4. ACTIVE NAV LINK — INtersectionObserver ScrollSpy
    ============================================================ */
    const sections = document.querySelectorAll('[id]');
    const navItems = document.querySelectorAll('.nav-link');

    const spyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navItems.forEach(link => {
                    const isActive = link.getAttribute('href') === `#${entry.target.id}`;
                    link.classList.toggle('active', isActive);
                });
            }
        });
    }, { rootMargin: '-35% 0px -60% 0px' });

    sections.forEach(s => spyObserver.observe(s));

    /* ============================================================
       5. SMOOTH SCROLL
    ============================================================ */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    /* ============================================================
       6. TYPEWRITER — hero terminal
    ============================================================ */
    const typeEl = document.getElementById('typewriter');
    const phrases = [
        'R&D_engineer',
        'hardware_designer.pcb',
        'embedded_systems_dev',
        'android_developer.kotlin',
        'ros_robotics_builder',
        'tinyml_at_edge',
        'vision_ai_engineer',
        'vi_microsystems.chennai',
    ];

    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let typingTimeout;

    function type() {
        if (!typeEl) return;
        const currentPhrase = phrases[phraseIdx];

        if (!deleting) {
            typeEl.textContent = currentPhrase.substring(0, charIdx + 1);
            charIdx++;
            if (charIdx === currentPhrase.length) {
                deleting = true;
                typingTimeout = setTimeout(type, 2000);
                return;
            }
        } else {
            typeEl.textContent = currentPhrase.substring(0, charIdx - 1);
            charIdx--;
            if (charIdx === 0) {
                deleting = false;
                phraseIdx = (phraseIdx + 1) % phrases.length;
            }
        }

        const speed = deleting ? 45 : 80;
        typingTimeout = setTimeout(type, speed);
    }

    setTimeout(type, 800);

    /* ============================================================
       7. SCROLL REVEAL — IntersectionObserver
    ============================================================ */
    const revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Stagger siblings
                const siblings = entry.target.parentElement
                    ? [...entry.target.parentElement.children].filter(el =>
                        el.classList.contains('reveal-up') ||
                        el.classList.contains('reveal-left') ||
                        el.classList.contains('reveal-right')
                    )
                    : [];
                const delay = siblings.indexOf(entry.target) * 90;

                setTimeout(() => {
                    entry.target.classList.add('in-view');
                }, delay);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    revealEls.forEach(el => revealObserver.observe(el));

    /* ============================================================
       8. SKILL BARS — animate width when in view
    ============================================================ */
    const skillBars = document.querySelectorAll('.skill-bar-fill');

    const barObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bar = entry.target;
                const targetWidth = bar.getAttribute('data-width');
                setTimeout(() => {
                    bar.style.width = targetWidth + '%';
                }, 150);
                barObserver.unobserve(bar);
            }
        });
    }, { threshold: 0.3 });

    skillBars.forEach(bar => barObserver.observe(bar));

    /* ============================================================
       9. TAB SWITCHING — Projects section
    ============================================================ */
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = 'tab-' + btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const panel = document.getElementById(targetId);
            if (panel) {
                panel.classList.add('active');
                // Re-trigger reveal for newly shown panel
                panel.querySelectorAll('.reveal-up, .reveal-left, .reveal-right').forEach(el => {
                    el.classList.remove('in-view');
                    revealObserver.observe(el);
                });
            }
        });
    });

    /* ============================================================
       10. CONTACT FORM
    ============================================================ */
    const form = document.getElementById('contactForm');
    const formSuccess = document.getElementById('formSuccess');
    const submitBtn = document.getElementById('submitButton');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('emailInput');

            if (!email || !email.value.includes('@')) {
                if (email) {
                    email.focus();
                    email.style.borderColor = '#f43f5e';
                    email.style.boxShadow = '0 0 0 2px rgba(244,63,94,0.2)';
                    setTimeout(() => {
                        email.style.borderColor = '';
                        email.style.boxShadow = '';
                    }, 2500);
                }
                return;
            }

            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.75';
            }

            setTimeout(() => {
                if (formSuccess) formSuccess.classList.add('show');
                form.reset();
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '';
                }
            }, 1400);
        });
    }

    /* ============================================================
       11. 3D LAB UI — cursor, tilt, magnets, HUD, keys
    ============================================================ */
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const orbitRing = document.getElementById('orbitRing');
    if (orbitRing) {
        const orbitItems = ['STM32', 'RP2350', 'AD9833', 'ESP32', 'TinyML', 'ROS2', 'OpenCV', 'Kotlin', 'KiCad', 'CAN'];
        const radius = Math.min(240, window.innerWidth * 0.32);
        orbitItems.forEach((name, i) => {
            const el = document.createElement('span');
            el.className = 'orbit-item';
            el.textContent = name;
            const angle = (i / orbitItems.length) * 360;
            el.style.transform = `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${radius}px)`;
            orbitRing.appendChild(el);
        });
    }

    if (!reducedMotion) {
        document.querySelectorAll('.tilt-3d').forEach((card) => {
            card.addEventListener('mousemove', (e) => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;
                const py = (e.clientY - r.top) / r.height;
                const rx = (0.5 - py) * 11;
                const ry = (px - 0.5) * 14;
                card.style.transform = `perspective(980px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(10px)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });

        document.querySelectorAll('.btn-primary-glow, .btn-ghost').forEach((btn) => {
            btn.addEventListener('mousemove', (e) => {
                const r = btn.getBoundingClientRect();
                const dx = e.clientX - r.left - r.width / 2;
                const dy = e.clientY - r.top - r.height / 2;
                btn.style.transform = `translate(${dx * 0.22}px, ${dy * 0.22}px)`;
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
            });
        });
    }

    document.querySelectorAll('[data-chip]').forEach((el) => {
        el.addEventListener('mouseenter', () => {
            if (window.AB3D) window.AB3D.highlight(el.getAttribute('data-chip'));
        });
        el.addEventListener('mouseleave', () => {
            if (window.AB3D) window.AB3D.highlight(null);
        });
    });

    const qualityBtn = document.getElementById('qualityToggle');
    const motionBtn = document.getElementById('motionToggle');
    const exploreBtn = document.getElementById('exploreLab');

    if (window.innerWidth < 768 && qualityBtn) qualityBtn.textContent = 'Quality · Low';
    if (reducedMotion && motionBtn) motionBtn.textContent = 'Motion · Off';

    if (qualityBtn) {
        qualityBtn.addEventListener('click', () => {
            if (!window.AB3D) return;
            const next = window.AB3D.state.quality === 'high' ? 'low' : 'high';
            window.AB3D.setQuality(next);
        });
    }
    if (motionBtn) {
        motionBtn.addEventListener('click', () => {
            if (window.AB3D) window.AB3D.togglePause();
        });
    }
    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            document.getElementById('circuits')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    const inspectBtn = document.getElementById('inspectToggle');
    const soundBtn = document.getElementById('soundToggle');
    const heroInspect = document.getElementById('heroInspect');
    if (inspectBtn) inspectBtn.addEventListener('click', () => window.AB3D?.toggleInspect());
    if (soundBtn) soundBtn.addEventListener('click', () => window.AB3D?.toggleSound());
    if (heroInspect) {
        heroInspect.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => window.AB3D?.toggleInspect(), 200);
        });
    }

    const sectionKeys = ['about', 'skills', 'circuits', 'raspberrypi', 'ai', 'projects', 'contact'];
    window.addEventListener('keydown', (e) => {
        if (e.target.matches && e.target.matches('input, textarea')) return;
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 7) {
            document.getElementById(sectionKeys[n - 1])?.scrollIntoView({ behavior: 'smooth' });
        }
        if (e.key === 'q' || e.key === 'Q') {
            if (window.AB3D) {
                window.AB3D.setQuality(window.AB3D.state.quality === 'high' ? 'low' : 'high');
            }
        }
        if (e.key === 'm' || e.key === 'M') {
            if (window.AB3D) window.AB3D.togglePause();
        }
        if (e.key === 'g' || e.key === 'G') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (e.key === 'i' || e.key === 'I') {
            if (window.AB3D) window.AB3D.toggleInspect();
        }
        if (e.key === 's' || e.key === 'S') {
            if (window.AB3D) window.AB3D.toggleSound();
        }
        if (e.key === 'Escape') {
            if (window.AB3D?.state?.inspect) window.AB3D.toggleInspect();
            window.AB3D?.closeChipPanel?.();
        }
    });

    /* ============================================================
       12. PARTICLE CANVAS — circuit-dot network in hero
    ============================================================ */
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animFrame;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function spawnParticles() {
        particles = [];
        const count = Math.min(Math.floor(canvas.width / 12), 90);

        for (let i = 0; i < count; i++) {
            // Electronics-theme colors
            const palette = [
                '0, 255, 136',     // circuit green
                '0, 212, 255',     // electric cyan
                '255, 215, 0',     // electric yellow
                '124, 58, 237',    // purple
            ];
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 2 + 1,
                color: palette[Math.floor(Math.random() * palette.length)],
                opacity: Math.random() * 0.5 + 0.15,
                // Some particles are "square" (circuit pads), rest are round
                square: Math.random() < 0.25,
            });
        }
    }

    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            // Update position
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            // Connecting lines (circuit traces look)
            for (let j = i + 1; j < particles.length; j++) {
                const q = particles[j];
                const dx = p.x - q.x;
                const dy = p.y - q.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 110) {
                    const alpha = (1 - dist / 110) * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    ctx.strokeStyle = `rgba(0, 255, 136, ${alpha})`;
                    ctx.lineWidth = 0.7;
                    ctx.stroke();
                }
            }

            // Draw particle
            ctx.beginPath();
            if (p.square) {
                const s = p.r * 2;
                ctx.rect(p.x - s / 2, p.y - s / 2, s, s);
            } else {
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            }
            ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
            ctx.fill();
        }

        animFrame = requestAnimationFrame(drawParticles);
    }

    function initParticles() {
        resize();
        spawnParticles();
        if (animFrame) cancelAnimationFrame(animFrame);
        drawParticles();
    }

    // Pause particles when hero is off-screen (performance)
    const heroEl = document.getElementById('hero');
    const particleObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!animFrame) drawParticles();
            } else {
                if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
            }
        });
    }, { threshold: 0 });

    if (heroEl) particleObserver.observe(heroEl);

    initParticles();
    window.addEventListener('resize', initParticles, { passive: true });

    /* ============================================================
       12. HERO VIDEO PARALLAX
    ============================================================ */
    const heroVideo = document.querySelector('.hero-video');
    const hero = document.getElementById('hero');
    if (heroVideo && hero) {
        window.addEventListener('scroll', () => {
            const y = window.scrollY;
            if (y < hero.offsetHeight) {
                heroVideo.style.transform = `scale(1.05) translateY(${y * 0.22}px)`;
            }
        }, { passive: true });
    }

})();