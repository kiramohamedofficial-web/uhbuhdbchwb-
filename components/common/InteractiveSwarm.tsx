
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

export const InteractiveSwarm: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [msgVisible, setMsgVisible] = useState(false);

    useEffect(() => {
        if (!canvasRef.current) return;

        let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
        let particles: THREE.Points, lines: THREE.LineSegments;
        const count = 300;
        let currentShapeIndex = 0;
        let isAngry = false;
        let annoyanceLevel = 0;

        const mouse = new THREE.Vector3(1000, 1000, 0);

        // Morphing engine variables
        const morphState = { progress: 0 };
        const basePosArray = new Float32Array(count * 3);
        const targetPosArray = new Float32Array(count * 3);
        const currentMorphArray = new Float32Array(count * 3);

        const init = () => {
            try {
                // Simple WebGL check
                const gl = canvasRef.current!.getContext('webgl') || canvasRef.current!.getContext('experimental-webgl');
                if (!gl) {
                    console.warn("WebGL not supported, skipping animation.");
                    return;
                }

                scene = new THREE.Scene();
                camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
                camera.position.z = 600;

                renderer = new THREE.WebGLRenderer({
                    canvas: canvasRef.current!,
                    antialias: true,
                    alpha: true
                });
                renderer.setSize(window.innerWidth, window.innerHeight);
                // Optimization: Limit pixel ratio to 2 to save GPU on high-res mobile screens
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            } catch (err) {
                console.error("Three.js initialization failed:", err);
                return;
            }

            const geo = new THREE.BufferGeometry();
            const colors = new Float32Array(count * 3);

            for (let i = 0; i < count; i++) {
                const color = new THREE.Color().setHSL(0.6 + Math.random() * 0.1, 0.9, 0.6);
                colors.set([color.r, color.g, color.b], i * 3);

                const startX = (Math.random() - 0.5) * 1000;
                const startY = (Math.random() - 0.5) * 1000;
                const startZ = (Math.random() - 0.5) * 1000;
                basePosArray.set([startX, startY, startZ], i * 3);
                currentMorphArray.set([startX, startY, startZ], i * 3);
            }

            geo.setAttribute('position', new THREE.BufferAttribute(currentMorphArray, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            particles = new THREE.Points(geo, new THREE.PointsMaterial({
                size: 3.5,
                vertexColors: true,
                blending: THREE.AdditiveBlending
            }));
            scene.add(particles);

            // Pre-allocate lines geometry to avoid re-creation in frame
            const lineGeo = new THREE.BufferGeometry();
            const linePositions = new Float32Array(count * 2 * 3);
            lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

            lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
                color: 0x4400ff,
                transparent: true,
                opacity: 0.15
            }));
            scene.add(lines);

            const handleInput = (e: MouseEvent | TouchEvent) => {
                const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
                const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

                const x = (clientX / window.innerWidth) * 2 - 1;
                const y = -(clientY / window.innerHeight) * 2 + 1;

                const vector = new THREE.Vector3(x, y, 0.5).unproject(camera);
                const dir = vector.sub(camera.position).normalize();
                const distance = -camera.position.z / dir.z;
                mouse.copy(camera.position.clone().add(dir.multiplyScalar(distance)));

                annoyanceLevel += 1.5;
                if (annoyanceLevel > 180 && !isAngry) {
                    isAngry = true;
                    setMsgVisible(true);
                    setTimeout(() => {
                        isAngry = false;
                        annoyanceLevel = 0;
                        setMsgVisible(false);
                    }, 4000);
                }
            };

            const onWindowResize = () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            };

            window.addEventListener('mousemove', handleInput);
            window.addEventListener('touchstart', handleInput, { passive: true });
            window.addEventListener('touchmove', handleInput, { passive: true });
            window.addEventListener('resize', onWindowResize);

            const morph = () => {
                // Set current as base
                for (let i = 0; i < count * 3; i++) basePosArray[i] = currentMorphArray[i];

                // Generate new target
                const index = currentShapeIndex;
                for (let i = 0; i < count; i++) {
                    let x = 0, y = 0, z = 0;
                    const p = i / count;
                    const a = p * Math.PI * 2;

                    if (index === 0) { // Heart
                        x = 16 * Math.pow(Math.sin(a), 3) * 11;
                        y = (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 11;
                    } else if (index === 1) { // Square
                        const s = 150;
                        if (i < 75) { x = -s; y = -s + (i / 75) * 2 * s; } else if (i < 150) { x = -s + ((i - 75) / 75) * 2 * s; y = s; }
                        else if (i < 225) { x = s; y = s - ((i - 150) / 75) * 2 * s; } else { x = s - ((i - 225) / 75) * 2 * s; y = -s; }
                    } else if (index === 2) { // Circle
                        x = 200 * Math.cos(a); y = 200 * Math.sin(a);
                    } else {
                        const fA = (index % 5) + 1;
                        const fB = (index % 7) + 2;
                        x = Math.sin(a * fA) * 220;
                        y = Math.cos(a * fB) * 220;
                        z = Math.sin(a * 2) * 80;
                    }
                    targetPosArray[i * 3] = x;
                    targetPosArray[i * 3 + 1] = y;
                    targetPosArray[i * 3 + 2] = z;
                }

                morphState.progress = 0;
                gsap.to(morphState, {
                    progress: 1,
                    duration: 2.5,
                    ease: "expo.inOut"
                });

                currentShapeIndex = (currentShapeIndex + 1) % 12;
            };

            let animationFrameId: number;
            const animate = () => {
                if (!particles) return;
                animationFrameId = requestAnimationFrame(animate);

                const posAttr = particles.geometry.attributes.position as THREE.BufferAttribute;
                const linePosAttr = lines.geometry.attributes.position as THREE.BufferAttribute;

                for (let i = 0; i < count; i++) {
                    const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;

                    // 1. Calculate Morphing Position
                    let tx = basePosArray[ix] + (targetPosArray[ix] - basePosArray[ix]) * morphState.progress;
                    let ty = basePosArray[iy] + (targetPosArray[iy] - basePosArray[iy]) * morphState.progress;
                    let tz = basePosArray[iz] + (targetPosArray[iz] - basePosArray[iz]) * morphState.progress;

                    // 2. Add Mouse Interaction
                    const dx = currentMorphArray[ix] - mouse.x;
                    const dy = currentMorphArray[iy] - mouse.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 120 && !isAngry) {
                        const pushForce = (120 - dist) * 1.8;
                        tx += (dx / dist) * pushForce;
                        ty += (dy / dist) * pushForce;
                    }

                    // 3. Smooth Easing to current state
                    const easing = isAngry ? 0.02 : 0.07;
                    currentMorphArray[ix] += (tx - currentMorphArray[ix]) * easing;
                    currentMorphArray[iy] += (ty - currentMorphArray[iy]) * easing;
                    currentMorphArray[iz] += (tz - currentMorphArray[iz]) * easing;
                }

                posAttr.needsUpdate = true;

                // Update lines with pre-allocated buffer
                for (let i = 0; i < count; i++) {
                    const next = (i + 1) % count;
                    linePosAttr.setXYZ(i * 2, currentMorphArray[i * 3], currentMorphArray[i * 3 + 1], currentMorphArray[i * 3 + 2]);
                    linePosAttr.setXYZ(i * 2 + 1, currentMorphArray[next * 3], currentMorphArray[next * 3 + 1], currentMorphArray[next * 3 + 2]);
                }
                linePosAttr.needsUpdate = true;

                if (!isAngry) {
                    particles.rotation.y += 0.002;
                    lines.rotation.y += 0.002;
                }

                renderer.render(scene, camera);
                if (annoyanceLevel > 0) annoyanceLevel -= 0.15;
            };

            const morphInterval = setInterval(() => { if (!isAngry) morph(); }, 4000);
            morph();
            animate();

            return () => {
                clearInterval(morphInterval);
                window.removeEventListener('mousemove', handleInput);
                window.removeEventListener('touchstart', handleInput);
                window.removeEventListener('touchmove', handleInput);
                window.removeEventListener('resize', onWindowResize);
                cancelAnimationFrame(animationFrameId);
                if (renderer) renderer.dispose();
                if (scene) scene.clear();
            };
        };

        const cleanup = init();
        return () => cleanup();
    }, []);

    return (
        <div className="fixed inset-0 z-0 bg-[#020005] pointer-events-none overflow-hidden">
            {msgVisible && (
                <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none animate-pulse">
                    <span className="text-[#ff0055] font-black text-4xl md:text-7xl drop-shadow-[0_0_30px_#ff0055] text-center px-6">
                        STOP DOING THIS
                    </span>
                </div>
            )}
            <canvas ref={canvasRef} className="block w-full h-full" style={{ touchAction: 'none' }} />
            <div className="absolute inset-0 bg-gradient-to-b from-[#020005]/20 via-transparent to-[#020005]/40 pointer-events-none"></div>
        </div>
    );
};
