// ============================================================
// FLOATING PARTICLE CONSTELLATION BACKGROUND
// ============================================================
(function () {
    const canvas = document.getElementById('tech-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H;
    let mouse = { x: -9999, y: -9999 };

    const PARTICLE_COUNT = 110;
    const CONNECTION_DIST = 140;   // max px to draw a line
    const MOUSE_REPEL_DIST = 120;  // mouse repulsion radius
    const MOUSE_REPEL_FORCE = 2.2;
    const SPEED_MAX = 0.45;
    const DOT_RADIUS_MIN = 1.2;
    const DOT_RADIUS_MAX = 2.4;

    // Color palette: subtle warm-white particles
    const PARTICLE_COLOR = [220, 215, 205];

    class Particle {
        constructor() { this.reset(true); }
        reset(initial) {
            this.x = Math.random() * W;
            this.y = initial ? Math.random() * H : (Math.random() < 0.5 ? -10 : H + 10);
            this.vx = (Math.random() - 0.5) * SPEED_MAX * 2;
            this.vy = (Math.random() - 0.5) * SPEED_MAX * 2;
            this.r = DOT_RADIUS_MIN + Math.random() * (DOT_RADIUS_MAX - DOT_RADIUS_MIN);
            this.baseOpacity = 0.25 + Math.random() * 0.45;
            this.opacity = this.baseOpacity;
        }
        update() {
            // Mouse repulsion
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MOUSE_REPEL_DIST && dist > 0) {
                const force = (1 - dist / MOUSE_REPEL_DIST) * MOUSE_REPEL_FORCE;
                this.vx += (dx / dist) * force * 0.06;
                this.vy += (dy / dist) * force * 0.06;
            }

            // Dampen velocity to prevent runaway
            this.vx *= 0.992;
            this.vy *= 0.992;

            // Clamp speed
            const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (spd > SPEED_MAX) { this.vx = (this.vx / spd) * SPEED_MAX; this.vy = (this.vy / spd) * SPEED_MAX; }
            if (spd < 0.05) { this.vx += (Math.random() - 0.5) * 0.04; this.vy += (Math.random() - 0.5) * 0.04; }

            this.x += this.vx;
            this.y += this.vy;

            // Wrap edges
            if (this.x < -20) this.x = W + 20;
            if (this.x > W + 20) this.x = -20;
            if (this.y < -20) this.y = H + 20;
            if (this.y > H + 20) this.y = -20;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${PARTICLE_COLOR[0]},${PARTICLE_COLOR[1]},${PARTICLE_COLOR[2]},${this.opacity})`;
            ctx.fill();
        }
    }

    let particles = [];

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
        // Rebuild particles on resize
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());
    }

    function connectParticles() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CONNECTION_DIST) {
                    const alpha = (1 - dist / CONNECTION_DIST) * 0.18;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(${PARTICLE_COLOR[0]},${PARTICLE_COLOR[1]},${PARTICLE_COLOR[2]},${alpha})`;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        particles.forEach(p => { p.update(); p.draw(); });
        connectParticles();

        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

    resize();
    draw();
})();

// Smooth scrolling for anchor links is handled by CSS scroll-behavior
// Add simple reveal animations on scroll

document.addEventListener('DOMContentLoaded', () => {
    // Mobile Nav Hamburger Toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navLinksContainer = document.querySelector('.nav-links');
    const navLinks = document.querySelectorAll('.nav-links a');

    if (navToggle && navLinksContainer) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinksContainer.classList.toggle('active');
            
            // Prevent body scroll when menu is active
            if (navLinksContainer.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });

        // Close menu on link click
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinksContainer.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // Typing Effect for Hero Subtitle
    const typingElement = document.querySelector('.typing-text');
    if (typingElement) {
        const text = typingElement.getAttribute('data-text');
        const decodedText = text.replace(/&amp;/g, '&');
        typingElement.textContent = '';
        
        let i = 0;
        function typeWriter() {
            if (i < decodedText.length) {
                typingElement.textContent += decodedText.charAt(i);
                i++;
                setTimeout(typeWriter, 35); // 35ms typing speed
            } else {
                // Add blinking cursor
                typingElement.innerHTML += '<span class="cursor">|</span>';
            }
        }
        
        // Start typing after the heading starts fading up
        setTimeout(typeWriter, 500);
    }

    // Scroll-reveal observer for .reveal elements
    const revealObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // Also reveal all .tech-card elements with stagger
    const techCards = document.querySelectorAll('.tech-card:not(.reveal)');
    techCards.forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        el.style.transition = `opacity .5s ease ${i * 0.08}s, transform .5s ease ${i * 0.08}s`;
        const cardObs = new IntersectionObserver((entries, o) => {
            entries.forEach(e => {
                if (e.isIntersecting) { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; o.unobserve(el); }
            });
        }, { threshold: 0.1 });
        cardObs.observe(el);
    });

    // Custom Cursor Logic
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorBubble = document.querySelector('.cursor-bubble');
    
    if (cursorDot && cursorBubble) {
        let mouseX = 0;
        let mouseY = 0;
        let bubbleX = 0;
        let bubbleY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            // Move dot instantly
            cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
        });

        // Smooth follow for the bubble
        function animateBubble() {
            // Easing factor (0.15 means 15% of the distance per frame)
            bubbleX += (mouseX - bubbleX) * 0.15;
            bubbleY += (mouseY - bubbleY) * 0.15;
            
            cursorBubble.style.transform = `translate(${bubbleX}px, ${bubbleY}px) translate(-50%, -50%)`;
            
            requestAnimationFrame(animateBubble);
        }
        animateBubble();

        // Add hover effects for clickable elements
        const clickables = document.querySelectorAll('a, button, input, textarea, .btn, .tech-card, .social-icon');
        clickables.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursorBubble.classList.add('hover-effect');
            });
            el.addEventListener('mouseleave', () => {
                cursorBubble.classList.remove('hover-effect');
            });
        });
    }

    // Admin & Live Edit Mode Logic
    let isAdmin = sessionStorage.getItem('adminLoggedIn') === 'true';

    // Load saved edits from localStorage
    function loadEdits() {
        const editables = document.querySelectorAll('[data-edit-id]');
        editables.forEach(el => {
            const id = el.getAttribute('data-edit-id');
            const saved = localStorage.getItem('siteEdit_' + id);
            if (saved) {
                el.innerHTML = saved;
            }
        });
    }

    function enableEditMode() {
        isAdmin = true;
        sessionStorage.setItem('adminLoggedIn', 'true');
        
        const adminBtn = document.getElementById('admin-trigger');
        if(adminBtn) {
            adminBtn.innerHTML = '[ EXIT ADMIN MODE ]';
            adminBtn.style.boxShadow = '0 0 30px rgba(255, 50, 50, 0.6)';
            adminBtn.style.color = '#ff5f56';
            adminBtn.style.borderColor = '#ff5f56';
        }

        const editables = document.querySelectorAll('[data-edit-id]');
        editables.forEach(el => {
            el.setAttribute('contenteditable', 'true');
            el.style.borderBottom = '1px dashed var(--accent)';
            el.style.outline = 'none';
            
            // Save on blur
            el.addEventListener('blur', () => {
                const id = el.getAttribute('data-edit-id');
                localStorage.setItem('siteEdit_' + id, el.innerHTML);
                
                // Visual feedback
                el.style.backgroundColor = 'rgba(223, 128, 255, 0.2)';
                setTimeout(() => { el.style.backgroundColor = 'transparent'; }, 300);
            });
        });
    }

    function disableEditMode() {
        isAdmin = false;
        sessionStorage.setItem('adminLoggedIn', 'false');
        window.location.reload(); 
    }

    // Run on load
    loadEdits();
    if (isAdmin) enableEditMode();

    const adminTrigger = document.getElementById('admin-trigger');
    const adminModal = document.getElementById('admin-modal');
    const closeModal = document.getElementById('close-modal');
    const adminForm = document.getElementById('admin-form');
    const adminError = document.getElementById('admin-error');

    if (adminTrigger && adminModal) {
        adminTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            if (isAdmin) {
                disableEditMode();
            } else {
                adminModal.classList.add('active');
                adminError.style.display = 'none';
            }
        });

        closeModal.addEventListener('click', () => {
            adminModal.classList.remove('active');
        });

        adminModal.addEventListener('click', (e) => {
            if (e.target === adminModal) {
                adminModal.classList.remove('active');
            }
        });

        adminForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('admin-user').value;
            const pass = document.getElementById('admin-pass').value;

            if (user === 'admin' && pass === '123') {
                alert('Access Granted. You can now click on text to edit the page!');
                adminModal.classList.remove('active');
                adminForm.reset();
                enableEditMode();
            } else {
                adminError.style.display = 'block';
            }
        });
    }

    // =============================================
    // CERTIFICATE LIGHTBOX MODAL LOGIC
    // =============================================
    const certImages = document.querySelectorAll('#certificates .project-img');
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDesc = document.getElementById('lightbox-desc');
    const lightboxDownload = document.getElementById('lightbox-download');
    const closeLightbox = document.getElementById('close-lightbox');

    if (certImages.length > 0 && lightboxModal) {
        certImages.forEach(imgContainer => {
            // Suggest zoom-in hover cursor only on the image
            imgContainer.style.cursor = 'zoom-in';
            
            imgContainer.addEventListener('click', () => {
                const card = imgContainer.closest('.project-card');
                const img = imgContainer.querySelector('img');
                const title = card ? card.querySelector('.project-info h3') : null;
                const desc = card ? card.querySelector('.project-info p:not(.project-num)') : null;
                
                if (img) {
                    lightboxImg.src = img.src;
                    lightboxImg.alt = img.alt || 'Certificate Preview';
                    lightboxTitle.textContent = title ? title.textContent : '';
                    lightboxDesc.textContent = desc ? desc.textContent : '';
                    
                    if (lightboxDownload) {
                        lightboxDownload.href = img.src;
                        const filename = title ? title.textContent.trim().replace(/[^a-zA-Z0-9]/g, '_') : 'certificate';
                        lightboxDownload.download = filename;
                    }
                    
                    lightboxModal.classList.add('active');
                    
                    // Add subtle scale transition
                    document.body.style.overflow = 'hidden'; // Prevent background scrolling
                }
            });
        });

        // Close functions
        const closeOverlay = () => {
            lightboxModal.classList.remove('active');
            document.body.style.overflow = '';
        };

        closeLightbox.addEventListener('click', closeOverlay);

        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) {
                closeOverlay();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightboxModal.classList.contains('active')) {
                closeOverlay();
            }
        });
    }
});

// Global contact click handler with email clipboard backup
function handleContactClick() {
    const email = "kaavyananda2007@gmail.com";
    
    // 1. Copy to clipboard quietly first so it succeeds before frame navigation
    navigator.clipboard.writeText(email).then(() => {
        // 2. Try opening the user's native mail application normally
        window.location.href = `mailto:${email}`;
        
        // 3. Fallback alert box
        setTimeout(() => {
            alert("Opening your mail app! If it didn't open, the email address (kaavyananda2007@gmail.com) has been automatically copied to your clipboard.");
        }, 500);
    }).catch(err => {
        console.error("Could not copy text: ", err);
        // Direct fallback mailto in case of clipboard failure
        window.location.href = `mailto:${email}`;
    });
}
