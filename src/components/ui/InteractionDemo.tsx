'use client';

import { useState, useEffect } from 'react';

interface InteractionDemoProps {
    theme: 'light' | 'dark';
}

/**
 * Interactive demo animation showing the core "selection-to-branch" interaction
 * Displays a mock answer card with text selection and follow-up popover
 */
export default function InteractionDemo({ theme }: InteractionDemoProps) {
    // Animation states
    const [phase, setPhase] = useState<'idle' | 'selecting' | 'selected' | 'typing' | 'sending' | 'fading'>('idle');
    const [typedText, setTypedText] = useState('');

    const demoQuestion = 'What is entropy?';
    const followUpQuestion = 'Can you explain reversible processes in more detail?';

    // Animation loop
    useEffect(() => {
        const phases = [
            { name: 'idle', duration: 1500 },
            { name: 'selecting', duration: 800 },
            { name: 'selected', duration: 600 },
            { name: 'typing', duration: 4500 },
            { name: 'sending', duration: 1200 },
            { name: 'fading', duration: 800 },
        ] as const;

        let currentIndex = 0;
        let timeout: NodeJS.Timeout;

        const runPhase = () => {
            const currentPhase = phases[currentIndex];
            setPhase(currentPhase.name);

            timeout = setTimeout(() => {
                currentIndex = (currentIndex + 1) % phases.length;
                runPhase();
            }, currentPhase.duration);
        };

        runPhase();

        return () => clearTimeout(timeout);
    }, []);

    // Typing animation for follow-up question
    useEffect(() => {
        if (phase === 'typing') {
            setTypedText('');
            let index = 0;
            const interval = setInterval(() => {
                if (index < followUpQuestion.length) {
                    setTypedText(followUpQuestion.slice(0, index + 1));
                    index++;
                } else {
                    clearInterval(interval);
                }
            }, 80);
            return () => clearInterval(interval);
        } else if (phase === 'idle') {
            setTypedText('');
        }
    }, [phase]);

    // Determine visibility and styles based on phase
    const showPopover = phase === 'selected' || phase === 'typing' || phase === 'sending';
    const isTextSelected = phase === 'selecting' || phase === 'selected' || phase === 'typing' || phase === 'sending';
    const isSending = phase === 'sending';
    const isFading = phase === 'fading';

    return (
        <div
            className={`relative w-full max-w-md mx-auto transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}
            style={{ perspective: '1000px' }}
        >
            {/* Mock Detail Card */}
            <div
                className="rounded-[var(--radius-lg)] overflow-hidden shadow-2xl"
                style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                }}
            >
                {/* Card Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--card-border)]">
                    <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: 'var(--accent-primary)' }}
                    />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Details
                    </span>
                    <span
                        className="text-xs px-2 py-0.5 rounded-full ml-1"
                        style={{
                            background: 'var(--bg-dots)',
                            color: 'var(--text-secondary)',
                            opacity: 0.8
                        }}
                    >
                        2 branches
                    </span>
                </div>

                {/* Question Section */}
                <div className="px-5 py-4 border-b border-[var(--card-border)]">
                    <p
                        className="text-[10px] uppercase tracking-wider mb-1.5 font-semibold"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        Question
                    </p>
                    <p
                        className="text-base font-medium"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {demoQuestion}
                    </p>
                </div>

                {/* Answer Section */}
                <div className="px-5 py-4 relative">
                    <div
                        className="text-sm leading-relaxed space-y-2"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <p>
                            Entropy is a measure of disorder in a system. In thermodynamics, it determines the direction of{' '}
                            <span
                                className={`relative inline transition-all duration-300 rounded px-0.5 ${isTextSelected
                                    ? 'text-white'
                                    : ''
                                    }`}
                                style={{
                                    background: isTextSelected ? 'var(--accent-primary)' : 'transparent',
                                }}
                            >
                                reversible processes
                                {/* Selection cursor animation */}
                                {phase === 'selecting' && (
                                    <span
                                        className="absolute -right-0.5 top-0 h-full w-0.5 animate-pulse"
                                        style={{ background: 'var(--accent-primary)' }}
                                    />
                                )}
                            </span>
                            .
                        </p>
                        <p className="opacity-70">
                            The second law states that entropy always increases in isolated systems...
                        </p>
                    </div>

                    {/* Follow-up Popover */}
                    <div
                        className={`absolute left-4 right-4 transition-all duration-300 ${showPopover
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 translate-y-2 pointer-events-none'
                            }`}
                        style={{
                            bottom: '-80px',
                            zIndex: 10,
                        }}
                    >
                        <div
                            className="rounded-xl p-3 shadow-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--card-border)',
                            }}
                        >
                            {/* Ask about label */}
                            <div className="flex items-center gap-2 mb-2">
                                <span
                                    className="text-[10px] uppercase tracking-wider"
                                    style={{ color: 'var(--text-tertiary)' }}
                                >
                                    Ask about:
                                </span>
                                <span
                                    className="text-xs px-2 py-0.5 rounded"
                                    style={{
                                        background: `${theme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(107, 144, 128, 0.15)'}`,
                                        color: 'var(--accent-primary)',
                                    }}
                                >
                                    &ldquo;reversible processes&rdquo;
                                </span>
                            </div>

                            {/* Input field */}
                            <div
                                className="flex items-center gap-2 rounded-lg px-3 py-2"
                                style={{
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--card-border)',
                                }}
                            >
                                <span
                                    className="flex-1 text-sm"
                                    style={{
                                        color: typedText ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                    }}
                                >
                                    {typedText || 'Ask a follow-up...'}
                                    {(phase === 'typing' || phase === 'selected') && (
                                        <span
                                            className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-middle"
                                            style={{ background: 'var(--accent-primary)' }}
                                        />
                                    )}
                                </span>
                                <button
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${isSending ? 'scale-95' : ''
                                        }`}
                                    style={{
                                        background: 'var(--accent-primary)',
                                        color: 'white',
                                        opacity: (phase === 'typing' && typedText) || isSending ? 1 : 0.5,
                                    }}
                                >
                                    {isSending ? (
                                        <div
                                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                                        />
                                    ) : (
                                        'Send'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom padding to make room for popover */}
                <div className="h-20" />
            </div>

            {/* Decorative glow effect */}
            <div
                className="absolute -inset-4 -z-10 rounded-[var(--radius-lg)] opacity-30 blur-2xl"
                style={{
                    background: `radial-gradient(circle, var(--accent-primary), transparent 70%)`,
                }}
            />
        </div>
    );
}
