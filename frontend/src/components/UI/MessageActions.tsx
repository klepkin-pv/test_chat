'use client'

import { useRef, useState, useEffect } from 'react';
import { getAdminApiUrl } from '@/utils/api';

const DEFAULT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

// Per-room cache
const reactionsCache: Record<string, string[]> = {};

async function fetchReactions(roomId?: string): Promise<string[]> {
  const key = roomId || '__global__';
  if (reactionsCache[key]) return reactionsCache[key];
  try {
    const url = roomId
      ? `${getAdminApiUrl()}/rooms/${roomId}/reactions`
      : `${getAdminApiUrl()}/reactions`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      reactionsCache[key] = data.reactions;
      return data.reactions;
    }
  } catch { /* ignore */ }
  return DEFAULT_REACTIONS;
}

interface MessageActionsProps {
  messageId: string;
  isOwnMessage: boolean;
  onReaction: (messageId: string, emoji: string) => void;
  contextMenu: React.ReactNode;
  children: React.ReactNode;
  roomId?: string;
}

export default function MessageActions({ messageId, isOwnMessage, onReaction, contextMenu, children, roomId }: MessageActionsProps) {
  const [showMobileReactions, setShowMobileReactions] = useState(false);
  const [quickReactions, setQuickReactions] = useState<string[]>(DEFAULT_REACTIONS);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  useEffect(() => {
    fetchReactions(roomId).then(setQuickReactions);

    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      // Invalidate cache for this room (or global)
      const key = detail?.roomId || '__global__';
      delete reactionsCache[key];
      fetchReactions(roomId).then(setQuickReactions);
    };
    window.addEventListener('reactions-updated', handleUpdate);
    return () => window.removeEventListener('reactions-updated', handleUpdate);
  }, [roomId]);

  const handleTouchStart = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setShowMobileReactions(true);
    }, 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div className={`flex items-center w-full gap-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>

      {/* Три точки */}
      <div className="flex-shrink-0 self-center">
        {contextMenu}
      </div>

      {/* Пузырь — группа для hover */}
      <div
        className="relative group select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
      >
        {children}

        {/*
          Hover-бар на десктопе.
          Позиционируем СНИЗУ пузыря (top-full) чтобы мышь плавно переходила с пузыря на бар.
          pt-1 создаёт невидимую зону перехода — мышь не покидает group.
        */}
        <div className={`absolute top-full pt-1 hidden group-hover:flex items-center gap-0.5 z-20 ${
          isOwnMessage ? 'right-0' : 'left-0'
        }`}>
          <div className="flex items-center gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg px-1.5 py-1 animate-fade-in">
            {quickReactions.map(emoji => (
              <button
                key={emoji}
                onClick={e => { e.stopPropagation(); onReaction(messageId, emoji); }}
                className="w-7 h-7 flex items-center justify-center text-base hover:scale-125 transition-transform rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Мобильный попап */}
      {showMobileReactions && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setShowMobileReactions(false)} />
          <div className={`absolute top-full mt-1 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg px-2 py-1.5 flex gap-1 animate-bounce-in ${
            isOwnMessage ? 'right-0' : 'left-0'
          }`}>
            {quickReactions.map(emoji => (
              <button
                key={emoji}
                onClick={() => { onReaction(messageId, emoji); setShowMobileReactions(false); }}
                className="w-9 h-9 flex items-center justify-center text-xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
