'use client'

import { useEffect, useState } from 'react';
import { X, Save } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getAdminApiUrl } from '@/utils/api';
import { DEFAULT_REACTIONS, REACTION_CATEGORIES } from '@/components/UI/reactionCatalog';

interface ReactionsEditorProps {
  onClose: () => void;
  roomId?: string;
  roomName?: string;
}

export default function ReactionsEditor({ onClose, roomId, roomName }: ReactionsEditorProps) {
  const { token } = useAuthStore();
  const [reactions, setReactions] = useState<string[]>(DEFAULT_REACTIONS);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  const apiUrl = roomId
    ? `${getAdminApiUrl()}/rooms/${roomId}/reactions`
    : `${getAdminApiUrl()}/reactions`;

  useEffect(() => {
    fetch(apiUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.json())
      .then((data) => setReactions(data.reactions || DEFAULT_REACTIONS))
      .catch(() => {});
  }, [apiUrl, token]);

  const handleToggle = (emoji: string) => {
    setReactions((previous) =>
      previous.includes(emoji)
        ? previous.filter((item) => item !== emoji)
        : [...previous, emoji]
    );
  };

  const handleRemove = (emoji: string) => {
    setReactions((previous) => previous.filter((item) => item !== emoji));
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reactions }),
      });

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('reactions-updated', { detail: { roomId } }));
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          onClose();
        }, 1000);
      }
    } catch {
      // Ignore save errors in the editor UI and keep the modal open.
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="mx-4 flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-white dark:bg-gray-800"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reactions</h3>
            {roomName && <p className="text-xs text-gray-500 dark:text-gray-400">#{roomName}</p>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Selected ({reactions.length})</p>
          <div className="flex min-h-[36px] flex-wrap gap-1">
            {reactions.map((emoji) => (
              <span
                key={emoji}
                className="flex items-center gap-0.5 rounded-full bg-indigo-100 px-2 py-0.5 text-base dark:bg-indigo-900"
              >
                {emoji}
                <button
                  onClick={() => handleRemove(emoji)}
                  className="ml-0.5 leading-none text-gray-400 hover:text-red-500"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            {reactions.length === 0 && (
              <span className="text-sm text-gray-400">No reactions selected</span>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 gap-1 overflow-x-auto border-b border-gray-200 px-2 pt-2 dark:border-gray-700">
          {REACTION_CATEGORIES.map((category, index) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(index)}
              className={`whitespace-nowrap rounded-t px-3 py-1.5 text-xs transition-colors ${
                activeCategory === index
                  ? 'bg-indigo-100 font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
            {REACTION_CATEGORIES[activeCategory].emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleToggle(emoji)}
                title={emoji}
                className={`rounded p-1 text-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  reactions.includes(emoji) ? 'bg-indigo-100 ring-1 ring-indigo-400 dark:bg-indigo-900' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={loading || reactions.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            <Save size={16} />
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
