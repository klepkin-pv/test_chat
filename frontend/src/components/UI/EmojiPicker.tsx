'use client'

import { useState } from 'react';
import { Smile } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

const EMOJI_CATEGORIES = {
  smileys: {
    name: '😊 Смайлы',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐']
  },
  gestures: {
    name: '👋 Жесты',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏']
  },
  hearts: {
    name: '❤️ Сердца',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟']
  },
  objects: {
    name: '🎉 Объекты',
    emojis: ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⭐', '🌟', '💫', '✨', '🔥', '💯', '💢', '💥', '💦', '💨', '🕳️', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤']
  }
};

export default function EmojiPicker({ onEmojiSelect, className = '' }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('smileys');

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors button-press"
        title="Добавить эмодзи"
      >
        <Smile size={20} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
            data-testid="emoji-picker-overlay"
          />
          
          {/* Emoji Picker */}
          <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 animate-bounce-in">
            <div className="w-80 max-h-96">
              {/* Categories */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 p-2">
                {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key)}
                    className={`px-3 py-2 text-sm rounded-md transition-colors ${
                      activeCategory === key
                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {category.name.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Emoji Grid */}
              <div className="p-3 max-h-64 overflow-y-auto chat-scrollbar">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].emojis.map((emoji, index) => (
                    <button
                      key={`${emoji}-${index}`}
                      onClick={() => handleEmojiClick(emoji)}
                      className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors button-press"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                Выберите эмодзи
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}