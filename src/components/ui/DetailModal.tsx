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
                className="bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] px-1 rounded cursor-pointer 
                           border-b border-dashed border-[var(--accent-primary)]/50
                           hover:bg-[var(--accent-primary)]/30 transition-colors font-medium"
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
                                        className="w-full max-w-[720px] max-h-[85vh] bg-[var(--card-bg)] 
                                         border border-[var(--card-border)] rounded-[var(--radius-lg)] 
                                         shadow-[var(--card-shadow)] z-50
                                         flex flex-col overflow-hidden outline-none pointer-events-auto"
                                    >
                                        {/* Header */}
                                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)] bg-[var(--card-bg)]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
                                                <Dialog.Title className="text-[var(--text-primary)] font-serif font-medium text-lg">
                                                    Details
                                                </Dialog.Title>
                                                {anchors.length > 0 && (
                                                    <span className="px-2 py-0.5 bg-[var(--bg-dots)] rounded-full text-xs text-[var(--text-secondary)]">
                                                        {anchors.length} branches
                                                    </span>
                                                )}
                                            </div>
                                            <Dialog.Close asChild>
                                                <button className="p-2 rounded-lg hover:bg-[var(--bg-dots)] transition-colors">
                                                    <X className="w-5 h-5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" />
                                                </button>
                                            </Dialog.Close>
                                        </div>

                                        {/* Content - scrollable */}
                                        {selectedNode && (
                                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                                {/* Source anchor */}
                                                {selectedNode.data.source_anchor && (
                                                    <div className="px-6 py-4 bg-[var(--accent-primary)]/5 border-b border-[var(--card-border)]">
                                                        <span className="text-[var(--accent-primary)] font-medium text-xs mr-2">↳ From:</span>
                                                        <span className="text-sm text-[var(--text-secondary)] italic">
                                                            &quot;{selectedNode.data.source_anchor.text}&quot;
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Question */}
                                                <div className="px-6 py-6 border-b border-[var(--card-border)] bg-[var(--bg-primary)]/30">
                                                    <p className="text-xs text-[var(--text-tertiary)] mb-2 font-semibold uppercase tracking-wider">Question</p>
                                                    <p className="text-xl text-[var(--text-primary)] leading-relaxed font-serif font-medium">
                                                        {selectedNode.data.content.user_prompt}
                                                    </p>
                                                </div>

                                                {/* AI Answer - text selectable */}
                                                <div
                                                    className="px-6 py-6 select-text cursor-text"
                                                    onMouseUp={handleTextSelect}
                                                >
                                                    <div className="prose prose-base max-w-none font-serif
                                                               [&_p]:text-[var(--text-primary)] [&_p]:leading-loose
                                                               [&_h1]:text-[var(--text-primary)] [&_h2]:text-[var(--text-primary)] [&_h3]:text-[var(--text-primary)]
                                                               [&_strong]:text-[var(--text-primary)] [&_strong]:font-bold
                                                               [&_code]:bg-[var(--bg-dots)] [&_code]:text-[var(--accent-secondary)] [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5
                                                               [&_pre]:bg-[var(--bg-primary)] [&_pre]:border [&_pre]:border-[var(--card-border)] [&_pre]:rounded-lg
                                                               [&_blockquote]:border-l-[var(--accent-tertiary)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[var(--text-secondary)]
                                                               [&_a]:text-[var(--accent-primary)] hover:[&_a]:underline
                                                               [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-[var(--text-primary)]
                                                               [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-[var(--text-primary)]
                                                               [&_li]:my-1
                                                               [&_table]:w-full [&_table]:border-collapse
                                                               [&_th]:border [&_th]:border-[var(--card-border)] [&_th]:p-2 [&_th]:text-[var(--text-primary)]
                                                               [&_td]:border [&_td]:border-[var(--card-border)] [&_td]:p-2 [&_td]:text-[var(--text-secondary)]
                                                               "
                                                    >
                                                        {selectedNode.data.content.ai_response ? (
                                                            <HighlightedMarkdown
                                                                content={selectedNode.data.content.ai_response}
                                                                anchors={anchors}
                                                                onAnchorClick={handleAnchorClick}
                                                            />
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-[var(--text-tertiary)] py-4">
                                                                <span className="inline-block w-2 h-2 bg-[var(--accent-primary)] rounded-full animate-pulse" />
                                                                <span className="inline-block w-2 h-2 bg-[var(--accent-primary)] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                                                                <span className="inline-block w-2 h-2 bg-[var(--accent-primary)] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                                                                <span className="ml-2">Thinking...</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Selection hint */}
                                                    {selectedNode.data.content.ai_response && (
                                                        <p className="text-xs text-[var(--text-tertiary)] mt-8 pt-4 border-t border-[var(--card-border)]">
                                                            💡 Select any text to ask a follow-up question
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Anchor Bubbles - show explored branches as chips */}
                                                {anchors.length > 0 && (
                                                    <div className="px-6 py-4 border-t border-[var(--card-border)] bg-[var(--bg-primary)]/20">
                                                        <p className="text-xs text-[var(--text-tertiary)] mb-3 font-semibold uppercase tracking-wider">
                                                            Explored Links ({anchors.length})
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {anchors.map((anchor) => (
                                                                <button
                                                                    key={anchor.childId}
                                                                    onClick={() => setSelectedNodeForSheet(anchor.childId)}
                                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full
                                                                           bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20
                                                                           border border-[var(--accent-primary)]/20 hover:border-[var(--accent-primary)]/40
                                                                           transition-all group cursor-pointer"
                                                                    title={anchor.question}
                                                                >
                                                                    <span className="text-xs text-[var(--text-secondary)] italic max-w-[150px] truncate">
                                                                        &quot;{anchor.text}&quot;
                                                                    </span>
                                                                    <span className="text-[var(--accent-primary)]/60 group-hover:text-[var(--accent-primary)]">→</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Footer */}
                                        {selectedNode && (
                                            <div className="px-6 py-4 border-t border-[var(--card-border)] bg-[var(--card-bg)]">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        {selectedNode.data.parent_id && (
                                                            <button
                                                                onClick={() => setSelectedNodeForSheet(selectedNode.data.parent_id)}
                                                                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                                            >
                                                                ← Back to parent
                                                            </button>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={handleDeleteClick}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                                               text-[var(--accent-secondary)]/80 hover:text-[var(--accent-secondary)]
                                                               hover:bg-[var(--accent-secondary)]/10
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
                                       w-[340px] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[var(--radius-lg)]
                                       shadow-[var(--card-shadow)] z-[10000]
                                       overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-[var(--accent-secondary)]/10 rounded-full">
                                        <Trash2 className="w-5 h-5 text-[var(--accent-secondary)]" />
                                    </div>
                                    <div>
                                        <h3 className="text-[var(--text-primary)] font-medium mb-1">Delete Node</h3>
                                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">This will delete this node and all child nodes. This cannot be undone.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex border-t border-[var(--card-border)] bg-[var(--bg-dots)]">
                                <button
                                    onClick={handleCancelDelete}
                                    className="flex-1 px-4 py-3 text-sm text-[var(--text-secondary)] 
                                               hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="flex-1 px-4 py-3 text-sm text-[var(--accent-secondary)] 
                                               hover:bg-[var(--card-bg)] transition-colors
                                               border-l border-[var(--card-border)] font-medium"
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
