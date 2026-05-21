/**
 * VISCOUS OBSIDIAN INFINITY LOOP
 * Pure Three.js WebGL — no React/framework required.
 * Lemniscate path → TubeGeometry → Custom ShaderMaterial
 * Features:
 *   - Polished pitch-black obsidian with clearcoat sheen
 *   - Vertex shader: Simplex-noise–style micro-ripples flowing along the tube
 *   - Mouse proximity creates localised magnetic distortion that lerps back to rest
 *   - Smooth 60fps requestAnimationFrame loop
 */

(function () {
  'use strict';

  /* ─── Wait for Three.js to load ────────────────────────────────────── */
  function waitForThree(cb) {
    if (window.THREE) { cb(); return; }
    const t = setInterval(() => { if (window.THREE) { clearInterval(t); cb(); } }, 50);
  }

  waitForThree(initInfinityLoop);

  function initInfinityLoop() {
    const THREE = window.THREE;

    /* ─── Container ─────────────────────────────────────────────────── */
    const container = document.getElementById('infinity-loop-container');
    if (!container) return;

    /* ─── Renderer ──────────────────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    container.appendChild(renderer.domElement);

    /* ─── Scene & Camera ────────────────────────────────────────────── */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 4.2);

    /* ─── Lights ────────────────────────────────────────────────────── */
    // Main rim light — cool silver-blue
    const rimLight = new THREE.DirectionalLight(0xc8d4ff, 5.5);
    rimLight.position.set(5, 5, 3);
    scene.add(rimLight);

    // Subtle warm fill
    const fillLight = new THREE.DirectionalLight(0xffd0a0, 1.8);
    fillLight.position.set(-4, -2, 2);
    scene.add(fillLight);

    // Point light — small bright highlight to create the wet sheen
    const sheenLight = new THREE.PointLight(0xffffff, 6.0, 14);
    sheenLight.position.set(1.5, 2, 2.5);
    scene.add(sheenLight);

    // Left-side accent
    const accentLight = new THREE.PointLight(0x88aaff, 2.5, 10);
    accentLight.position.set(-3, 1, 1.5);
    scene.add(accentLight);

    // Ambient
    scene.add(new THREE.AmbientLight(0x0a0a14, 1.0));

    /* ─── Lemniscate (∞) Curve ──────────────────────────────────────── */
    // Bernoulli lemniscate parametrised in 3D with a gentle tilt
    class LemniscateCurve extends THREE.Curve {
      constructor(scale = 1.8) {
        super();
        this.scale = scale;
      }
      getPoint(t, optionalTarget = new THREE.Vector3()) {
        const a = this.scale;
        const angle = t * Math.PI * 2;
        const denom = 1 + Math.sin(angle) * Math.sin(angle);
        const x = (a * Math.cos(angle)) / denom;
        const y = (a * Math.sin(angle) * Math.cos(angle)) / denom;
        // Gentle Z wave so the tube has a 3-D figure-8 quality
        const z = 0.35 * Math.sin(angle * 2);
        return optionalTarget.set(x, y, z);
      }
    }

    const curve = new LemniscateCurve(2.55);
    const TUBE_SEGMENTS = 400;
    const RADIAL_SEGMENTS = 64;
    const TUBE_RADIUS = 0.30;

    const tubeGeo = new THREE.TubeGeometry(
      curve,
      TUBE_SEGMENTS,
      TUBE_RADIUS,
      RADIAL_SEGMENTS,
      true   // closed
    );

    /* ─── Custom ShaderMaterial (viscous obsidian) ──────────────────── */
    /*
     * Vertex shader:
     *   – Passes UV + world-space normal
     *   – Adds Simplex-like periodic noise displacement along the tube
     *     (approximated with 4 overlapping sine waves for zero GLSL deps)
     *   – Reads a mouse uniform to warp vertices near the cursor projection
     *
     * Fragment shader:
     *   – Physically-inspired Blinn-Phong with clearcoat gloss
     *   – Very dark base color with a deep indigo sub-surface scatter tint
     *   – Fresnel rim to sell the wet-glass look
     */
    const vertexShader = /* glsl */`
      uniform float uTime;
      uniform vec2  uMouse;       // NDC [-1,1]
      uniform float uMousePower;  // lerped 0→1
      uniform float uFlowSpeed;

      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec2 vUv;
      varying float vDistort;

      // 4-wave pseudo-noise — cheap & deterministic
      float flowNoise(vec3 p, float t) {
        float n = sin(p.x * 3.1 + t * 1.3) * cos(p.y * 2.7 - t * 0.9)
                + sin(p.y * 4.2 + t * 0.7) * cos(p.z * 3.8 + t * 1.1)
                + sin(p.z * 2.9 - t * 1.5) * cos(p.x * 3.5 - t * 0.6)
                + sin((p.x + p.z) * 2.3 + t * 0.5) * 0.5;
        return n * 0.25;
      }

      void main() {
        vUv = uv;

        // Flow distortion along the tube (ripple traveling around the loop)
        float flow = uTime * uFlowSpeed;
        float d = flowNoise(position, flow);

        // Mouse magnetic distortion:
        // project this vertex to clip space, compare to mouse NDC
        vec4 clipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec2 ndc = clipPos.xy / clipPos.w;
        float mouseDist = length(ndc - uMouse);
        float mouseInfluence = uMousePower * smoothstep(0.8, 0.0, mouseDist) * 0.25;

        // Combine distortions along the vertex normal
        float totalDisplace = d * 0.018 + mouseInfluence;
        vDistort = totalDisplace;

        vec3 displacedPos = position + normal * totalDisplace;

        vNormal = normalize(normalMatrix * normal);
        vWorldPos = (modelMatrix * vec4(displacedPos, 1.0)).xyz;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPos, 1.0);
      }
    `;

    const fragmentShader = /* glsl */`
      uniform vec3  uCameraPos;
      uniform float uTime;

      varying vec3  vNormal;
      varying vec3  vWorldPos;
      varying vec2  vUv;
      varying float vDistort;

      // Lights baked from JS (avoids needing THREE.ShaderLib)
      struct DirLight { vec3 direction; vec3 color; };

      void main() {
        vec3 N = normalize(vNormal);
        vec3 V = normalize(uCameraPos - vWorldPos);

        /* ── Base obsidian color ── */
        // Near-black with a deep blue-indigo undertone (volcanic glass)
        vec3 baseColor = vec3(0.012, 0.012, 0.018);

        /* ── Clearcoat gloss (dual-lobe specular) ── */
        // Primary specular — tight, bright highlight
        vec3 L1 = normalize(vec3(5.0, 5.0, 3.0));
        float spec1 = pow(max(dot(reflect(-L1, N), V), 0.0), 200.0);
        vec3 specColor1 = vec3(0.95, 0.97, 1.0) * spec1 * 5.0;

        // Secondary specular — broader, warmer
        vec3 L2 = normalize(vec3(-4.0, -2.0, 2.0));
        float spec2 = pow(max(dot(reflect(-L2, N), V), 0.0), 35.0);
        vec3 specColor2 = vec3(0.85, 0.78, 0.68) * spec2 * 0.9;

        // Sheen light
        vec3 L3 = normalize(vec3(1.5, 2.0, 2.5));
        float spec3 = pow(max(dot(reflect(-L3, N), V), 0.0), 300.0);
        vec3 specColor3 = vec3(1.0, 1.0, 1.0) * spec3 * 7.0;

        // Left accent
        vec3 L4 = normalize(vec3(-3.0, 1.0, 1.5));
        float spec4 = pow(max(dot(reflect(-L4, N), V), 0.0), 80.0);
        vec3 specColor4 = vec3(0.55, 0.65, 1.0) * spec4 * 1.4;

        /* ── Diffuse ── */
        float diff = max(dot(N, L1), 0.0) * 0.06; // very subtle on obsidian

        /* ── Fresnel rim (liquid-glass edge) ── */
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.5);
        vec3 rimColor = vec3(0.25, 0.28, 0.38) * fresnel * 1.8;

        /* ── Sub-surface scatter tint on distorted areas ── */
        float sss = smoothstep(0.0, 0.02, abs(vDistort)) * 0.4;
        vec3 sssColor = vec3(0.05, 0.06, 0.12) * sss;

        /* ── Combine ── */
        vec3 color = baseColor
          + vec3(diff)
          + specColor1 + specColor2 + specColor3 + specColor4
          + rimColor
          + sssColor;

        // Subtle anisotropic shimmer along U
        float shimmer = sin(vUv.x * 140.0 + uTime * 1.0) * 0.01;
        color += vec3(shimmer * 0.3, shimmer * 0.3, shimmer * 0.5);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uMousePower: { value: 0 },
        uFlowSpeed: { value: 0.55 },
        uCameraPos: { value: camera.position },
      },
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(tubeGeo, material);
    // Match the reference: slight forward tilt, minimal Y lean
    mesh.rotation.x = 0.08;
    mesh.rotation.y = 0.04;
    scene.add(mesh);

    /* ─── Environment map (simple procedural for reflections) ──────── */
    // Use a CubeCamera for live reflections if EXT_frag_depth is available
    // For max compatibility we rely on the shader's analytical lights above.

    /* ─── Mouse tracking ────────────────────────────────────────────── */
    const mouse = { x: 0, y: 0, power: 0 };
    const targetMouse = { x: 0, y: 0, power: 0 };

    window.addEventListener('mousemove', (e) => {
      // Map to NDC relative to the container
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Check if cursor is anywhere near the container
      const inside =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;

      targetMouse.x = nx;
      targetMouse.y = ny;
      targetMouse.power = inside ? 1 : 0;
    });

    window.addEventListener('mouseleave', () => { targetMouse.power = 0; });

    /* ─── Resize ────────────────────────────────────────────────────── */
    let resizeTimeout;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }, 100);
    });
    resizeObserver.observe(container);

    /* ─── Gentle auto-rotation ──────────────────────────────────────── */
    const autoRotate = { y: 0, x: 0 };
    // Drift toward mouse influence when idle
    let lastMouseTime = 0;
    window.addEventListener('mousemove', () => { lastMouseTime = performance.now(); });

    /* ─── Animation Loop ────────────────────────────────────────────── */
    let raf;
    const clock = new THREE.Clock();

    function animate() {
      raf = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta ? Math.min(clock.getDelta(), 0.05) : 0.016;

      // Lerp mouse uniforms
      const lerpFactor = 0.06;
      mouse.x += (targetMouse.x - mouse.x) * lerpFactor;
      mouse.y += (targetMouse.y - mouse.y) * lerpFactor;
      mouse.power += (targetMouse.power - mouse.power) * lerpFactor;

      material.uniforms.uTime.value = elapsed;
      material.uniforms.uMouse.value.set(mouse.x, mouse.y);
      material.uniforms.uMousePower.value = mouse.power;

      // Slow continuous Y rotation + gentle bob
      const idle = (performance.now() - lastMouseTime) > 2500;
      const targetRotY = idle ? elapsed * 0.08 : mesh.rotation.y + (mouse.x * 0.25 - mesh.rotation.y) * 0.04;
      const targetRotX = 0.12 + (idle ? Math.sin(elapsed * 0.3) * 0.04 : mouse.y * 0.12);

      mesh.rotation.y += (targetRotY - mesh.rotation.y) * 0.02;
      mesh.rotation.x += (targetRotX - mesh.rotation.x) * 0.03;

      renderer.render(scene, camera);
    }

    animate();

    /* ─── Visibility optimization ───────────────────────────────────── */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); }
      else { clock.start(); animate(); }
    });
  }
})();
