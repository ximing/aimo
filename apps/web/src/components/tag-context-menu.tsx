import { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';

interface TagContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onDelete: () => void;
}

export const TagContextMenu = ({
  isOpen,
  position,
  onClose,
  onDelete,
}: TagContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close menu
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Handle escape key to close menu
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Adjust position to keep menu within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 120),
    y: Math.min(position.y, window.innerHeight - 80),
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[120px] bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-gray-200 dark:border-dark-700 py-1 animate-in fade-in duration-100"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
        <span>删除</span>
      </button>
    </div>
  );
};
