'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData, useCanvasStore } from '@/stores/useCanvasStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useEffect, useRef } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';

interface CompactNodeProps extends NodeProps {
    data: NodeData;
}

export default function CompactNode({ data, id }: CompactNodeProps) {
    const { content, source_anchor, parent_id } = data;
    const { setSelectedNodeForSheet, deleteNode } = useCanvasStore();
    const [menuOpen, setMenuOpen] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const isRoot = !parent_id;

    const getPreview = (text: string) => {
        if (!text) return '';
        const allLines = text.split('\n').filter(l => l.trim());
        return allLines.slice(0, 2).join(' ').slice(0, 80);
    };

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (menuOpen || showConfirm) return;
        setSelectedNodeForSheet(id);
    }, [id, setSelectedNodeForSheet, menuOpen, showConfirm]);

    const handleMenuClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(!menuOpen);
    }, [menuOpen]);

    const handleDeleteClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        setShowConfirm(true);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        deleteNode(id);
        setShowConfirm(false);
    }, [id, deleteNode]);

    const handleCancelDelete = useCallback(() => {
        setShowConfirm(false);
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        if (menuOpen) {
            document.addEventListener('mousedown', handleClickOutside, true);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [menuOpen]);

    const preview = getPreview(content.ai_response);
    const hasAnchor = !!source_anchor;

    return (
        <>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                onClick={handleClick}
                className={`
                    w-[280px] rounded-xl cursor-pointer
                    bg-[#12122a]/90 backdrop-blur-md 
                    border border-white/10
                    overflow-visible relative
                    transition-all duration-300
                    hover:shadow-[0_0_40px_rgba(100,200,255,0.25),0_8px_32px_rgba(0,0,0,0.3)]
                    ${isRoot ? 'border-l-2 border-l-cyan-400/60' : ''}
                `}
                style={{
                    boxShadow: '0 0 20px rgba(100, 200, 255, 0.1), 0 4px 16px rgba(0,0,0,0.2)',
                }}
            >
                {/* Input handle */}
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-3 !h-3 !bg-cyan-400/50 !border-cyan-300/50 !border-2"
                />

                {/* Source anchor indicator - at top */}
                {hasAnchor && (
                    <div className="px-3 py-1.5 bg-cyan-400/10 border-b border-cyan-400/20
                                    text-[10px] text-cyan-300/70 truncate pr-10 rounded-t-xl">
                        ↳ "{source_anchor.text}"
                    </div>
                )}

                {/* Question area - with menu button inline */}
                <div className={`relative px-4 py-2.5 border-b border-white/10 bg-white/5 ${!hasAnchor ? 'rounded-t-xl' : ''}`}>
                    <p className="text-sm text-white/90 leading-snug line-clamp-2 pr-8">
                        {content.user_prompt}
                    </p>

                    {/* Three-dot menu button - positioned relative to question area */}
                    <div ref={menuRef} className="absolute top-1/2 right-2 -translate-y-1/2">
                        <button
                            onClick={handleMenuClick}
                            className="p-1 rounded hover:bg-white/10 transition-all"
                        >
                            <MoreVertical className="w-4 h-4 text-white/40" />
                        </button>

                        {/* Dropdown menu */}
                        <AnimatePresence>
                            {menuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -5 }}
                                    className="absolute right-0 top-8 bg-[#1a1a2e] border border-white/20 
                                               rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden
                                               z-[100] min-w-[120px]"
                                >
                                    <button
                                        onClick={handleDeleteClick}
                                        className="flex items-center gap-2 px-4 py-2.5 w-full
                                                   text-red-400 hover:bg-red-500/20
                                                   text-sm transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Answer preview */}
                <div className="px-4 py-2.5 text-xs text-white/50 leading-relaxed">
                    {content.ai_response ? (
                        <p className="line-clamp-2">{preview}...</p>
                    ) : (
                        <div className="flex items-center gap-2 text-white/40">
                            <span className="inline-block w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                            <span className="inline-block w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                            <span className="inline-block w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                            <span className="ml-1">Loading...</span>
                        </div>
                    )}
                </div>

                {/* Output handle */}
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!w-3 !h-3 !bg-cyan-400/50 !border-cyan-300/50 !border-2"
                />
            </motion.div>

            {/* Inline Confirm dialog */}
            <AnimatePresence>
                {showConfirm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/70 z-[9999]"
                            onClick={handleCancelDelete}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                                       w-[320px] bg-[#1a1a2e] border border-white/20 rounded-xl
                                       shadow-[0_0_60px_rgba(0,0,0,0.5)] z-[10000]
                                       overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-5">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-red-500/20 rounded-lg">
                                        <Trash2 className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium mb-1">Delete Node</h3>
                                        <p className="text-sm text-white/60">This will delete this node and all child nodes.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex border-t border-white/10">
                                <button
                                    onClick={handleCancelDelete}
                                    className="flex-1 px-4 py-3 text-sm text-white/60 
                                               hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="flex-1 px-4 py-3 text-sm text-red-400 
                                               hover:bg-red-500/10 transition-colors
                                               border-l border-white/10"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
