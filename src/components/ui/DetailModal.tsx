'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useCanvasStore } from '@/stores/useCanvasStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { X, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState, Fragment, useRef } from 'react';
import SelectionPopover from './SelectionPopover';

interface DetailModalProps {
    onFollowUp?: (question: string) => void;
}

// Helper function to highlight all anchor texts in a string
function highlightAnchorsInText(
    text: string,
    anchors: { text: string; childId: string }[],
    onAnchorClick: (childId: string) => void
): React.ReactNode {
    if (!text || anchors.length === 0) return text;

    // Build a list of all matches with their positions
    const matches: { start: number; end: number; anchor: typeof anchors[0] }[] = [];
    const lowerText = text.toLowerCase();

    for (const anchor of anchors) {
        const anchorLower = anchor.text.toLowerCase();
        let searchStart = 0;

        while (searchStart < text.length) {
            const idx = lowerText.indexOf(anchorLower, searchStart);
            if (idx === -1) break;

            matches.push({
                start: idx,
                end: idx + anchor.text.length,
                anchor: anchor
            });
            searchStart = idx + anchor.text.length;
        }
    }

    if (matches.length === 0) return text;

    // Sort by start position
    matches.sort((a, b) => a.start - b.start);

    // Remove overlapping matches (keep earlier ones)
    const filteredMatches: typeof matches = [];
    for (const match of matches) {
        const lastMatch = filteredMatches[filteredMatches.length - 1];
        if (!lastMatch || match.start >= lastMatch.end) {
            filteredMatches.push(match);
        }
    }

    // Build result with highlights
    const result: React.ReactNode[] = [];
    let lastEnd = 0;

    for (let i = 0; i < filteredMatches.length; i++) {
        const match = filteredMatches[i];

        // Add text before this match
        if (match.start > lastEnd) {
            result.push(text.slice(lastEnd, match.start));
        }

        // Add highlighted match
        result.push(
            <span
                key={`anchor-${i}`}
                className="bg-cyan-400/20 text-cyan-300 px-0.5 rounded cursor-pointer 
                           border-b-2 border-dashed border-cyan-400/50
                           hover:bg-cyan-400/30 transition-colors"
                onClick={(e) => {
                    e.stopPropagation();
                    onAnchorClick(match.anchor.childId);
                }}
                title={`Click to view: ${match.anchor.text}`}
            >
                {text.slice(match.start, match.end)}
            </span>
        );

        lastEnd = match.end;
    }

    // Add remaining text
    if (lastEnd < text.length) {
        result.push(text.slice(lastEnd));
    }

    return <>{result}</>;
}

// Custom component to highlight anchor text in markdown content
function HighlightedMarkdown({
    content,
    anchors,
    onAnchorClick
}: {
    content: string;
    anchors: { text: string; childId: string }[];
    onAnchorClick: (childId: string) => void;
}) {
    const components = useMemo(() => ({
        p: ({ children, ...props }: any) => {
            // Process children recursively
            const processChild = (child: any): React.ReactNode => {
                if (typeof child === 'string') {
                    return highlightAnchorsInText(child, anchors, onAnchorClick);
                }
                return child;
            };

            const processedChildren = Array.isArray(children)
                ? children.map((child, i) => <Fragment key={i}>{processChild(child)}</Fragment>)
                : processChild(children);

            return <p {...props}>{processedChildren}</p>;
        },
        strong: ({ children, ...props }: any) => {
            const processChild = (child: any): React.ReactNode => {
                if (typeof child === 'string') {
                    return highlightAnchorsInText(child, anchors, onAnchorClick);
                }
                return child;
            };

            const processedChildren = Array.isArray(children)
                ? children.map((child, i) => <Fragment key={i}>{processChild(child)}</Fragment>)
                : processChild(children);

            return <strong {...props}>{processedChildren}</strong>;
        },
        li: ({ children, ...props }: any) => {
            const processChild = (child: any): React.ReactNode => {
                if (typeof child === 'string') {
                    return highlightAnchorsInText(child, anchors, onAnchorClick);
                }
                return child;
            };

            const processedChildren = Array.isArray(children)
                ? children.map((child, i) => <Fragment key={i}>{processChild(child)}</Fragment>)
                : processChild(children);

            return <li {...props}>{processedChildren}</li>;
        }
    }), [anchors, onAnchorClick]);

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={components}
        >
            {content}
        </ReactMarkdown>
    );
}

export default function DetailModal({ onFollowUp }: DetailModalProps) {
    const {
        nodes,
        edges,
        selectedNodeIdForSheet,
        setSelectedNodeForSheet,
        setSelectedAnchor,
        deleteNode,
        selectedAnchor,
    } = useCanvasStore();

    const [showConfirm, setShowConfirm] = useState(false);
    const selectedNode = nodes.find(n => n.id === selectedNodeIdForSheet);

    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate relative position for the popover
    const popoverPosition = useMemo(() => {
        if (!selectedAnchor?.position || !containerRef.current) return selectedAnchor?.position || { x: 0, y: 0 };

        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: selectedAnchor.position.x - rect.left,
            y: selectedAnchor.position.y - rect.top
        };
    }, [selectedAnchor?.position, containerRef.current]);

    const handleClose = useCallback(() => {
        setSelectedNodeForSheet(null);
    }, [setSelectedNodeForSheet]);

    // Find all child edges (branches created from this node)
    const childEdges = useMemo(() => {
        if (!selectedNode) return [];
        return edges.filter(e => e.source === selectedNode.id);
    }, [edges, selectedNode]);

    // Get anchor info for child nodes
    const anchors = useMemo(() => {
        if (!selectedNode) return [];
        return childEdges.map(edge => {
            const childNode = nodes.find(n => n.id === edge.target);
            return {
                edgeId: edge.id,
                childId: edge.target,
                text: childNode?.data.source_anchor?.text || '',
                question: childNode?.data.content.user_prompt || '',
            };
        }).filter(a => a.text);
    }, [childEdges, nodes, selectedNode]);

    // Handle text selection
    const handleTextSelect = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim() && selectedNode) {
            const selectedText = selection.toString().trim();
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            setSelectedAnchor({
                nodeId: selectedNode.id,
                text: selectedText,
                range: {
                    start: range.startOffset,
                    end: range.endOffset,
                },
                position: {
                    x: rect.left + rect.width / 2,
                    y: rect.bottom,
                },
            } as any);
        }
    }, [selectedNode, setSelectedAnchor]);

    // Handle delete
    const handleDeleteClick = useCallback(() => {
        setShowConfirm(true);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (!selectedNode) return;
        const nodeId = selectedNode.id;
        setShowConfirm(false);
        setSelectedNodeForSheet(null);
        setTimeout(() => {
            deleteNode(nodeId);
        }, 100);
    }, [selectedNode, deleteNode, setSelectedNodeForSheet]);

    const handleCancelDelete = useCallback(() => {
        setShowConfirm(false);
    }, []);

    const handleAnchorClick = useCallback((childId: string) => {
        setSelectedNodeForSheet(childId);
    }, [setSelectedNodeForSheet]);

    return (
        <>
            <Dialog.Root
                open={!!selectedNodeIdForSheet && !showConfirm}
                onOpenChange={(open) => {
                    if (!open) {
                        handleClose();
                    }
                }}
            >
                <AnimatePresence>
                    {selectedNodeIdForSheet && !showConfirm && (
                        <Dialog.Portal forceMount>
                            {/* Backdrop */}


                            <Dialog.Overlay asChild>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
                                />
                            </Dialog.Overlay>
                            <Dialog.Content
                                className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
                                onInteractOutside={(e) => {
                                    // Interaction handled by wrapper onClick
                                }}
                            >
                                <div
                                    ref={containerRef}
                                    className="w-full h-full flex flex-col items-center justify-center relative pointer-events-auto"
                                    onClick={(e) => {
                                        if (e.target === e.currentTarget) {
                                            handleClose();
                                        }
                                    }}
                                >
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                        className="w-full max-w-[720px] max-h-[85vh] bg-[#1a1a2e] 
                                         border border-white/10 rounded-2xl 
                                         shadow-2xl z-50
                                         flex flex-col overflow-hidden outline-none pointer-events-auto"
                                    >
                                        {/* Header */}
                                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                                <Dialog.Title className="text-white/90 font-medium">
                                                    Details
                                                </Dialog.Title>
                                                {anchors.length > 0 && (
                                                    <span className="px-2 py-0.5 bg-cyan-400/20 rounded-full text-xs text-cyan-300">
                                                        {anchors.length} branches
                                                    </span>
                                                )}
                                            </div>
                                            <Dialog.Close asChild>
                                                <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                                                    <X className="w-4 h-4 text-white/40" />
                                                </button>
                                            </Dialog.Close>
                                        </div>

                                        {/* Content - scrollable */}
                                        {selectedNode && (
                                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                                {/* Source anchor */}
                                                {selectedNode.data.source_anchor && (
                                                    <div className="px-6 py-3 bg-cyan-400/5 border-b border-cyan-400/10">
                                                        <span className="text-cyan-400/60 text-xs mr-2">↳ From:</span>
                                                        <span className="text-sm text-cyan-300/80 italic">
                                                            "{selectedNode.data.source_anchor.text}"
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Question */}
                                                <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                                                    <p className="text-xs text-white/40 mb-2 font-medium">💭 Question</p>
                                                    <p className="text-lg text-white/90 leading-relaxed font-medium">
                                                        {selectedNode.data.content.user_prompt}
                                                    </p>
                                                </div>

                                                {/* AI Answer - text selectable */}
                                                <div
                                                    className="px-6 py-5 select-text cursor-text"
                                                    onMouseUp={handleTextSelect}
                                                >
                                                    <p className="text-xs text-white/40 mb-4 font-medium">✨ Answer</p>
                                                    <div className="prose prose-invert prose-base max-w-none
                                                               [&_p]:my-3 [&_ul]:my-3 [&_ol]:my-3
                                                               [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-cyan-300
                                                               [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base
                                                               [&_h1]:text-white/90 [&_h2]:text-white/90 [&_h3]:text-white/80
                                                               [&_a]:text-cyan-400 [&_a]:no-underline hover:[&_a]:underline
                                                               [&_blockquote]:border-l-cyan-400/50 [&_blockquote]:bg-white/5 [&_blockquote]:px-4 [&_blockquote]:py-2
                                                               [&_pre]:bg-white/5 [&_pre]:rounded-lg [&_pre]:p-4
                                                               text-white/80 leading-relaxed">
                                                        {selectedNode.data.content.ai_response ? (
                                                            <HighlightedMarkdown
                                                                content={selectedNode.data.content.ai_response}
                                                                anchors={anchors}
                                                                onAnchorClick={handleAnchorClick}
                                                            />
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-white/40 py-4">
                                                                <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                                                                <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                                                                <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                                                                <span className="ml-2">Loading...</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Selection hint */}
                                                    {selectedNode.data.content.ai_response && (
                                                        <p className="text-xs text-white/30 mt-6 pt-4 border-t border-white/5">
                                                            💡 Select any text to ask a follow-up question
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Anchor Bubbles - show explored branches as chips */}
                                                {anchors.length > 0 && (
                                                    <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02]">
                                                        <p className="text-xs text-white/40 mb-3 font-medium">
                                                            🔗 Explored from this answer ({anchors.length})
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {anchors.map((anchor) => (
                                                                <button
                                                                    key={anchor.childId}
                                                                    onClick={() => setSelectedNodeForSheet(anchor.childId)}
                                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full
                                                                           bg-cyan-400/10 hover:bg-cyan-400/20
                                                                           border border-cyan-400/30 hover:border-cyan-400/50
                                                                           transition-all group cursor-pointer"
                                                                    title={anchor.question}
                                                                >
                                                                    <span className="text-xs text-cyan-300 italic max-w-[150px] truncate">
                                                                        "{anchor.text}"
                                                                    </span>
                                                                    <span className="text-cyan-400/60 group-hover:text-cyan-400">→</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Footer */}
                                        {selectedNode && (
                                            <div className="px-6 py-3 border-t border-white/5 bg-white/[0.02]">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        {selectedNode.data.parent_id && (
                                                            <button
                                                                onClick={() => setSelectedNodeForSheet(selectedNode.data.parent_id)}
                                                                className="text-xs text-white/30 hover:text-cyan-400 transition-colors"
                                                            >
                                                                ← Back to parent
                                                            </button>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={handleDeleteClick}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                                               text-red-400/70 hover:text-red-400
                                                               hover:bg-red-500/10
                                                               text-xs transition-all"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>

                                    {/* Internal Selection Popover */}
                                    {selectedAnchor && (selectedAnchor as any).position && onFollowUp && (
                                        <SelectionPopover
                                            isOpen={true}
                                            variant="absolute"
                                            position={popoverPosition}
                                            selectedText={selectedAnchor.text}
                                            onSubmit={onFollowUp}
                                            onClose={() => setSelectedAnchor(null)}
                                        />
                                    )}
                                </div>
                            </Dialog.Content>
                        </Dialog.Portal>
                    )}
                </AnimatePresence>
            </Dialog.Root>

            {/* Confirmation Dialog for deletion */}
            <AnimatePresence>
                {showConfirm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 z-[9999]"
                            onClick={handleCancelDelete}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                                       w-[340px] bg-[#1a1a2e] border border-white/20 rounded-xl
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
                                        <p className="text-sm text-white/60">This will delete this node and all child nodes. This cannot be undone.</p>
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
