
import React from 'react';
import { useAppearance } from '../../AppContext';

export const CosmicBackground: React.FC = () => {
    const { mode } = useAppearance();
    const isDark = mode === 'dark';

    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden bg-[var(--bg-primary)] pointer-events-none transition-colors duration-1000 transform-gpu">

            {/* Layer 1: Base Glows */}
            <div
                className={`absolute top-[-10%] left-[-10%] w-[80vh] h-[80vh] rounded-full blur-[80px] opacity-20 transition-colors duration-1000 ${isDark ? 'bg-indigo-900' : 'bg-blue-200'}`}
                style={{
                    animation: 'floatCosmic 40s ease-in-out infinite',
                    willChange: 'transform'
                }}
            ></div>

            <div
                className={`absolute bottom-[-15%] right-[-10%] w-[70vh] h-[70vh] rounded-full blur-[80px] opacity-20 transition-colors duration-1000 ${isDark ? 'bg-blue-900' : 'bg-purple-100'}`}
                style={{
                    animation: 'floatCosmic 45s ease-in-out infinite reverse',
                    willChange: 'transform'
                }}
            ></div>

            {/* Layer 2: Core Pulsing Orb */}
            <div
                className={`absolute top-1/2 left-1/2 w-[40vh] h-[40vh] rounded-full blur-[60px] opacity-20 transition-colors duration-1000 ${isDark ? 'bg-purple-800' : 'bg-indigo-100'}`}
                style={{
                    animation: 'pulseSubtle 15s ease-in-out infinite',
                    willChange: 'transform, opacity',
                    transform: 'translate(-50%, -50%)'
                }}
            ></div>

            {/* Layer 3: Tech Grid Lines (Spider Web Style) */}
            <div className="absolute inset-0 z-0 opacity-[0.05] dark:opacity-[0.12] pointer-events-none">
                <svg className="w-full h-full animate-grid-pan">
                    <defs>
                        <pattern id="spider-web-grid" width="100" height="100" patternUnits="userSpaceOnUse">
                            {/* Horizontal and Vertical Lines */}
                            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-[var(--accent-primary)]" />
                            {/* Diagonal Web Lines */}
                            <path d="M 0 0 L 100 100 M 100 0 L 0 100" fill="none" stroke="currentColor" strokeWidth="0.2" className="text-[var(--accent-primary)] opacity-70" />
                            {/* Dots at intersections */}
                            <circle cx="0" cy="0" r="1.5" fill="currentColor" className="text-[var(--accent-primary)]" />
                        </pattern>
                    </defs>
                    <rect width="200%" height="200%" fill="url(#spider-web-grid)" />
                </svg>
            </div>

            {/* Layer 4: Noise Texture */}
            <div
                className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            ></div>

            {/* Layer 5: Minimalist Grid Overlay (Subtle Static) */}
            <div
                className="absolute inset-0 opacity-[0.01] dark:opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)`,
                    backgroundSize: '150px 150px'
                }}
            ></div>

            {/* Decorative Stars */}
            {isDark && (
                <div className="absolute inset-0">
                    <div className="absolute top-[15%] left-[20%] w-0.5 h-0.5 bg-white rounded-full opacity-60"></div>
                    <div className="absolute top-[50%] left-[85%] w-1 h-1 bg-white rounded-full opacity-70"></div>
                    <div className="absolute top-[80%] left-[10%] w-1 h-1 bg-white rounded-full opacity-50"></div>
                </div>
            )}
        </div>
    );
};
