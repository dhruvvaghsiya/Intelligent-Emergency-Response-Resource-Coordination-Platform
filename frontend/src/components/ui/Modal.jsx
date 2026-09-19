/* =========================================================================
   MODAL — §14.2 Component Rules
   Only for destructive/irreversible confirmation and the override dialog.
   ========================================================================= */
import React, { useEffect, useRef } from 'react';
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

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-[400px]',
    md: 'max-w-[560px]',
    lg: 'max-w-[720px]',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className={`
          w-full ${sizes[size]} mx-4
          bg-raised border border-border-strong rounded-[6px]
          shadow-overlay animate-fade-slide-in
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-[44px] px-4 border-b border-border-subtle">
          <h3 className="text-[15px] font-medium text-text-primary">{title}</h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </Button>
        </div>
        {/* Content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
