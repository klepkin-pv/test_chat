'use client'

import { useEffect, useRef, useState } from 'react';
import ExpandedReactionPicker from '@/components/UI/ExpandedReactionPicker';
import {
  ALL_REACTIONS,
  DEFAULT_REACTIONS,
  QUICK_REACTIONS_LIMIT,
} from '@/components/UI/reactionCatalog';
import { getAdminApiUrl } from '@/utils/api';
import { useAuthStore } from '@/store/authStore';

const reactionsCache: Record<string, string[]> = {};
const reactionsFetchPromise: Record<string, Promise<string[]> | undefined> = {};

async function fetchReactions(roomId?: string, token?: string): Promise<string[]> {
  if (!roomId) {
    return ALL_REACTIONS;
  }

  const key = roomId;
  if (reactionsCache[key]) return reactionsCache[key];
  if (reactionsFetchPromise[key]) return reactionsFetchPromise[key];

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  reactionsFetchPromise[key] = (async () => {
    try {
      const response = await fetch(`${getAdminApiUrl()}/rooms/${roomId}/reactions`, { headers });
      if (response.ok) {
        const data = await response.json();
        reactionsCache[key] = data.reactions;
        return data.reactions as string[];
      }
    } catch {
      // Ignore transient fetch errors and fall back to defaults.
    }

    return DEFAULT_REACTIONS;
  })().finally(() => {
    delete reactionsFetchPromise[key];
  });

  return reactionsFetchPromise[key];
}

interface MessageActionsProps {
  messageId: string;
  isOwnMessage: boolean;
  onReaction: (messageId: string, emoji: string) => void;
  contextMenu: React.ReactNode;
  children: React.ReactNode;
  roomId?: string;
}

export default function MessageActions({
  messageId,
  isOwnMessage,
  onReaction,
  contextMenu,
  children,
  roomId,
}: MessageActionsProps) {
  const [showMobileReactions, setShowMobileReactions] = useState(false);
  const [showExpandedPicker, setShowExpandedPicker] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [hoverVisible, setHoverVisible] = useState(false);
  const [availableReactions, setAvailableReactions] = useState<string[]>(roomId ? DEFAULT_REACTIONS : ALL_REACTIONS);
  const [quickReactions, setQuickReactions] = useState<string[]>(DEFAULT_REACTIONS);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    let isMounted = true;

    const loadReactions = async () => {
      const fetchedReactions = await fetchReactions(roomId, token ?? undefined);
      if (!isMounted) {
        return;
      }

      const normalized = Array.from(new Set(fetchedReactions));
      setAvailableReactions(normalized);
      setQuickReactions(
        roomId ? normalized.slice(0, QUICK_REACTIONS_LIMIT) : DEFAULT_REACTIONS
      );
    };

    loadReactions();

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const updatedRoomId = detail?.roomId;
      if (!roomId || updatedRoomId !== roomId) {
        return;
      }

      delete reactionsCache[roomId];
      loadReactions();
    };

    window.addEventListener('reactions-updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('reactions-updated', handleUpdate);
    };
  }, [roomId, token]);

  useEffect(() => {
    const handleMenuToggle = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const openForCurrentMessage = detail?.messageId === messageId && !!detail?.isOpen;
      setIsContextMenuOpen(openForCurrentMessage);

      if (openForCurrentMessage) {
        setShowMobileReactions(false);
        setShowExpandedPicker(false);
        setHoverVisible(false);
      }
    };

    window.addEventListener('message-context-menu-toggle', handleMenuToggle);
    return () => window.removeEventListener('message-context-menu-toggle', handleMenuToggle);
  }, [messageId]);

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowMobileReactions(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => setHoverVisible(true), 500);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoverVisible(false);
  };

  const handleReactionSelect = (emoji: string) => {
    onReaction(messageId, emoji);
    setShowMobileReactions(false);
    setShowExpandedPicker(false);
  };

  const canExpand = availableReactions.length > quickReactions.length;

  return (
    <div className={`flex w-full items-center gap-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="flex-shrink-0 self-center">{contextMenu}</div>

      <div
        className="relative group select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}

        <div
          className={`absolute top-full z-10 items-center gap-0.5 pt-1 ${
            isContextMenuOpen || !hoverVisible ? 'hidden' : 'flex'
          } ${isOwnMessage ? 'right-0' : 'left-0'}`}
        >
          <div className="flex items-center gap-0.5 rounded-full border border-gray-200 bg-white px-1.5 py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={(event) => {
                  event.stopPropagation();
                  handleReactionSelect(emoji);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-base transition-transform hover:scale-125 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {emoji}
              </button>
            ))}
            {canExpand && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowExpandedPicker(true);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                title="Все реакции"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {showMobileReactions && !isContextMenuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMobileReactions(false)} />
          <div
            className={`absolute top-full z-10 mt-1 flex items-center gap-1 rounded-2xl border border-gray-200 bg-white px-2 py-1.5 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
              isOwnMessage ? 'right-0' : 'left-0'
            }`}
          >
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReactionSelect(emoji)}
                className="flex h-9 w-9 items-center justify-center text-xl transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
            {canExpand && (
              <button
                type="button"
                onClick={() => {
                  setShowMobileReactions(false);
                  setShowExpandedPicker(true);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                title="Все реакции"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}
          </div>
        </>
      )}

      <ExpandedReactionPicker
        availableReactions={availableReactions}
        isOpen={showExpandedPicker && !isContextMenuOpen}
        onClose={() => setShowExpandedPicker(false)}
        onSelect={handleReactionSelect}
        title={roomId ? 'Реакции комнаты' : 'Все реакции'}
      />
    </div>
  );
}
