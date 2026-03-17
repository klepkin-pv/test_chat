'use client'

import { useEffect, useMemo, useState } from 'react';
import { CATEGORY_ICONS, getReactionCategories } from './reactionCatalog';

interface ExpandedReactionPickerProps {
  availableReactions: string[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  title?: string;
}

export default function ExpandedReactionPicker({
  availableReactions,
  isOpen,
  onClose,
  onSelect,
}: ExpandedReactionPickerProps) {
  const categories = useMemo(
    () => getReactionCategories(availableReactions),
    [availableReactions]
  );
  const [activeCategoryId, setActiveCategoryId] = useState<string>(categories[0]?.id || 'hands');

  // Reset to first tab on every open
  useEffect(() => {
    if (isOpen) {
      setActiveCategoryId(categories[0]?.id || 'hands');
    }
  }, [isOpen, categories]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeCategory = categories.find((c) => c.id === activeCategoryId) || categories[0];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 md:items-center" onClick={onClose}>
      <div
        className="flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Category tabs — emoji icons, no scrollbar */}
        <div className="flex gap-1 border-b border-gray-200 px-3 py-2 dark:border-gray-700 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              title={category.label}
              onClick={() => setActiveCategoryId(category.id)}
              className={`flex-shrink-0 rounded-full px-2.5 py-1 text-lg transition-colors ${
                category.id === activeCategory?.id
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 scale-110'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 opacity-60 hover:opacity-100'
              }`}
            >
              {CATEGORY_ICONS[category.id] ?? category.emojis[0]}
            </button>
          ))}
        </div>

        {/* Emoji grid */}
        <div className="grid grid-cols-7 gap-2 overflow-y-auto p-4 sm:grid-cols-8" style={{ scrollbarWidth: 'none' }}>
          {activeCategory?.emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onSelect(emoji); onClose(); }}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition-transform hover:scale-110 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
