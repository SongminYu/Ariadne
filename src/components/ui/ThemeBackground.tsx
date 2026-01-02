'use client';

import { useThemeStore } from '@/stores/useThemeStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';

// Generate fixed positions for particles in a grid pattern
function generateGridPositions(count: number) {
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const positions: { top: number; left: number }[] = [];

    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        // Add some randomness within each grid cell
        const cellWidth = 100 / cols;
        const cellHeight = 100 / rows;
        positions.push({
            top: row * cellHeight + Math.random() * cellHeight * 0.6 + cellHeight * 0.2,
            left: col * cellWidth + Math.random() * cellWidth * 0.6 + cellWidth * 0.2
        });
    }
    return positions;
}

export default function ThemeBackground() {
    const { theme } = useThemeStore();
    const [mounted, setMounted] = useState(false);

    // Pre-generate positions to avoid hydration mismatch
    const leafPositions = useMemo(() => generateGridPositions(12), []);
    const starPositions = useMemo(() => generateGridPositions(12), []);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <AnimatePresence mode="wait">
                {theme === 'light' ? (
                    <motion.div
                        key="day-decor"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0"
                    >
                        {/* Day Mode: Spring Morning Mist */}
                        <div
                            className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-40"
                            style={{ background: 'radial-gradient(circle, #D8E2DC 0%, transparent 70%)' }}
                        />
                        <div
                            className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full blur-[100px] opacity-30"
                            style={{ background: 'radial-gradient(circle, #E1E8E4 0%, transparent 70%)' }}
                        />

                        {/* 12 Floating Leaf Particles - appear, drift, fade out */}
                        <div className="absolute inset-0">
                            {leafPositions.map((pos, i) => (
                                <motion.svg
                                    key={`leaf-${i}`}
                                    className="absolute"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="#84A98C"
                                    style={{
                                        top: `${pos.top}%`,
                                        left: `${pos.left}%`,
                                    }}
                                    initial={{ opacity: 0, y: 0, rotate: Math.random() * 360 }}
                                    animate={{
                                        opacity: [0, 0.6, 0.5, 0],
                                        y: [0, -40, -80],
                                        x: [0, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 50],
                                        rotate: [0, 45, 90]
                                    }}
                                    transition={{
                                        duration: 6 + i * 0.5,
                                        repeat: Infinity,
                                        delay: i * 0.8,
                                        ease: "easeInOut"
                                    }}
                                >
                                    {/* Leaf SVG path */}
                                    <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
                                </motion.svg>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="night-decor"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0"
                    >
                        {/* Night Mode: Nature at Night */}
                        <div
                            className="absolute -top-[10%] left-[20%] w-[60%] h-[50%] rounded-full blur-[130px] opacity-40"
                            style={{ background: 'radial-gradient(circle, #1E293B 0%, transparent 70%)' }}
                        />
                        <div
                            className="absolute bottom-[10%] left-[10%] w-[40%] h-[40%] rounded-full blur-[100px] opacity-20"
                            style={{ background: 'radial-gradient(circle, #38BDF8 0%, transparent 70%)' }}
                        />

                        {/* 12 Stars - appear, twinkle, fade out */}
                        <div className="absolute inset-0">
                            {starPositions.map((pos, i) => (
                                <motion.div
                                    key={`star-${i}`}
                                    className="absolute w-1.5 h-1.5 bg-sky-200 rounded-full shadow-[0_0_10px_rgba(186,230,253,0.9)]"
                                    style={{
                                        top: `${pos.top}%`,
                                        left: `${pos.left}%`,
                                    }}
                                    initial={{ opacity: 0, scale: 0.3 }}
                                    animate={{
                                        opacity: [0, 0.9, 0.7, 0],
                                        scale: [0.3, 1.2, 1, 0.3],
                                        y: [0, -10, -20]
                                    }}
                                    transition={{
                                        duration: 4 + i * 0.3,
                                        repeat: Infinity,
                                        delay: i * 0.6,
                                        ease: "easeInOut"
                                    }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
