'use client'

import { useState, useEffect } from 'react';
import { Crown, Shield, Ban, Clock, X, AlertTriangle } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';

interface User {
  _id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
}

interface Ban {
  _id: string;
  user: User;
  reason?: string;
  expiresAt?: string;
  bannedBy: User;
  createdAt: string;
}

interface RoomManagementProps {
  onClose: () => void;
}

export default function RoomManagement({ onClose }: RoomManagementProps) {
  const { currentRoom } = useChatStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'members' | 'bans'>('members');
  const [members, setMembers] = useState<User[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banForm, setBanForm] = useState({
    reason: '',
    duration: '1', // hours
    durationType: 'hours' as 'hours' | 'days' | 'permanent'
  });

  // Check if current user is admin or owner
  const isAdmin = currentRoom?.admins?.some(admin => admin._id === user?.id) || 
                  currentRoom?.owner?._id === user?.id;
  const isOwner = currentRoom?.owner?._id === user?.id;

  useEffect(() => {
    if (currentRoom) {
      loadMembers();
      loadBans();
    }
  }, [currentRoom]);

  const loadMembers = async () => {
    if (!currentRoom) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/chat/rooms/${currentRoom._id}/members`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const loadBans = async () => {
    if (!currentRoom) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/chat/rooms/${currentRoom._id}/bans`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBans(data.bans);
      }
    } catch (error) {
      console.error('Failed to load bans:', error);
    }
  };

  const handleRoleChange = async (userId: string, action: 'promote' | 'demote') => {
    if (!currentRoom || !isOwner) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/chat/rooms/${currentRoom._id}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId, action })
      });

      if (response.ok) {
        loadMembers();
      }
    } catch (error) {
      console.error('Failed to change role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !currentRoom) return;

    setIsLoading(true);
    try {
      let expiresAt = null;
      
      if (banForm.durationType !== 'permanent') {
        const duration = parseInt(banForm.duration);
        const multiplier = banForm.durationType === 'hours' ? 1 : 24;
        expiresAt = new Date(Date.now() + duration * multiplier * 60 * 60 * 1000).toISOString();
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/chat/rooms/${currentRoom._id}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: selectedUser._id,
          reason: banForm.reason,
          expiresAt
        })
      });

      if (response.ok) {
        setShowBanModal(false);
        setSelectedUser(null);
        setBanForm({ reason: '', duration: '1', durationType: 'hours' });
        loadMembers();
        loadBans();
      }
    } catch (error) {
      console.error('Failed to ban user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnban = async (banId: string) => {
    if (!currentRoom) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/chat/bans/${banId}/unban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        loadBans();
      }
    } catch (error) {
      console.error('Failed to unban user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBanExpiry = (expiresAt?: string) => {
    if (!expiresAt) return 'Навсегда';
    
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Истёк';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} дн.`;
    return `${hours} ч.`;
  };

  const getUserRole = (userId: string) => {
    if (currentRoom?.owner?._id === userId) return 'owner';
    if (currentRoom?.admins?.some(admin => admin._id === userId)) return 'admin';
    return 'member';
  };

  if (!currentRoom || !isAdmin) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
          <AlertTriangle className="mx-auto mb-4 text-yellow-500" size={48} />
          <p className="text-gray-900 dark:text-white">У вас нет прав для управления этой комнатой</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-lg">
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col animate-bounce-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Управление комнатой: {currentRoom.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'members'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Участники ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('bans')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'bans'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Баны ({bans.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'members' && (
            <div className="space-y-3">
              {members.map((member) => {
                const role = getUserRole(member._id);
                const canManage = isOwner && member._id !== user?.id;
                
                return (
                  <div key={member._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.username[0].toUpperCase()}
                        </div>
                        {member.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-700"></div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{member.username}</p>
                        <div className="flex items-center space-x-1">
                          {role === 'owner' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                              <Crown size={12} className="mr-1" />
                              Владелец
                            </span>
                          )}
                          {role === 'admin' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                              <Shield size={12} className="mr-1" />
                              Админ
                            </span>
                          )}
                          {role === 'member' && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">Участник</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {canManage && (
                      <div className="flex space-x-2">
                        {role === 'member' && (
                          <button
                            onClick={() => handleRoleChange(member._id, 'promote')}
                            disabled={isLoading}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                          >
                            Сделать админом
                          </button>
                        )}
                        {role === 'admin' && (
                          <button
                            onClick={() => handleRoleChange(member._id, 'demote')}
                            disabled={isLoading}
                            className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                          >
                            Снять админа
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedUser(member);
                            setShowBanModal(true);
                          }}
                          disabled={isLoading}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                        >
                          Забанить
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'bans' && (
            <div className="space-y-3">
              {bans.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Нет активных банов
                </p>
              ) : (
                bans.map((ban) => (
                  <div key={ban._id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Ban className="text-red-500" size={20} />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{ban.user.username}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Забанен: {ban.bannedBy.username}
                          </p>
                          {ban.reason && (
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Причина: {ban.reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          <Clock size={14} />
                          <span>{formatBanExpiry(ban.expiresAt)}</span>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleUnban(ban._id)}
                            disabled={isLoading}
                            className="mt-2 px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                          >
                            Разбанить
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Забанить пользователя: {selectedUser.username}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Причина (необязательно)
                </label>
                <input
                  type="text"
                  value={banForm.reason}
                  onChange={(e) => setBanForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Укажите причину бана"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Длительность
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="1"
                    value={banForm.duration}
                    onChange={(e) => setBanForm(prev => ({ ...prev, duration: e.target.value }))}
                    disabled={banForm.durationType === 'permanent'}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                  />
                  <select
                    value={banForm.durationType}
                    onChange={(e) => setBanForm(prev => ({ ...prev, durationType: e.target.value as any }))}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="hours">Часов</option>
                    <option value="days">Дней</option>
                    <option value="permanent">Навсегда</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleBanUser}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Баним...' : 'Забанить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}