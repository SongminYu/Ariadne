'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300]"
                        onClick={onCancel}
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                                   w-[340px] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[var(--radius-lg)]
                                   shadow-2xl z-[301] overflow-hidden"
                    >
                        <div className="p-5">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-red-500/10 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-[var(--text-primary)] font-medium mb-1">{title}</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">{message}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex border-t border-[var(--card-border)]">
                            <button
                                onClick={onCancel}
                                className="flex-1 px-4 py-3 text-sm text-[var(--text-secondary)] 
                                           hover:bg-[var(--bg-dots)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex-1 px-4 py-3 text-sm text-red-500 
                                           hover:bg-red-500/5 transition-colors
                                           border-l border-[var(--card-border)]"
                            >
                                Confirm
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
