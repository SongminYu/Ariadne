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

    // 打开时聚焦输入框
    useEffect(() => {
        if (isOpen && inputRef.current) {
            // 延迟聚焦，确保元素已渲染
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            // 延迟添加事件监听，避免立即触发
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

    // 计算位置，确保不超出屏幕
    const getAdjustedPosition = () => {
        const popoverWidth = 340;
        const popoverHeight = 180;
        const padding = 20;

        let x = position.x - popoverWidth / 2;
        let y = position.y + 10;

        // 防止超出右边界
        if (x + popoverWidth > window.innerWidth - padding) {
            x = window.innerWidth - popoverWidth - padding;
        }
        // 防止超出左边界
        if (x < padding) {
            x = padding;
        }
        // 防止超出底部
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
                    className={`z-[100] w-[360px] bg-[#0a0a1a]/90 backdrop-blur-xl 
                           border border-white/10 rounded-xl shadow-2xl overflow-hidden
                           flex flex-col pointer-events-auto ${variant === 'fixed' ? 'fixed' : 'absolute'}`}
                    style={{
                        left: adjustedPos.x,
                        top: adjustedPos.y,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="bg-[#1a1a2e] backdrop-blur-xl border border-white/20 
                          rounded-xl shadow-[0_0_40px_rgba(100,200,255,0.2)] 
                          overflow-hidden w-[340px]">
                        {/* Selected text preview */}
                        <div className="px-4 py-2 border-b border-white/10 bg-white/5">
                            <p className="text-xs text-white/40 mb-1">Ask about this:</p>
                            <p className="text-sm text-cyan-300/80 truncate">
                                "{selectedText}"
                            </p>
                        </div>

                        {/* Input area */}
                        <div className="p-3">
                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter your follow-up question..."
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg
                                           bg-white/5 border border-white/10
                                           text-white placeholder-white/30
                                           focus:outline-none focus:border-cyan-400/50
                                           text-sm resize-none"
                            />
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-white/20">
                                    ⌘/Ctrl + Enter to send
                                </p>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!inputValue.trim() || isLoading}
                                    className="px-3 py-1 rounded-lg
                                               bg-cyan-500/20 hover:bg-cyan-500/30
                                               text-cyan-300 text-xs
                                               disabled:opacity-30 disabled:cursor-not-allowed
                                               transition-all"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
