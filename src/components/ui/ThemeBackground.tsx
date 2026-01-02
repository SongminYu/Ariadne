'use client';

import { useThemeStore } from '@/stores/useThemeStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function ThemeBackground() {
    const { theme } = useThemeStore();
    const [mounted, setMounted] = useState(false);

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
                        {/* Large soft green blob top left */}
                        <div
                            className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-40"
                            style={{ background: 'radial-gradient(circle, #D8E2DC 0%, transparent 70%)' }}
                        />
                        {/* Soft warm blob bottom right */}
                        <div
                            className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full blur-[100px] opacity-30"
                            style={{ background: 'radial-gradient(circle, #E1E8E4 0%, transparent 70%)' }}
                        />
                        {/* Floating subtle "leaves" or light spots */}
                        <motion.div
                            animate={{ y: [0, -20, 0], opacity: [0.3, 0.5, 0.3] }}
                            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full blur-[80px] bg-[#6B9080]/10"
                        />
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
                        {/* Deep Blue/Indigo glow top center */}
                        <div
                            className="absolute -top-[10%] left-[20%] w-[60%] h-[50%] rounded-full blur-[130px] opacity-40"
                            style={{ background: 'radial-gradient(circle, #1E293B 0%, transparent 70%)' }}
                        />
                        {/* Secondary Glow */}
                        <div
                            className="absolute bottom-[10%] left-[10%] w-[40%] h-[40%] rounded-full blur-[100px] opacity-20"
                            style={{ background: 'radial-gradient(circle, #38BDF8 0%, transparent 70%)' }}
                        />

                        {/* Fireflies / Stars */}
                        <div className="absolute inset-0">
                            {[...Array(5)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-1 h-1 bg-sky-200 rounded-full shadow-[0_0_8px_rgba(186,230,253,0.8)]"
                                    style={{
                                        top: `${Math.random() * 80 + 10}%`,
                                        left: `${Math.random() * 80 + 10}%`,
                                    }}
                                    animate={{
                                        opacity: [0, 0.8, 0],
                                        scale: [0.5, 1.2, 0.5],
                                        y: [0, -15, 0]
                                    }}
                                    transition={{
                                        duration: 3 + Math.random() * 4,
                                        repeat: Infinity,
                                        delay: Math.random() * 2,
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
