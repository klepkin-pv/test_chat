'use client'

import { useState } from 'react';

interface Reaction {
  user: string;
  emoji: string;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  currentUserId: string;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string) => void;
  isOwnMessage?: boolean;
}

const VISIBLE_LIMIT = 6;

export default function MessageReactions({
  messageId,
  reactions,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
}: MessageReactionsProps) {
  const [expanded, setExpanded] = useState(false);

  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r.user);
    return acc;
  }, {} as Record<string, string[]>);

  const entries = Object.entries(groupedReactions);
  if (entries.length === 0) return null;

  const userEmoji = reactions.find(r => r.user === currentUserId)?.emoji;
  const visibleEntries = expanded ? entries : entries.slice(0, VISIBLE_LIMIT);
  const hiddenCount = entries.length - VISIBLE_LIMIT;

  return (
    <div className="absolute -bottom-2.5 right-1 flex flex-wrap gap-0.5 z-10 max-w-[200px]">
      {visibleEntries.map(([emoji, users]) => (
        <button
          key={emoji}
          onClick={() => userEmoji === emoji ? onRemoveReaction(messageId) : onAddReaction(messageId, emoji)}
          className={`text-sm leading-none px-1 py-0.5 rounded-full transition-transform hover:scale-110 ${
            userEmoji === emoji ? 'bg-indigo-100 dark:bg-indigo-900/50 ring-1 ring-indigo-400' : ''
          }`}
          title={`${users.length}`}
        >
          {emoji}{users.length > 1 && <span className="text-xs ml-0.5 opacity-70">{users.length}</span>}
        </button>
      ))}
      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs leading-none px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          +{hiddenCount}
        </button>
      )}
      {expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(false)}
          className="text-xs leading-none px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          ↑
        </button>
      )}
    </div>
  );
}
