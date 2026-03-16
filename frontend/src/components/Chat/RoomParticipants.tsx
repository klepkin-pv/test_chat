'use client'

import { useState } from 'react';
import { X, Users, Edit2, Trash2, Search, LogOut, UserX } from 'lucide-react';
import UserProfileCard from '@/components/User/UserProfileCard';
import EditRoomModal from './EditRoomModal';
import { getChatApiUrl } from '@/utils/api';
import { useAuthStore } from '@/store/authStore';

interface Member {
  _id: string;
  username: string;
  displayName?: string;
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
  roomId, roomName, roomDescription = '', roomIsPrivate = false, roomAvatar,
  members, isAdmin, currentUserId, ownerId,
  onClose, onRoomUpdated, onOpenDirectMessage, onLeaveRoom
}: RoomParticipantsProps) {
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { token, user } = useAuthStore();

  const canModerate = isAdmin || user?.role === 'moderator';
  const isOwner = ownerId === currentUserId;

  const sortedMembers = [...members].sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return a.username.localeCompare(b.username);
  });

  const filteredMembers = sortedMembers.filter(m =>
    m.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteRoom = async () => {
    if (!window.confirm(`Удалить комнату "${roomName}"? Это действие необратимо.`)) return;
    try {
      const res = await fetch(`${getChatApiUrl()}/rooms/${roomId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { onClose(); onRoomUpdated?.(); }
      else { const d = await res.json(); alert(d.error || 'Ошибка'); }
    } catch { alert('Ошибка сети'); }
  };

  const handleKick = async (memberId: string, username: string) => {
    if (!window.confirm(`Выгнать ${username} из комнаты?`)) return;
    try {
      const res = await fetch(`${getChatApiUrl()}/rooms/${roomId}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: memberId })
      });
      if (res.ok) { onRoomUpdated?.(); }
      else { const d = await res.json(); alert(d.error || 'Ошибка'); }
    } catch { alert('Ошибка сети'); }
  };

  const handleLeave = async () => {
    if (!window.confirm(`Выйти из комнаты "${roomName}"?`)) return;
    try {
      const res = await fetch(`${getChatApiUrl()}/rooms/${roomId}/leave`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { onClose(); onLeaveRoom?.(); onRoomUpdated?.(); }
      else { const d = await res.json(); alert(d.error || 'Ошибка'); }
    } catch { alert('Ошибка сети'); }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Users size={20} className="text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{roomName}</h3>
                  {roomDescription && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{roomDescription}</p>}
                </div>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{members.length} участников • {members.filter(m => m.isOnline).length} онлайн</p>
            <div className="mt-3 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск участников..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
          </div>

          {/* Actions bar */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex gap-2">
            {isAdmin && (
              <>
                <button onClick={() => setShowEditModal(true)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm">
                  <Edit2 size={14} /> Редактировать
                </button>
                <button onClick={handleDeleteRoom}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm">
                  <Trash2 size={14} /> Удалить
                </button>
              </>
            )}
            {!isOwner && (
              <button onClick={handleLeave}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm">
                <LogOut size={14} /> Выйти
              </button>
            )}
          </div>

          {/* Members List */}
          <div className="flex-1 overflow-y-auto p-3 chat-scrollbar">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users size={48} className="mx-auto mb-4 opacity-50" /><p>Участники не найдены</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMembers.map((member) => (
                  <div key={member._id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <button onClick={() => setSelectedUser(member)} className="flex items-center gap-3 flex-1 text-left min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.username[0].toUpperCase()}
                        </div>
                        {member.isOnline && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{member.displayName || member.username}</p>
                          {member.role !== 'user' && (
                            <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${member.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
                              {member.role === 'admin' ? 'Админ' : 'Модератор'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">@{member.username}</p>
                      </div>
                    </button>
                    {/* Kick button - for moderators/admins on non-owners */}
                    {canModerate && member._id !== currentUserId && member._id !== ownerId && (
                      <button onClick={() => handleKick(member._id, member.username)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0" title="Выгнать">
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
        <UserProfileCard user={selectedUser} roomId={roomId} onClose={() => setSelectedUser(null)}
          isOwnProfile={false} onOpenDirectMessage={onOpenDirectMessage} />
      )}

      {showEditModal && (
        <EditRoomModal roomId={roomId} currentName={roomName} currentDescription={roomDescription}
          currentIsPrivate={roomIsPrivate}
          currentAvatar={roomAvatar}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => onRoomUpdated?.()} />
      )}
    </>
  );
}
