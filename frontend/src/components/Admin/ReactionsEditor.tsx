'use client'

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getAdminApiUrl } from '@/utils/api';

const DEFAULT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

type EmojiCategory = { label: string; emojis: string[] };

const EMOJI_CATEGORIES: EmojiCategory[] = [
  { label: 'Smiles', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕'] },
  { label: 'Hands', emojis: ['👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👋','🤚','🖐️','✋','🖖','👏','🙌','🤲','🤝','🙏','✍️','💪','👀','👅','👄'] },
  { label: 'Hearts', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'] },
  { label: 'Animals', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🐢','🐍','🦎','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🐈','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦦','🦥','🐁','🐀','🐿️','🦔'] },
  { label: 'Food', emojis: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🥙','🧆','🌮','🌯','🥗','🥘','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','☕','🍵','🫖','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊'] },
  { label: 'Symbols', emojis: ['🔥','⭐','✨','💫','⚡','🌈','☀️','🌙','❄️','💥','🎉','🎊','🎈','🎁','🏆','🥇','🎯','💯','✅','❌','⚠️','🚀','💡','🔔','📢','💬','💭','📌','🔑','🔒','🔓','💎','👑','🌟','🍀','🌸','🌺','🌻','🌹','🌷','🌼','🌿','🍃','🍂','🍁','🌊','🌀','🌪️','☁️','⛅','🌤️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','💧','💦','☔','⚡','🌠','🌌','🌃','🌆','🌇','🌉'] },
];

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
    fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setReactions(d.reactions || DEFAULT_REACTIONS))
      .catch(() => {});
  }, [apiUrl, token]);

  const handleToggle = (emoji: string) => {
    setReactions(prev =>
      prev.includes(emoji) ? prev.filter(e => e !== emoji) : [...prev, emoji]
    );
  };

  const handleRemove = (emoji: string) => {
    setReactions(prev => prev.filter(e => e !== emoji));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reactions }),
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('reactions-updated', { detail: { roomId } }));
        setSaved(true);
        setTimeout(() => { setSaved(false); onClose(); }, 1000);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg mx-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reactions</h3>
            {roomName && <p className="text-xs text-gray-500 dark:text-gray-400">#{roomName}</p>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><X size={20} /></button>
        </div>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Selected ({reactions.length})</p>
          <div className="flex flex-wrap gap-1 min-h-[36px]">
            {reactions.map(emoji => (
              <span key={emoji} className="flex items-center gap-0.5 bg-indigo-100 dark:bg-indigo-900 rounded-full px-2 py-0.5 text-base">
                {emoji}
                <button onClick={() => handleRemove(emoji)} className="text-gray-400 hover:text-red-500 ml-0.5 leading-none">
                  <X size={10} />
                </button>
              </span>
            ))}
            {reactions.length === 0 && <span className="text-sm text-gray-400">No reactions selected</span>}
          </div>
        </div>
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 px-2 pt-2 gap-1 flex-shrink-0">
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button key={i} onClick={() => setActiveCategory(i)}
              className={`px-3 py-1.5 text-xs rounded-t whitespace-nowrap transition-colors ${activeCategory === i ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >{cat.label}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-10 gap-0.5">
            {EMOJI_CATEGORIES[activeCategory].emojis.map(emoji => (
              <button key={emoji} onClick={() => handleToggle(emoji)} title={emoji}
                className={`text-xl p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${reactions.includes(emoji) ? 'bg-indigo-100 dark:bg-indigo-900 ring-1 ring-indigo-400' : ''}`}
              >{emoji}</button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={handleSave} disabled={loading || reactions.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 transition-colors"
          >
            <Save size={16} />
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
