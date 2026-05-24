import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Plus, 
  Search, 
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  Hash,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { roomAPI, userAPI } from '@/services/api';
import { toast } from '@/hooks/use-toast';

const ROOMS_CACHE_KEY = 'syncops_rooms_cache';
const getCache = () => { try { return JSON.parse(sessionStorage.getItem(ROOMS_CACHE_KEY) || 'null'); } catch { return null; } };


const ChatSidebar = ({ currentRoomId, onRoomSelect }) => {
  const navigate = useNavigate();
  const cachedRooms = getCache();
  const [rooms, setRooms] = useState(cachedRooms || { orgRoom: null, teamRooms: [], dmRooms: [], incidentRooms: [] });
  const [loading, setLoading] = useState(!cachedRooms);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [startingDM, setStartingDM] = useState(false);
  const [expanded, setExpanded] = useState({
    org: true,
    teams: true,
    dms: true,
    incidents: true,
  });

  useEffect(() => {
    // Always fetch fresh — cache only pre-populates room list
    fetchRooms(false);

    // Poll for room updates every 30 seconds
    const interval = setInterval(() => fetchRooms(true), 30000);
    
    // Refresh when window regains focus
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchRooms(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchRooms = async (silent = false) => {
    try {
      const response = await roomAPI.getRooms();
      const data = response.data.data;
      setRooms(data);
      sessionStorage.setItem(ROOMS_CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      if (!silent) console.error('Fetch rooms error:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const searchUsers = async () => {
    setSearching(true);
    try {
      const response = await userAPI.searchUsers(searchQuery);
      setSearchResults(response.data.data.users);
    } catch (error) {
      console.error('Search users error:', error);
    } finally {
      setSearching(false);
    }
  };

  const startDM = async (targetUserId) => {
    if (startingDM) return; // Prevent double clicks
    
    try {
      setStartingDM(true);
      
      // Check if DM already exists locally first
      const existingDM = rooms.dmRooms.find(r => r.otherUser?.id === targetUserId);
      if (existingDM) {
        navigate(`/chat/${existingDM.id}`);
        setShowNewMessage(false);
        setSearchQuery('');
        setSearchResults([]);
        onRoomSelect?.();
        setStartingDM(false);
        return;
      }

      const response = await roomAPI.createDMRoom({ targetUserId });
      const room = response.data.data.room;
      
      if (room.isNew) {
        setRooms(prev => {
          // Extra check: don't add if already exists
          if (prev.dmRooms.find(r => r.id === room.id)) {
            return prev;
          }
          return {
            ...prev,
            dmRooms: [...prev.dmRooms, room],
          };
        });
      }
      
      navigate(`/chat/${room.id}`);
      setShowNewMessage(false);
      setSearchQuery('');
      setSearchResults([]);
      onRoomSelect?.();
      setStartingDM(false);
    } catch (error) {
      setStartingDM(false);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive',
      });
    }
  };

  const handleRoomClick = (roomId) => {
    navigate(`/chat/${roomId}`);
    onRoomSelect?.();
  };

  const handleCloseDM = async (roomId) => {
    try {
      await roomAPI.leaveRoom(roomId);
      // Remove from local state so it disappears from sidebar
      setRooms(prev => ({
        ...prev,
        dmRooms: prev.dmRooms.filter(r => r.id !== roomId),
      }));
      // If currently in this room, navigate back to chat home
      if (currentRoomId === roomId) {
        navigate('/chat');
      }
      toast({
        title: 'Chat closed',
        description: 'Conversation removed from your list',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to close chat',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0F172A]">
      {/* Header with Search */}
      <div className="px-4 py-3 border-b border-slate-800/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 tracking-wide">Chats</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNewMessage(!showNewMessage)}
            className="h-7 w-7 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input
            placeholder="Search chats or users..."
            className="h-8 pl-8 pr-7 text-sm bg-[#1E293B] border-slate-700/50 text-slate-300 placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-0"
          />
        </div>
      </div>

      {/* New Message Panel */}
      {showNewMessage && (
        <div className="px-3 py-2 border-b border-slate-800/50 bg-slate-900/30">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find a user..."
              className="h-8 pl-8 pr-7 text-sm bg-[#1E293B] border-slate-700/50 text-slate-300 placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-0"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-2 bg-[#1E293B] rounded-md max-h-40 overflow-y-auto hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startDM(u.id)}
                  disabled={startingDM}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700/50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center text-xs font-medium text-cyan-500">
                    {u.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-300 truncate">{u.fullName}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {searching && (
            <div className="mt-2 flex items-center justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
            </div>
          )}
        </div>
      )}

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto py-1 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Organization */}
        {rooms.orgRoom && (
          <div className="mb-0.5">
            <button
              onClick={() => setExpanded(prev => ({ ...prev, org: !prev.org }))}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-400 uppercase tracking-wider"
            >
              {expanded.org ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Company
            </button>
            
            {expanded.org && (
              <button
                onClick={() => handleRoomClick(rooms.orgRoom.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 mx-1 rounded-md transition-colors ${
                  currentRoomId === rooms.orgRoom.id 
                    ? 'bg-cyan-500/10 text-cyan-400' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                }`}
              >
                <Hash className="w-3.5 h-3.5 shrink-0" />
                <span className="text-sm truncate">{rooms.orgRoom.name}</span>
              </button>
            )}
          </div>
        )}

        {/* Teams */}
        {rooms.teamRooms.length > 0 && (
          <div className="mb-0.5">
            <button
              onClick={() => setExpanded(prev => ({ ...prev, teams: !prev.teams }))}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-400 uppercase tracking-wider"
            >
              {expanded.teams ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Teams ({rooms.teamRooms.length})
            </button>
            
            {expanded.teams && (
              <div>
                {rooms.teamRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleRoomClick(room.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 mx-1 rounded-md transition-colors ${
                      currentRoomId === room.id 
                        ? 'bg-cyan-500/10 text-cyan-400' 
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-sm truncate">{room.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Direct Messages */}
        <div className="mb-0.5">
          <button
            onClick={() => setExpanded(prev => ({ ...prev, dms: !prev.dms }))}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-400 uppercase tracking-wider"
          >
            {expanded.dms ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Direct Messages {rooms.dmRooms.length > 0 && `(${rooms.dmRooms.length})`}
          </button>
          
          {expanded.dms && (
            <div>
              {rooms.dmRooms.length === 0 ? (
                <p className="px-4 py-2 text-xs text-slate-600">No conversations</p>
              ) : (
                rooms.dmRooms.map((room) => (
                  <DMRoomItem
                    key={room.id}
                    room={room}
                    isActive={currentRoomId === room.id}
                    onClick={() => handleRoomClick(room.id)}
                    onClose={() => handleCloseDM(room.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Incident Rooms */}
        {rooms.incidentRooms?.length > 0 && (
          <div className="mb-0.5">
            <button
              onClick={() => setExpanded(prev => ({ ...prev, incidents: !prev.incidents }))}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-400 uppercase tracking-wider"
            >
              {expanded.incidents ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Incident Rooms ({rooms.incidentRooms.length})
            </button>
            
            {expanded.incidents && (
              <div>
                {rooms.incidentRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleRoomClick(room.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 mx-1 rounded-md transition-colors ${
                      currentRoomId === room.id 
                        ? 'bg-red-500/10 text-red-400' 
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-sm truncate">{room.name.replace('🔴 ', '')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

// DM Room Item Component with close button
const DMRoomItem = ({ room, isActive, onClick, onClose }) => {
  const [showClose, setShowClose] = useState(false);

  return (
    <div
      className="group relative flex items-center"
      onMouseEnter={() => setShowClose(true)}
      onMouseLeave={() => setShowClose(false)}
    >
      <button
        onClick={onClick}
        className={`flex-1 flex items-center gap-2 px-3 py-2 mx-1 rounded-md transition-colors ${
          isActive 
            ? 'bg-cyan-500/10 text-cyan-400' 
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
        }`}
      >
        <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-xs shrink-0">
          {room.otherUser?.fullName?.charAt(0) || '?'}
        </div>
        <span className="text-sm truncate">{room.name}</span>
      </button>
      
      {/* Close button - shows on hover or when active */}
      {(showClose || isActive) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="mr-2 p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors"
          title="Close chat"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

// CSS to hide scrollbars in WebKit browsers
const style = document.createElement('style');
style.textContent = `
  .hide-scrollbar::-webkit-scrollbar {
    display: none !important;
  }
`;
if (!document.getElementById('hide-scrollbar-style')) {
  style.id = 'hide-scrollbar-style';
  document.head.appendChild(style);
}

export default ChatSidebar;
