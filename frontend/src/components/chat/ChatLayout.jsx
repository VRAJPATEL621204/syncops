import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Menu, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/context/SocketContext';
import ChatSidebar from './ChatSidebar';
import ChatRoom from './ChatRoom';

const ChatLayout = () => {
  const { roomId } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { connected, joinRoom, leaveRoom } = useSocket();

  useEffect(() => {
    if (roomId) {
      joinRoom(roomId);
    }
    return () => {
      if (roomId) {
        leaveRoom(roomId);
      }
    };
  }, [roomId, joinRoom, leaveRoom]);

  return (
    <div className="h-full w-full flex overflow-hidden bg-[#020617]">
      {/* Chat List Panel - 320px fixed */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-80 bg-[#0F172A] border-r border-slate-800/50 transition-transform duration-200 ease-out`}
      >
        <ChatSidebar currentRoomId={roomId} onRoomSelect={() => setSidebarOpen(false)} />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Active Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#111827]">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0F172A] border-b border-slate-800/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <span className="font-medium text-slate-200">Chats</span>
        </div>

        {roomId ? (
          <ChatRoom roomId={roomId} />
        ) : (
          <EmptyState connected={connected} />
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ connected }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8">
    <div className="w-14 h-14 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4">
      <MessageSquare className="w-6 h-6 text-cyan-500" />
    </div>
    <h3 className="text-lg font-medium text-slate-300 mb-1">Select a conversation</h3>
    <p className="text-sm text-slate-500 text-center mb-6 max-w-xs">
      Choose a chat from the sidebar to start messaging
    </p>
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className={connected ? 'text-slate-400' : 'text-slate-500'}>
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  </div>
);

export default ChatLayout;
