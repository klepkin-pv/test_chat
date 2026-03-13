'use client'

import { useState } from 'react';
import { Plus } from 'lucide-react';

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
  className?: string;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export default function MessageReactions({
  messageId,
  reactions,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
  className = ''
}: MessageReactionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction.user);
    return acc;
  }, {} as Record<string, string[]>);

  const hasUserReacted = (emoji: string) => {
    return groupedReactions[emoji]?.includes(currentUserId) || false;
  };

  const handleReactionClick = (emoji: string) => {
    if (hasUserReacted(emoji)) {
      onRemoveReaction(messageId);
    } else {
      onAddReaction(messageId, emoji);
    }
  };

  const handleQuickReaction = (emoji: string) => {
    onAddReaction(messageId, emoji);
    setShowEmojiPicker(false);
  };

  if (Object.keys(groupedReactions).length === 0 && !showEmojiPicker) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 mt-1 ${className}`}>
      {/* Existing reactions */}
      {Object.entries(groupedReactions).map(([emoji, users]) => (
        <button
          key={emoji}
          onClick={() => handleReactionClick(emoji)}
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs transition-all hover:scale-105 ${
            hasUserReacted(emoji)
              ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-700'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={`${users.length} reaction${users.length > 1 ? 's' : ''}`}
        >
          <span className="mr-1">{emoji}</span>
          <span className="font-medium">{users.length}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Add reaction"
        >
          <Plus size={12} />
        </button>

        {/* Quick reactions picker */}
        {showEmojiPicker && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowEmojiPicker(false)}
            />
            <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-20 animate-bounce-in">
              <div className="flex space-x-1">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleQuickReaction(emoji)}
                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}