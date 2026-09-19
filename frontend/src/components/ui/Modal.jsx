/* =========================================================================
   MODAL — glass dialog with spring entrance
   Only for destructive/irreversible confirmation and the override dialog.
   ========================================================================= */
import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './Button';

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const sizes = {
    sm: 'max-w-[420px]',
    md: 'max-w-[580px]',
    lg: 'max-w-[740px]',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md"
          onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 0.84, 0.32, 1] }}
            className={`
              w-full ${sizes[size]} mx-4
              glass-strong rounded-[var(--radius-lg)]
              shadow-[var(--shadow-overlay)]
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between h-[52px] px-5 border-b border-border-subtle">
              <h3 className="text-[15.5px] font-semibold text-text-primary tracking-tight">{title}</h3>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                <X size={16} />
              </Button>
            </div>
            {/* Content */}
            <div className="p-5">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
