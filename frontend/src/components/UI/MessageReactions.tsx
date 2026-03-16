'use client'

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

export default function MessageReactions({
  messageId,
  reactions,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
}: MessageReactionsProps) {
  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r.user);
    return acc;
  }, {} as Record<string, string[]>);

  if (Object.keys(groupedReactions).length === 0) return null;

  const userEmoji = reactions.find(r => r.user === currentUserId)?.emoji;

  return (
    // Абсолютно позиционирован внутри пузыря, снизу-справа, немного выступает
    <div className="absolute -bottom-2.5 right-1 flex gap-0.5 z-10">
      {Object.entries(groupedReactions).map(([emoji, users]) => (
        <button
          key={emoji}
          onClick={() => userEmoji === emoji ? onRemoveReaction(messageId) : onAddReaction(messageId, emoji)}
          className="text-sm leading-none px-1 py-0.5 rounded-full transition-transform hover:scale-110"
          title={`${users.length}`}
        >
          {emoji}{users.length > 1 && <span className="text-xs ml-0.5 opacity-70">{users.length}</span>}
        </button>
      ))}
    </div>
  );
}
