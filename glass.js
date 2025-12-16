import * as THREE from "https://esm.sh/three@0.177.0";
import { EffectComposer } from "https://esm.sh/three@0.177.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://esm.sh/three@0.177.0/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "https://esm.sh/three@0.177.0/examples/jsm/postprocessing/ShaderPass.js";

const GlassEffect = {
    scene: null,
    camera: null,
    renderer: null,
    composer: null,
    customPass: null,
    backgroundTexture: null,
    backgroundMesh: null,
    aspect: 1,
    backgroundScene: null,
    backgroundCamera: null,
    isInitialized: false,

    init() {
        const canvas = document.getElementById("glassCanvas");
        if (!canvas) {
            console.error("Glass canvas element not found");
            return;
        }

        try {
            this.renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                alpha: true,
                premultipliedAlpha: false,
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.autoClear = false;
        } catch (error) {
            console.error("Failed to create WebGL renderer:", error);
            // Fallback: show canvas anyway
            canvas.style.opacity = "1";
            return;
        }

        this.aspect = window.innerWidth / (window.innerHeight || 1);

        this.backgroundScene = new THREE.Scene();
        this.backgroundCamera = new THREE.OrthographicCamera(
            -this.aspect,
            this.aspect,
            1,
            -1,
            0.1,
            10
        );
        this.backgroundCamera.position.z = 1;

        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(
            -this.aspect,
            this.aspect,
            1,
            -1,
            0.1,
            10
        );
        this.camera.position.z = 1;

        this.createGradientBackground();
        this.setupPostProcessing();

        window.addEventListener("resize", () => this.onWindowResize());

        this.isInitialized = true;
        this.render();

        // Fade in canvas after initialization
        requestAnimationFrame(() => {
            canvas.style.opacity = "1";
        });
    },

    getCSSVariable(varName, fallback) {
        const value = getComputedStyle(document.documentElement)
            .getPropertyValue(varName)
            .trim();
        return value || fallback;
    },

    blendColors(color1, color2, ratio) {
        const parseColor = (color) => {
            const hex = color.replace('#', '');
            return {
                r: parseInt(hex.substr(0, 2), 16),
                g: parseInt(hex.substr(2, 2), 16),
                b: parseInt(hex.substr(4, 2), 16)
            };
        };

        const c1 = parseColor(color1);
        const c2 = parseColor(color2);

        const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
        const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
        const b = Math.round(c1.b + (c2.b - c1.b) * ratio);

        return `rgb(${r}, ${g}, ${b})`;
    },

    createGradientBackground() {
        const canvas = document.createElement("canvas");
        const maxSize = 2048;
        let canvasWidth, canvasHeight;

        if (this.aspect >= 1) {
            canvasWidth = maxSize;
            canvasHeight = maxSize / this.aspect;
        } else {
            canvasWidth = maxSize * this.aspect;
            canvasHeight = maxSize;
        }

        canvas.width = Math.floor(canvasWidth);
        canvas.height = Math.floor(canvasHeight);

        const ctx = canvas.getContext("2d");
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius =
            Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height) /
            2;

        const style = document.documentElement.getAttribute("data-style");
        const isDark = document.documentElement.getAttribute("theme") === "dark";

        // Use white/gray colors instead of CSS variables
        const primaryBg = isDark ? "#141414" : "#f8f8f8";
        const cardBg = isDark ? "#191919" : "#ffffff";
        const accentColor = isDark ? "#ff7300" : "#ff7300";

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (style === "cherokee") {
            // Square gradient effect from center
            ctx.fillStyle = primaryBg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const squareSize = Math.min(canvas.width, canvas.height);
            const layers = 50;

            for (let i = 0; i < layers; i++) {
                const progress = i / layers;
                const size = squareSize * (1 - progress);
                const x = centerX - size / 2;
                const y = centerY - size / 2;

                let color;
                if (progress < 0.5) {
                    const t = progress * 2;
                    color = this.blendColors(primaryBg, cardBg, t);
                } else {
                    const t = (progress - 0.5) * 2;
                    color = this.blendColors(cardBg, primaryBg, t);
                }

                ctx.fillStyle = color;
                ctx.fillRect(x, y, size, size);
            }
        } else if (style === "glitch" || !style) {
            // Square gradient effect from center
            ctx.fillStyle = primaryBg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const squareSize = Math.min(canvas.width, canvas.height);
            const layers = 50;

            for (let i = 0; i < layers; i++) {
                const progress = i / layers;
                const size = squareSize * (1 - progress);
                const x = centerX - size / 2;
                const y = centerY - size / 2;

                let color;
                if (progress < 0.5) {
                    const t = progress * 2;
                    color = this.blendColors(primaryBg, cardBg, t);
                } else {
                    const t = (progress - 0.5) * 2;
                    color = this.blendColors(cardBg, primaryBg, t);
                }

                ctx.fillStyle = color;
                ctx.fillRect(x, y, size, size);
            }

            const hexToRgb = (hex) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result
                    ? {
                        r: parseInt(result[1], 16),
                        g: parseInt(result[2], 16),
                        b: parseInt(result[3], 16),
                    }
                    : { r: 255, g: 255, b: 255 };
            };
            const rgb = hexToRgb(accentColor);

            const gridSize = Math.min(canvas.width, canvas.height) / 5;

            const seededRandom = (seed) => {
                const x = Math.sin(seed) * 10000;
                return x - Math.floor(x);
            };

            const drawGeometricNode = (x, y, size, opacity) => {
                ctx.strokeStyle = isDark
                    ? `rgba(200, 200, 200, ${opacity * 0.6})`
                    : `rgba(100, 100, 100, ${opacity * 0.6})`;
                ctx.lineWidth = 1;

                ctx.strokeStyle = isDark
                    ? `rgba(180, 180, 180, ${opacity * 0.3})`
                    : `rgba(120, 120, 120, ${opacity * 0.3})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(x - size / 2.5, y - size / 2.5);
                ctx.lineTo(x + size / 2.5, y + size / 2.5);
                ctx.moveTo(x + size / 2.5, y - size / 2.5);
                ctx.lineTo(x - size / 2.5, y + size / 2.5);
                ctx.stroke();

                const innerSize = size * 0.45;
                ctx.strokeStyle = isDark
                    ? `rgba(200, 200, 200, ${opacity * 0.35})`
                    : `rgba(100, 100, 100, ${opacity * 0.35})`;
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    x - innerSize / 2,
                    y - innerSize / 2,
                    innerSize,
                    innerSize
                );

                ctx.fillStyle = isDark
                    ? `rgba(220, 220, 220, ${opacity * 0.7})`
                    : `rgba(80, 80, 80, ${opacity * 0.7})`;
                const cornerSize = 3;
                ctx.fillRect(
                    x - size / 2 - cornerSize / 2,
                    y - size / 2 - cornerSize / 2,
                    cornerSize,
                    cornerSize
                );
                ctx.fillRect(
                    x + size / 2 - cornerSize / 2,
                    y - size / 2 - cornerSize / 2,
                    cornerSize,
                    cornerSize
                );
                ctx.fillRect(
                    x - size / 2 - cornerSize / 2,
                    y + size / 2 - cornerSize / 2,
                    cornerSize,
                    cornerSize
                );
                ctx.fillRect(
                    x + size / 2 - cornerSize / 2,
                    y + size / 2 - cornerSize / 2,
                    cornerSize,
                    cornerSize
                );
            };

            // Main grid lines with varying sizes
            const gridSizes = [gridSize, gridSize * 2, gridSize * 0.5];
            const gridOpacities = [0.08, 0.12, 0.05];
            const gridDashes = [
                [8, 8],
                [12, 6],
                [4, 4],
            ];

            gridSizes.forEach((size, index) => {
                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${gridOpacities[index]})`;
                ctx.lineWidth = index === 1 ? 1.5 : 1;
                ctx.setLineDash(gridDashes[index]);

                for (let x = size; x < canvas.width; x += size) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, canvas.height);
                    ctx.stroke();
                }

                for (let y = size; y < canvas.height; y += size) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(canvas.width, y);
                    ctx.stroke();
                }
            });

            // Helper lines - diagonal and offset
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.04)`;
            ctx.lineWidth = 0.5;
            ctx.setLineDash([6, 12]);

            for (
                let i = -canvas.height;
                i < canvas.width + canvas.height;
                i += gridSize * 1.5
            ) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i + canvas.height, canvas.height);
                ctx.stroke();
            }

            for (
                let i = -canvas.width;
                i < canvas.width + canvas.height;
                i += gridSize * 1.5
            ) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(canvas.width, i + canvas.width);
                ctx.stroke();
            }

            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([]);

            for (let x = gridSize; x < canvas.width; x += gridSize) {
                for (let y = gridSize; y < canvas.height; y += gridSize) {
                    const seed = (x / gridSize) * 1000 + y / gridSize;
                    const rand = seededRandom(seed);

                    if (rand > 0.6) {
                        ctx.beginPath();
                        if (x < canvas.width - gridSize && seededRandom(seed + 1) > 0.5) {
                            ctx.moveTo(x, y);
                            ctx.lineTo(x + gridSize, y);
                        }
                        if (y < canvas.height - gridSize && seededRandom(seed + 2) > 0.5) {
                            ctx.moveTo(x, y);
                            ctx.lineTo(x, y + gridSize);
                        }
                        ctx.stroke();
                    }
                }
            }

            for (let x = gridSize; x < canvas.width; x += gridSize) {
                for (let y = gridSize; y < canvas.height; y += gridSize) {
                    const seed = (x / gridSize) * 1000 + y / gridSize;
                    const rand1 = seededRandom(seed);
                    const rand2 = seededRandom(seed + 100);

                    if (rand1 > 0.65) {
                        const distFromCenter = Math.sqrt(
                            Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                        );
                        const opacity = Math.max(
                            0.3,
                            1 - (distFromCenter / maxRadius) * 0.6
                        );
                        const sizeVariation = 0.8 + rand2 * 0.4;
                        const size = gridSize * 0.4 * sizeVariation;
                        drawGeometricNode(x, y, size, opacity);
                    }

                    if (rand1 < 0.3) {
                        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
                        ctx.beginPath();
                        ctx.arc(x, y, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        } else if (style === "waves") {
            // Square gradient effect from center
            ctx.fillStyle = primaryBg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const squareSize = Math.min(canvas.width, canvas.height);
            const layers = 50;

            for (let i = 0; i < layers; i++) {
                const progress = i / layers;
                const size = squareSize * (1 - progress);
                const x = centerX - size / 2;
                const y = centerY - size / 2;

                let color;
                if (progress < 0.5) {
                    const t = progress * 2;
                    color = this.blendColors(primaryBg, cardBg, t);
                } else {
                    const t = (progress - 0.5) * 2;
                    color = this.blendColors(cardBg, primaryBg, t);
                }

                ctx.fillStyle = color;
                ctx.fillRect(x, y, size, size);
            }

            const hexSize = Math.min(canvas.width, canvas.height) / 15;
            const hexHeight = hexSize * Math.sqrt(3);

            const hexToRgb = (hex) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result
                    ? {
                        r: parseInt(result[1], 16),
                        g: parseInt(result[2], 16),
                        b: parseInt(result[3], 16),
                    }
                    : { r: 255, g: 255, b: 255 };
            };
            const rgb = hexToRgb(accentColor);

            const drawHexagon = (x, y, size, opacity) => {
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    const hx = x + size * Math.cos(angle);
                    const hy = y + size * Math.sin(angle);
                    if (i === 0) ctx.moveTo(hx, hy);
                    else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.6
                    })`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            };

            for (let row = -1; row < canvas.height / hexHeight + 2; row++) {
                for (let col = -1; col < canvas.width / (hexSize * 1.5) + 2; col++) {
                    const x = col * hexSize * 1.5;
                    const y = row * hexHeight + ((col % 2) * hexHeight) / 2;
                    const distFromCenter = Math.sqrt(
                        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                    );
                    const opacity = Math.max(0.1, 1 - (distFromCenter / maxRadius) * 0.7);

                    if (Math.random() > 0.3) {
                        drawHexagon(x, y, hexSize * 0.5, opacity);
                    }
                }
            }
        } else if (style === "particles") {
            // Square gradient effect from center
            ctx.fillStyle = primaryBg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const squareSize = Math.min(canvas.width, canvas.height);
            const layers = 50;

            for (let i = 0; i < layers; i++) {
                const progress = i / layers;
                const size = squareSize * (1 - progress);
                const x = centerX - size / 2;
                const y = centerY - size / 2;

                let color;
                if (progress < 0.5) {
                    const t = progress * 2;
                    color = this.blendColors(primaryBg, cardBg, t);
                } else {
                    const t = (progress - 0.5) * 2;
                    color = this.blendColors(cardBg, primaryBg, t);
                }

                ctx.fillStyle = color;
                ctx.fillRect(x, y, size, size);
            }

            const particles = [];
            for (let i = 0; i < 200; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 4 + 1,
                    opacity: Math.random() * 0.8 + 0.2,
                });
            }

            particles.forEach((particle) => {
                const distFromCenter = Math.sqrt(
                    Math.pow(particle.x - centerX, 2) + Math.pow(particle.y - centerY, 2)
                );
                const opacityMod = 1 - (distFromCenter / maxRadius) * 0.5;
                ctx.fillStyle = isDark
                    ? `rgba(200, 200, 200, ${particle.opacity * opacityMod})`
                    : `rgba(100, 100, 100, ${particle.opacity * opacityMod})`;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            });

            const hexToRgb = (hex) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result
                    ? {
                        r: parseInt(result[1], 16),
                        g: parseInt(result[2], 16),
                        b: parseInt(result[3], 16),
                    }
                    : { r: 255, g: 255, b: 255 };
            };
            const rgb = hexToRgb(accentColor);
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`;
            ctx.lineWidth = 1;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 100) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        } else if (style === "minimal") {
            // Square gradient effect from center
            ctx.fillStyle = primaryBg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const squareSize = Math.min(canvas.width, canvas.height);
            const layers = 50;

            for (let i = 0; i < layers; i++) {
                const progress = i / layers;
                const size = squareSize * (1 - progress);
                const x = centerX - size / 2;
                const y = centerY - size / 2;

                let color;
                if (progress < 0.5) {
                    const t = progress * 2;
                    color = this.blendColors(primaryBg, cardBg, t);
                } else {
                    const t = (progress - 0.5) * 2;
                    color = this.blendColors(cardBg, primaryBg, t);
                }

                ctx.fillStyle = color;
                ctx.fillRect(x, y, size, size);
            }

            const hexToRgb = (hex) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result
                    ? {
                        r: parseInt(result[1], 16),
                        g: parseInt(result[2], 16),
                        b: parseInt(result[3], 16),
                    }
                    : { r: 255, g: 255, b: 255 };
            };
            const rgb = hexToRgb(accentColor);

            const seededRandom = (seed) => {
                const x = Math.sin(seed) * 1;
                return x - Math.floor(x);
            };

            const gridSpacing = Math.min(canvas.width, canvas.height) / 10;

            // Main grid with varying opacity based on distance from center
            for (let x = 10; x < canvas.width; x += gridSpacing) {
                const distX = Math.abs(x - centerX) / centerX;
                const opacity = 0.1 + (1 - distX) * 0.1;
                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
                ctx.lineWidth = 1;
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }

            for (let y = 10; y < canvas.height; y += gridSpacing) {
                const distY = Math.abs(y - centerY) / centerY;
                const opacity = 0.04 + (1 - distY) * 0.06;
                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
                ctx.lineWidth = 1;
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            // Accent lines - thicker and more visible
            const accentSpacing = gridSpacing * 4;
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
            ctx.lineWidth = 2;
            ctx.setLineDash([]);

            for (let x = 0; x < canvas.width; x += accentSpacing) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }

            for (let y = 0; y < canvas.height; y += accentSpacing) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            // Intersection points with varying sizes
            for (let x = gridSpacing; x < canvas.width; x += gridSpacing) {
                for (let y = gridSpacing; y < canvas.height; y += gridSpacing) {
                    const seed = (x / gridSpacing) * 100 + y / gridSpacing;
                    const rand = seededRandom(seed);

                    const distFromCenter = Math.sqrt(
                        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                    );
                    const opacity = Math.max(0.15, 1 - (distFromCenter / maxRadius) * 0.7);

                    if (rand > 0.7) {
                        // Larger accent dots
                        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.4})`;
                        ctx.beginPath();
                        ctx.arc(x, y, 3, 0, Math.PI * 2);
                        ctx.fill();

                        // Outer ring
                        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.25})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.arc(x, y, 16, 0, Math.PI * 2);
                        ctx.stroke();
                    } else if (rand > 0.5) {
                        // Small dots
                        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.3})`;
                        ctx.beginPath();
                        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            // Corner decorations
            const cornerSize = Math.min(canvas.width, canvas.height) * 0.15;
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
            ctx.lineWidth = 2;
            ctx.setLineDash([]);

            // Top-left
            ctx.beginPath();
            ctx.moveTo(0, cornerSize);
            ctx.lineTo(0, 0);
            ctx.lineTo(cornerSize, 0);
            ctx.stroke();

            // Top-right
            ctx.beginPath();
            ctx.moveTo(canvas.width - cornerSize, 0);
            ctx.lineTo(canvas.width, 0);
            ctx.lineTo(canvas.width, cornerSize);
            ctx.stroke();

            // Bottom-left
            ctx.beginPath();
            ctx.moveTo(0, canvas.height - cornerSize);
            ctx.lineTo(0, canvas.height);
            ctx.lineTo(cornerSize, canvas.height);
            ctx.stroke();

            // Bottom-right
            ctx.beginPath();
            ctx.moveTo(canvas.width - cornerSize, canvas.height);
            ctx.lineTo(canvas.width, canvas.height);
            ctx.lineTo(canvas.width, canvas.height - cornerSize);
            ctx.stroke();

            // Center crosshair
            const crossSize = 20;
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(centerX - crossSize, centerY);
            ctx.lineTo(centerX + crossSize, centerY);
            ctx.moveTo(centerX, centerY - crossSize);
            ctx.lineTo(centerX, centerY + crossSize);
            ctx.stroke();

            // Center dot
            ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (style === "geometric") {
            // Square gradient effect from center
            ctx.fillStyle = primaryBg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const squareSize = Math.min(canvas.width, canvas.height);
            const layers = 50;

            for (let i = 0; i < layers; i++) {
                const progress = i / layers;
                const size = squareSize * (1 - progress);
                const x = centerX - size / 2;
                const y = centerY - size / 2;

                let color;
                if (progress < 0.5) {
                    const t = progress * 2;
                    color = this.blendColors(primaryBg, cardBg, t);
                } else {
                    const t = (progress - 0.5) * 2;
                    color = this.blendColors(cardBg, primaryBg, t);
                }

                ctx.fillStyle = color;
                ctx.fillRect(x, y, size, size);
            }

            const hexToRgb = (hex) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result
                    ? {
                        r: parseInt(result[1], 16),
                        g: parseInt(result[2], 16),
                        b: parseInt(result[3], 16),
                    }
                    : { r: 255, g: 255, b: 255 };
            };
            const rgb = hexToRgb(accentColor);

            // Main square size
            const mainSquareSize = Math.min(canvas.width, canvas.height) * 0.25;

            // Add subtle grid background first
            const gridSpacing = Math.min(canvas.width, canvas.height) / 20;
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.03)`;
            ctx.lineWidth = 0.5;

            for (let x = 0; x < canvas.width; x += gridSpacing) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }

            for (let y = 0; y < canvas.height; y += gridSpacing) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            // Draw 16 radial lines from center (every 22.5 degrees)
            const lineLength = Math.max(canvas.width, canvas.height) * 0.6;
            const numRays = 16;

            for (let i = 0; i < numRays; i++) {
                const angle = (Math.PI * 2 * i) / numRays;
                const startDist = mainSquareSize * 0.7;
                const startX = centerX + Math.cos(angle) * startDist;
                const startY = centerY + Math.sin(angle) * startDist;
                const endX = centerX + Math.cos(angle) * lineLength;
                const endY = centerY + Math.sin(angle) * lineLength;

                // Alternate between solid and dashed lines
                if (i % 2 === 0) {
                    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([]);
                } else {
                    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([5, 5]);
                }

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // Draw multiple concentric squares with different styles
            const squareSizes = [
                { size: mainSquareSize * 1.4, dash: [10, 5], width: 1, opacity: 0.3 },
                { size: mainSquareSize * 1.2, dash: [8, 8], width: 1, opacity: 0.4 },
                { size: mainSquareSize, dash: [], width: 2, opacity: 0.8 },
                { size: mainSquareSize * 0.8, dash: [4, 4], width: 1, opacity: 0.5 },
                { size: mainSquareSize * 0.6, dash: [6, 3], width: 1, opacity: 0.4 },
                { size: mainSquareSize * 0.4, dash: [3, 6], width: 1, opacity: 0.3 },
            ];

            squareSizes.forEach((square, index) => {
                ctx.strokeStyle = index === 2
                    ? (isDark ? `rgba(200, 200, 200, ${square.opacity})` : `rgba(100, 100, 100, ${square.opacity})`)
                    : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${square.opacity})`;
                ctx.lineWidth = square.width;
                ctx.setLineDash(square.dash);
                ctx.strokeRect(
                    centerX - square.size / 2,
                    centerY - square.size / 2,
                    square.size,
                    square.size
                );
            });
            ctx.setLineDash([]);

            // Draw rotated squares (45 degrees)
            const rotatedSquareSizes = [
                { size: mainSquareSize * 1.3, dash: [8, 4], width: 1, opacity: 0.25 },
                { size: mainSquareSize * 0.9, dash: [5, 5], width: 1, opacity: 0.3 },
                { size: mainSquareSize * 0.5, dash: [3, 3], width: 1, opacity: 0.25 },
            ];

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(Math.PI / 4);

            rotatedSquareSizes.forEach(square => {
                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${square.opacity})`;
                ctx.lineWidth = square.width;
                ctx.setLineDash(square.dash);
                ctx.strokeRect(
                    -square.size / 2,
                    -square.size / 2,
                    square.size,
                    square.size
                );
            });
            ctx.setLineDash([]);
            ctx.restore();

            // Draw nodes at ray ends
            const nodeSize = 6;
            const nodeLargeSize = 10;

            for (let i = 0; i < numRays; i++) {
                const angle = (Math.PI * 2 * i) / numRays;
                const x = centerX + Math.cos(angle) * lineLength;
                const y = centerY + Math.sin(angle) * lineLength;

                ctx.fillStyle = isDark
                    ? `rgba(50, 50, 50, 0.9)`
                    : `rgba(255, 255, 255, 0.9)`;
                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
                ctx.lineWidth = 1.5;

                const size = i % 4 === 0 ? nodeLargeSize : nodeSize;
                ctx.fillRect(x - size / 2, y - size / 2, size, size);
                ctx.strokeRect(x - size / 2, y - size / 2, size, size);

                // Add small cross in larger nodes
                if (i % 4 === 0) {
                    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x - 3, y);
                    ctx.lineTo(x + 3, y);
                    ctx.moveTo(x, y - 3);
                    ctx.lineTo(x, y + 3);
                    ctx.stroke();
                }
            }

            // Add more rotated square layers at different angles
            const moreRotatedSquares = [
                { angle: Math.PI / 8, size: mainSquareSize * 1.5, dash: [10, 5], width: 1, opacity: 0.2 },
                { angle: Math.PI / 6, size: mainSquareSize * 1.1, dash: [6, 6], width: 1, opacity: 0.25 },
                { angle: -Math.PI / 8, size: mainSquareSize * 0.7, dash: [4, 4], width: 1, opacity: 0.2 },
            ];

            moreRotatedSquares.forEach(square => {
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(square.angle);

                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${square.opacity})`;
                ctx.lineWidth = square.width;
                ctx.setLineDash(square.dash);
                ctx.strokeRect(
                    -square.size / 2,
                    -square.size / 2,
                    square.size,
                    square.size
                );

                ctx.restore();
            });
            ctx.setLineDash([]);

            // Central accent square
            const accentSquareSize = mainSquareSize * 0.15;
            ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
            ctx.fillRect(
                centerX - accentSquareSize / 2,
                centerY - accentSquareSize / 2,
                accentSquareSize,
                accentSquareSize
            );

            // Add corner decorations
            const cornerDist = mainSquareSize * 2;
            const cornerSize = 30;
            const corners = [
                { x: centerX - cornerDist, y: centerY - cornerDist },
                { x: centerX + cornerDist, y: centerY - cornerDist },
                { x: centerX + cornerDist, y: centerY + cornerDist },
                { x: centerX - cornerDist, y: centerY + cornerDist },
            ];

            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
            ctx.lineWidth = 1.5;

            corners.forEach((corner, index) => {
                ctx.setLineDash([6, 3]);
                ctx.beginPath();

                if (index === 0) {
                    ctx.moveTo(corner.x, corner.y + cornerSize);
                    ctx.lineTo(corner.x, corner.y);
                    ctx.lineTo(corner.x + cornerSize, corner.y);
                } else if (index === 1) {
                    ctx.moveTo(corner.x - cornerSize, corner.y);
                    ctx.lineTo(corner.x, corner.y);
                    ctx.lineTo(corner.x, corner.y + cornerSize);
                } else if (index === 2) {
                    ctx.moveTo(corner.x, corner.y - cornerSize);
                    ctx.lineTo(corner.x, corner.y);
                    ctx.lineTo(corner.x - cornerSize, corner.y);
                } else {
                    ctx.moveTo(corner.x + cornerSize, corner.y);
                    ctx.lineTo(corner.x, corner.y);
                    ctx.lineTo(corner.x, corner.y - cornerSize);
                }
                ctx.stroke();

                // Small accent square in corner
                const smallSize = 6;
                ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
                ctx.setLineDash([]);
                ctx.fillRect(corner.x - smallSize / 2, corner.y - smallSize / 2, smallSize, smallSize);
            });
            ctx.setLineDash([]);

            // Add rectangular frames at different positions
            const rectangularFrames = [
                { width: mainSquareSize * 1.8, height: mainSquareSize * 1.3, dash: [8, 4], lineWidth: 1, opacity: 0.25 },
                { width: mainSquareSize * 1.3, height: mainSquareSize * 1.8, dash: [6, 6], lineWidth: 1, opacity: 0.25 },
                { width: mainSquareSize * 0.9, height: mainSquareSize * 0.6, dash: [4, 2], lineWidth: 1, opacity: 0.2 },
            ];

            rectangularFrames.forEach(frame => {
                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${frame.opacity})`;
                ctx.lineWidth = frame.lineWidth;
                ctx.setLineDash(frame.dash);
                ctx.strokeRect(
                    centerX - frame.width / 2,
                    centerY - frame.height / 2,
                    frame.width,
                    frame.height
                );
            });
            ctx.setLineDash([]);

            // Add small squares along the main rays at regular intervals
            const squareDistances = [0.3, 0.5, 0.7];
            const smallSquareSize = 4;

            squareDistances.forEach(distRatio => {
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 * i) / 8;
                    const dist = lineLength * distRatio;
                    const x = centerX + Math.cos(angle) * dist;
                    const y = centerY + Math.sin(angle) * dist;

                    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
                    ctx.fillRect(x - smallSquareSize / 2, y - smallSquareSize / 2, smallSquareSize, smallSquareSize);

                    // Outline
                    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x - smallSquareSize / 2, y - smallSquareSize / 2, smallSquareSize, smallSquareSize);
                }
            });

            // Add connection squares between adjacent rays
            const connectionDist = lineLength * 0.6;
            for (let i = 0; i < 8; i++) {
                const angle1 = (Math.PI * 2 * i) / 8;
                const angle2 = (Math.PI * 2 * (i + 1)) / 8;

                const x1 = centerX + Math.cos(angle1) * connectionDist;
                const y1 = centerY + Math.sin(angle1) * connectionDist;
                const x2 = centerX + Math.cos(angle2) * connectionDist;
                const y2 = centerY + Math.sin(angle2) * connectionDist;

                // Draw dashed line between them
                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 6]);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // Add grid intersection markers
            const markerSpacing = gridSpacing * 3;
            const markerSize = 3;

            for (let x = markerSpacing; x < canvas.width; x += markerSpacing) {
                for (let y = markerSpacing; y < canvas.height; y += markerSpacing) {
                    const distFromCenter = Math.sqrt(
                        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                    );

                    if (distFromCenter > mainSquareSize * 0.8 && distFromCenter < lineLength * 0.9) {
                        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`;
                        ctx.fillRect(x - markerSize / 2, y - markerSize / 2, markerSize, markerSize);
                    }
                }
            }

        } else if (style === "lines") {
            // Square gradient effect from center
            ctx.fillStyle = primaryBg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const squareSize = Math.min(canvas.width, canvas.height);
            const layers = 50;

            for (let i = 0; i < layers; i++) {
                const progress = i / layers;
                const size = squareSize * (1 - progress);
                const x = centerX - size / 2;
                const y = centerY - size / 2;

                let color;
                if (progress < 0.5) {
                    const t = progress * 2;
                    color = this.blendColors(primaryBg, cardBg, t);
                } else {
                    const t = (progress - 0.5) * 2;
                    color = this.blendColors(cardBg, primaryBg, t);
                }

                ctx.fillStyle = color;
                ctx.fillRect(x, y, size, size);
            }

            const hexToRgb = (hex) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result
                    ? {
                        r: parseInt(result[1], 16),
                        g: parseInt(result[2], 16),
                        b: parseInt(result[3], 16),
                    }
                    : { r: 255, g: 255, b: 255 };
            };
            const rgb = hexToRgb(accentColor);

            // Horizontal flowing lines
            const lineSpacing = Math.min(canvas.width, canvas.height) / 12;
            for (let y = 0; y < canvas.height; y += lineSpacing) {
                const offset = Math.sin(y * 0.01) * 50;
                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
                ctx.lineWidth = 2;
                ctx.setLineDash([15, 10]);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.bezierCurveTo(
                    canvas.width * 0.25 + offset,
                    y + Math.sin(y * 0.02) * 30,
                    canvas.width * 0.75 - offset,
                    y - Math.sin(y * 0.02) * 30,
                    canvas.width,
                    y
                );
                ctx.stroke();
            }

            // Vertical flowing lines
            for (let x = 0; x < canvas.width; x += lineSpacing) {
                const offset = Math.cos(x * 0.01) * 50;
                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([10, 15]);
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.bezierCurveTo(
                    x + Math.cos(x * 0.02) * 30,
                    canvas.height * 0.25 + offset,
                    x - Math.cos(x * 0.02) * 30,
                    canvas.height * 0.75 - offset,
                    x,
                    canvas.height
                );
                ctx.stroke();
            }

            // Diagonal accent lines
            ctx.setLineDash([]);
            ctx.lineWidth = 1;
            const diagonalSpacing = lineSpacing * 2;
            for (let i = -canvas.height; i < canvas.width + canvas.height; i += diagonalSpacing) {
                const opacity = 0.05 + (Math.sin(i * 0.01) * 0.03);
                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i + canvas.height, canvas.height);
                ctx.stroke();
            }

            // Radial lines from center
            const numRadialLines = 24;
            ctx.lineWidth = 0.5;
            for (let i = 0; i < numRadialLines; i++) {
                const angle = (Math.PI * 2 * i) / numRadialLines;
                const distFromCenter = maxRadius * 0.3;
                const endX = centerX + Math.cos(angle) * maxRadius;
                const endY = centerY + Math.sin(angle) * maxRadius;
                const startX = centerX + Math.cos(angle) * distFromCenter;
                const startY = centerY + Math.sin(angle) * distFromCenter;

                const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
                gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
                gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
                ctx.strokeStyle = gradient;
                ctx.setLineDash([5, 10]);

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }

            // Connection nodes
            ctx.setLineDash([]);
            const nodeSpacing = lineSpacing * 1.5;
            for (let x = nodeSpacing; x < canvas.width; x += nodeSpacing) {
                for (let y = nodeSpacing; y < canvas.height; y += nodeSpacing) {
                    const distFromCenter = Math.sqrt(
                        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                    );
                    const opacity = Math.max(0.1, 1 - (distFromCenter / maxRadius) * 0.8);

                    // Outer circle
                    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.3})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(x, y, 8, 0, Math.PI * 2);
                    ctx.stroke();

                    // Inner circle
                    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fill();

                    // Cross lines
                    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.4})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x - 6, y);
                    ctx.lineTo(x + 6, y);
                    ctx.moveTo(x, y - 6);
                    ctx.lineTo(x, y + 6);
                    ctx.stroke();
                }
            }
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const noiseAmount = isDark ? 15 : 8;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * noiseAmount;
            data[i] += noise;
            data[i + 1] += noise;
            data[i + 2] += noise;
        }
        ctx.putImageData(imageData, 0, 0);

        this.backgroundTexture = new THREE.CanvasTexture(canvas);
        this.backgroundTexture.needsUpdate = true;
        this.createBackgroundMesh();
    },

    updateTheme() {
        if (this.isInitialized) {
            this.createGradientBackground();
            this.render();
        }
    },

    createBackgroundMesh() {
        if (this.backgroundMesh) {
            this.backgroundScene.remove(this.backgroundMesh);
        }

        const width = this.aspect * 2;
        const height = 2;
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({
            map: this.backgroundTexture,
            depthTest: false,
            depthWrite: false,
        });

        this.backgroundMesh = new THREE.Mesh(geometry, material);
        this.backgroundMesh.position.z = 0;
        this.backgroundScene.add(this.backgroundMesh);
    },

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(
            new RenderPass(this.backgroundScene, this.backgroundCamera)
        );

        const shader = {
            uniforms: {
                tDiffuse: { value: null },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                varying vec2 vUv;
                void main() {
                    gl_FragColor = texture2D(tDiffuse, vUv);
                }
            `,
        };

        this.customPass = new ShaderPass(shader);
        this.customPass.renderToScreen = true;
        this.composer.addPass(this.customPass);
    },

    onWindowResize() {
        this.aspect = window.innerWidth / (window.innerHeight || 1);

        this.camera.left = -this.aspect;
        this.camera.right = this.aspect;
        this.camera.updateProjectionMatrix();

        this.backgroundCamera.left = -this.aspect;
        this.backgroundCamera.right = this.aspect;
        this.backgroundCamera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);

        this.createGradientBackground();
        this.render();
    },

    render() {
        if (!this.renderer) return;

        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.clear();
            this.renderer.render(this.backgroundScene, this.backgroundCamera);
        }
    },
};

window.GlassEffect = GlassEffect;

// Wait for both DOM and Three.js to be ready
const initGlassEffect = () => {
    const canvas = document.getElementById("glassCanvas");
    if (!canvas) {
        console.warn("Glass canvas not found, retrying...");
        setTimeout(initGlassEffect, 50);
        return;
    }

    // Check if THREE is loaded
    if (typeof THREE === "undefined") {
        console.warn("THREE.js not loaded yet, retrying...");
        setTimeout(initGlassEffect, 50);
        return;
    }

    try {
        GlassEffect.init();
        console.log(
            "%c✨ Glass Effect Initialized",
            "color: #999999; font-weight: bold;"
        );
    } catch (error) {
        console.error("Failed to initialize Glass Effect:", error);
        // Fallback: show canvas anyway to prevent blank screen
        if (canvas) canvas.style.opacity = "1";
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGlassEffect);
} else {
    // Small delay to ensure module imports are ready
    setTimeout(initGlassEffect, 0);
}
