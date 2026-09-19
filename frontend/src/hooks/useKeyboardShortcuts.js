/* =========================================================================
   KEYBOARD SHORTCUTS — §14.2 Component Rules
   / = search, j/k = navigate queue, Enter = open, a = approve,
   Esc = close detail, ? = show help
   ========================================================================= */
import { useEffect, useCallback } from 'react';
import { useStore } from '../lib/store';

export function useKeyboardShortcuts() {
  const { incidents, selectedIncidentId, selectIncident, clearSelection } = useStore();

  const activeIncidents = incidents.filter(i => !['CLOSED', 'MERGED', 'FALSE_ALARM'].includes(i.status));

  const handleKeyDown = useCallback((e) => {
    // Don't interfere with inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    const currentIndex = activeIncidents.findIndex(i => i.id === selectedIncidentId);

    switch (e.key) {
      case '/':
        e.preventDefault();
        document.querySelector('input[placeholder*="Search"]')?.focus();
        break;

      case 'j':
        e.preventDefault();
        if (currentIndex < activeIncidents.length - 1) {
          selectIncident(activeIncidents[currentIndex + 1].id);
        } else if (currentIndex === -1 && activeIncidents.length > 0) {
          selectIncident(activeIncidents[0].id);
        }
        break;

      case 'k':
        e.preventDefault();
        if (currentIndex > 0) {
          selectIncident(activeIncidents[currentIndex - 1].id);
        }
        break;

      case 'Escape':
        e.preventDefault();
        clearSelection();
        break;

      case '?':
        e.preventDefault();
        // Show help overlay (future)
        break;

      default:
        break;
    }
  }, [activeIncidents, selectedIncidentId, selectIncident, clearSelection]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
