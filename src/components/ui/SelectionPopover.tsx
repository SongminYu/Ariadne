'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SelectionPopoverProps {
    isOpen: boolean;
    position: { x: number; y: number };
    onSubmit: (question: string) => void;
    onClose: () => void;
    selectedText: string;
}

export default function SelectionPopover({
    isOpen,
    position,
    onSubmit,
    onClose,
    selectedText,
    variant = 'fixed'
}: SelectionPopoverProps & { variant?: 'fixed' | 'absolute' }) {
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            // Delay focus to ensure element is rendered
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            // Delay adding event listener to avoid immediate trigger
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 100);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const handleSubmit = () => {
        if (!inputValue.trim() || isLoading) return;
        setIsLoading(true);
        onSubmit(inputValue);
        setInputValue('');
        setIsLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    // Calculate position to ensure it stays within screen
    const getAdjustedPosition = () => {
        const popoverWidth = 340;
        const popoverHeight = 180;
        const padding = 20;

        let x = position.x - popoverWidth / 2;
        let y = position.y + 10;

        // Prevent exceeding right boundary
        if (x + popoverWidth > window.innerWidth - padding) {
            x = window.innerWidth - popoverWidth - padding;
        }
        // Prevent exceeding left boundary
        if (x < padding) {
            x = padding;
        }
        // Prevent exceeding bottom boundary
        if (y + popoverHeight > window.innerHeight - padding) {
            y = position.y - popoverHeight - 10;
        }

        return { x, y };
    };

    const adjustedPos = getAdjustedPosition();

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={containerRef}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className={`z-[100] bg-[var(--card-bg)] backdrop-blur-xl 
                           border border-[var(--card-border)] rounded-xl shadow-lg overflow-auto
                           flex flex-col pointer-events-auto resize min-w-[300px] max-w-[600px] min-h-[150px] max-h-[400px]
                           ${variant === 'fixed' ? 'fixed' : 'absolute'}`}
                    style={{
                        left: adjustedPos.x,
                        top: adjustedPos.y,
                        width: 360,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {/* Selected text preview */}
                    <div className="px-4 py-2 border-b border-[var(--card-border)] bg-[var(--bg-primary)]/20 rounded-t-xl">
                        <p className="text-xs text-[var(--text-tertiary)] mb-1">Ask about this:</p>
                        <p className="text-sm text-[var(--text-secondary)] truncate italic">
                            &quot;{selectedText}&quot;
                        </p>
                    </div>

                    {/* Input area */}
                    <div className="p-3 flex-1 flex flex-col">
                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Details / Follow-up..."
                            className="w-full flex-1 bg-[var(--bg-dots)]/50 text-[var(--text-primary)] text-sm 
                                     placeholder:text-[var(--text-tertiary)]
                                     rounded-lg px-3 py-2 border border-[var(--card-border)]
                                     focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/50
                                     resize-none min-h-[60px]"
                        />
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-[var(--text-tertiary)]">
                                ⌘/Ctrl + Enter to send
                            </p>
                            <button
                                onClick={handleSubmit}
                                disabled={!inputValue.trim() || isLoading}
                                className="px-3 py-1 rounded-lg
                                           bg-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/30
                                           text-[var(--accent-primary)] text-xs font-medium
                                           disabled:opacity-30 disabled:cursor-not-allowed
                                           transition-all"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
