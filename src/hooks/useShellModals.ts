/**
 * Shell-level modal wiring.
 *
 * Owns the open flags for the app-wide modals plus every global way of opening
 * them (command registry entries and the drag-and-drop import target), so the
 * keyboard-shortcut hook and the command listeners share one source of truth.
 */
import { useEffect, useRef, useState } from 'react';
import { commands } from '../lib/commands';

export function useShellModals() {
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFiles, setImportFiles] = useState<File[] | undefined>(undefined);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  // Time entries are logged through the global quick-log modal (the Time
  // screen has no new-entry trigger of its own). This wires the checklist
  // and the Cmd/Ctrl+N shortcut, which previously dispatched to nothing.
  useEffect(() => {
    const onAddTime = () => setShowQuickLogModal(true);
    commands.on('lance:add-time', onAddTime);
    return () => commands.off('lance:add-time', onAddTime);
  }, []);

  // Global drag-and-drop for import
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (dragCounter.current === 1) {
        setIsDragOver(true);
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsDragOver(false);
      }
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragOver(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        setImportFiles(files);
        setShowImportModal(true);
      }
    };

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Listen for lance:open-import (sidebar button)
  useEffect(() => {
    const onOpenImport = () => {
      setImportFiles(undefined);
      setShowImportModal(true);
    };
    commands.on('lance:open-import', onOpenImport);
    return () => commands.off('lance:open-import', onOpenImport);
  }, []);

  // Open command palette from Topbar search
  useEffect(() => {
    const onOpenCommand = () => setShowCommandPalette(true);
    commands.on('lance:open-command', onOpenCommand);
    return () => commands.off('lance:open-command', onOpenCommand);
  }, []);

  const closeImport = () => {
    setShowImportModal(false);
    setImportFiles(undefined);
  };

  return {
    showCommandPalette,
    setShowCommandPalette,
    showShortcuts,
    setShowShortcuts,
    showQuickLogModal,
    setShowQuickLogModal,
    showImportModal,
    importFiles,
    isDragOver,
    closeImport,
  };
}
