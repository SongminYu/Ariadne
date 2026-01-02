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
                    w-[280px] rounded-[var(--radius-md)] cursor-pointer
                    bg-[var(--card-bg)]/95 backdrop-blur-sm
                    border border-[var(--card-border)]
                    overflow-visible relative
                    transition-all duration-300
                    hover:scale-[1.02] hover:-translate-y-1
                    shadow-[var(--card-shadow)]
                    ${isRoot ? 'ring-2 ring-[var(--accent-primary)]/40' : ''}
                    hover:border-[var(--accent-primary)]/30
                `}
            >
                {/* Input handle */}
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-3 !h-3 !bg-[var(--edge-active)] !border-[var(--bg-primary)] !border-2"
                />

                {/* Source anchor indicator - at top */}
                {hasAnchor && (
                    <div className="px-4 py-1.5 bg-[var(--accent-primary)]/5 border-b border-[var(--card-border)]
                                    text-[10px] text-[var(--accent-primary)] truncate pr-10 rounded-t-[var(--radius-md)] font-medium">
                        ↳ &quot;{source_anchor.text}&quot;
                    </div>
                )}

                {/* Question area */}
                <div className={`relative px-4 py-3 border-b border-[var(--card-border)] bg-[var(--bg-primary)]/30 ${!hasAnchor ? 'rounded-t-[var(--radius-md)]' : ''}`}>
                    <p className="text-sm text-[var(--text-primary)] font-medium leading-snug line-clamp-2 pr-6">
                        {content.user_prompt}
                    </p>

                    {/* Three-dot menu button - positioned absolute */}
                    <div ref={menuRef} className="absolute top-3 right-2">
                        <button
                            onClick={handleMenuClick}
                            className="p-1 rounded hover:bg-[var(--bg-dots)] transition-all"
                        >
                            <MoreVertical className="w-4 h-4 text-[var(--text-tertiary)]" />
                        </button>

                        {/* Dropdown menu */}
                        <AnimatePresence>
                            {menuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -5 }}
                                    className="absolute right-0 top-6 bg-[var(--card-bg)] border border-[var(--card-border)] 
                                               rounded-[var(--radius-sm)] shadow-[var(--card-shadow)] overflow-hidden
                                               z-[100] min-w-[120px]"
                                >
                                    <button
                                        onClick={handleDeleteClick}
                                        className="flex items-center gap-2 px-4 py-2.5 w-full
                                                   text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/10
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
                {/* Answer preview */}
                <div className="px-4 py-3 text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                    {content.ai_response ? (
                        <p className="line-clamp-2">{preview}...</p>
                    ) : (
                        <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
                            <span className="inline-block w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-pulse" />
                            <span className="inline-block w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                            <span className="inline-block w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                            <span className="ml-1 text-[var(--accent-primary)]">Thinking...</span>
                        </div>
                    )}
                </div>

                {/* Output handle */}
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!w-3 !h-3 !bg-[var(--edge-active)] !border-[var(--bg-primary)] !border-2"
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
                                       w-[320px] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[var(--radius-lg)]
                                       shadow-[var(--card-shadow)] z-[10000]
                                       overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-5">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-red-500/20 rounded-lg">
                                        <Trash2 className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-[var(--text-primary)] font-medium mb-1">Delete Node</h3>
                                        <p className="text-sm text-[var(--text-secondary)]">This will delete this node and all child nodes.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex border-t border-[var(--card-border)] bg-[var(--bg-dots)]">
                                <button
                                    onClick={handleCancelDelete}
                                    className="flex-1 px-4 py-3 text-sm text-[var(--text-secondary)] 
                                                hover:bg-[var(--card-bg)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="flex-1 px-4 py-3 text-sm text-[var(--accent-secondary)] 
                                                hover:bg-[var(--card-bg)] transition-colors
                                                border-l border-[var(--card-border)]"
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
