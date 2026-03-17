'use client'

import { useState } from 'react';
import { X, Users, Edit2, Trash2, Search, LogOut, UserX } from 'lucide-react';
import ReactionsEditor from '@/components/Admin/ReactionsEditor';
import UserProfileCard from '@/components/User/UserProfileCard';
import EditRoomModal from './EditRoomModal';
import { getChatApiUrl, buildAvatarUrl } from '@/utils/api';
import { useAuthStore } from '@/store/authStore';

interface Member {
  _id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  role: 'user' | 'moderator' | 'admin';
  isOnline: boolean;
}

interface RoomParticipantsProps {
  roomId: string;
  roomName: string;
  roomDescription?: string;
  roomIsPrivate?: boolean;
  roomAvatar?: string;
  members: Member[];
  isAdmin: boolean;
  currentUserId?: string;
  ownerId?: string;
  onClose: () => void;
  onRoomUpdated?: () => void;
  onOpenDirectMessage?: (userId: string) => void;
  onLeaveRoom?: () => void;
}

export default function RoomParticipants({
  roomId,
  roomName,
  roomDescription = '',
  roomIsPrivate = false,
  roomAvatar,
  members,
  isAdmin,
  currentUserId,
  ownerId,
  onClose,
  onRoomUpdated,
  onOpenDirectMessage,
  onLeaveRoom
}: RoomParticipantsProps) {
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReactionsEditor, setShowReactionsEditor] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { token, user } = useAuthStore();

  const canModerate = isAdmin || user?.role === 'moderator';
  const canManageRoom = isAdmin || user?.role === 'admin';
  const canManageReactions = user?.role === 'admin';
  const isOwner = ownerId === currentUserId;

  const sortedMembers = [...members].sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return a.username.localeCompare(b.username);
  });

  const filteredMembers = sortedMembers.filter((member) =>
    member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteRoom = async () => {
    if (!window.confirm(`Удалить комнату "${roomName}"? Это действие необратимо.`)) {
      return;
    }

    try {
      const response = await fetch(`${getChatApiUrl()}/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        onClose();
        onRoomUpdated?.();
        return;
      }

      const data = await response.json();
      alert(data.error || 'Ошибка');
    } catch {
      alert('Ошибка сети');
    }
  };

  const handleKick = async (memberId: string, username: string) => {
    if (!window.confirm(`Выгнать ${username} из комнаты?`)) {
      return;
    }

    try {
      const response = await fetch(`${getChatApiUrl()}/rooms/${roomId}/kick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId: memberId })
      });

      if (response.ok) {
        onRoomUpdated?.();
        return;
      }

      const data = await response.json();
      alert(data.error || 'Ошибка');
    } catch {
      alert('Ошибка сети');
    }
  };

  const handleLeave = async () => {
    if (!window.confirm(`Выйти из комнаты "${roomName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${getChatApiUrl()}/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        onClose();
        onLeaveRoom?.();
        onRoomUpdated?.();
        return;
      }

      const data = await response.json();
      alert(data.error || 'Ошибка');
    } catch {
      alert('Ошибка сети');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
        <div
          className="mx-4 flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-xl animate-slide-up dark:bg-gray-800"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-300 dark:bg-gray-600">
                  {buildAvatarUrl(roomAvatar)
                    ? <img src={buildAvatarUrl(roomAvatar)!} alt="room" className="h-full w-full object-cover" />
                    : <Users size={20} className="text-gray-500" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-white">{roomName}</h3>
                  {roomDescription && (
                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">{roomDescription}</p>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="flex-shrink-0 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              {members.length} участников • {members.filter((member) => member.isOnline).length} онлайн
            </p>

            <div className="relative mt-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск участников..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex gap-2 border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
            {canManageRoom && (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex flex-1 items-center justify-center gap-1 rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
                >
                  <Edit2 size={14} /> Редактировать
                </button>
                {canManageReactions && (
                  <button
                    onClick={() => setShowReactionsEditor(true)}
                    className="flex items-center justify-center gap-1 rounded bg-amber-500 px-3 py-2 text-sm text-white hover:bg-amber-600"
                  >
                    Reactions
                  </button>
                )}
                <button
                  onClick={handleDeleteRoom}
                  className="flex items-center justify-center gap-1 rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                >
                  <Trash2 size={14} /> Удалить
                </button>
              </>
            )}
            {!isOwner && (
              <button
                onClick={handleLeave}
                className="flex items-center justify-center gap-1 rounded bg-gray-500 px-3 py-2 text-sm text-white hover:bg-gray-600"
              >
                <LogOut size={14} /> Выйти
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 chat-scrollbar">
            {filteredMembers.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>Участники не найдены</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMembers.map((member) => (
                  <div key={member._id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <button onClick={() => setSelectedUser(member)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <div className="relative flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-indigo-500 font-semibold text-white">
                          {buildAvatarUrl(member.avatar)
                            ? <img src={buildAvatarUrl(member.avatar)!} alt="avatar" className="h-full w-full object-cover" />
                            : member.username[0].toUpperCase()
                          }
                        </div>
                        {member.isOnline && (
                          <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-800"></div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium text-gray-900 dark:text-white">
                            {member.displayName || member.username}
                          </p>
                          {member.role !== 'user' && (
                            <span
                              className={`flex-shrink-0 rounded px-2 py-0.5 text-xs ${
                                member.role === 'admin'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}
                            >
                              {member.role === 'admin' ? 'Админ' : 'Модератор'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">@{member.username}</p>
                      </div>
                    </button>

                    {canModerate && member._id !== currentUserId && member._id !== ownerId && (
                      <button
                        onClick={() => handleKick(member._id, member.username)}
                        className="flex-shrink-0 p-1.5 text-gray-400 transition-colors hover:text-red-500"
                        title="Выгнать"
                      >
                        <UserX size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedUser && (
        <UserProfileCard
          user={selectedUser}
          roomId={roomId}
          onClose={() => setSelectedUser(null)}
          isOwnProfile={false}
          onOpenDirectMessage={onOpenDirectMessage}
        />
      )}

      {showEditModal && (
        <EditRoomModal
          roomId={roomId}
          currentName={roomName}
          currentDescription={roomDescription}
          currentIsPrivate={roomIsPrivate}
          currentAvatar={roomAvatar}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => onRoomUpdated?.()}
        />
      )}

      {showReactionsEditor && (
        <ReactionsEditor
          onClose={() => setShowReactionsEditor(false)}
          roomId={roomId}
          roomName={roomName}
        />
      )}
    </>
  );
}
