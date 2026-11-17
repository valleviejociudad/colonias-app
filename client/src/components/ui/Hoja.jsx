import React, { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/** Modal en PC, hoja inferior en celular. Cierra con Escape o tocando afuera. */
export default function Hoja({ open, onClose, isMobile, maxWidth = 520, children }) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const panel = isMobile
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: { duration: reduceMotion ? 0 : 0.4, ease: [0.32, 0.72, 0, 1] } }
    : { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.97 }, transition: { duration: reduceMotion ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] } };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="sheet-backdrop"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="sheet-panel"
            role="dialog"
            aria-modal="true"
            style={{ maxWidth }}
            onClick={(e) => e.stopPropagation()}
            {...panel}
          >
            <div className="sheet-handle" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
