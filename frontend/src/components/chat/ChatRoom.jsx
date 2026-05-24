import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Hash, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/context/SocketContext';
import { roomAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import ChatInput from './ChatInput';
import ImageMessage from './ImageMessage';
import VoiceMessage from './VoiceMessage';

const ChatRoom = ({ roomId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sendMessage, getRoomMessages, setRoomMessages, connected } = useSocket();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const messages = getRoomMessages(roomId);

  useEffect(() => {
    initialLoad();
    // Silent poll — only checks room existence, never triggers spinner
    const interval = setInterval(silentPoll, 30000);
    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initialLoad = async () => {
    setLoading(true);
    try {
      const [roomRes, msgRes] = await Promise.all([
        roomAPI.getRoomById(roomId),
        roomAPI.getRoomMessages(roomId),
      ]);
      setRoom(roomRes.data.data.room);
      setRoomMessages(roomId, msgRes.data.data.messages);
    } catch (error) {
      console.error('Fetch room data error:', error);
      if (error.response?.status === 404) {
        toast({ title: 'Room Closed', description: 'This incident has been resolved.' });
        navigate('/chat');
        return;
      }
      toast({ title: 'Error', description: 'Failed to load chat room', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const silentPoll = async () => {
    try {
      await roomAPI.getRoomById(roomId);
    } catch (error) {
      if (error.response?.status === 404) {
        toast({ title: 'Room Closed', description: 'This incident has been resolved.' });
        navigate('/chat');
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (content, mediaPayload = null) => {
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content: content || '',
      type: mediaPayload?.type || 'text',
      mediaUrl: mediaPayload?.mediaUrl || null,
      mimeType: mediaPayload?.mimeType || null,
      duration: mediaPayload?.duration || null,
      sender: { id: user.id, fullName: user.fullName, email: user.email },
      createdAt: new Date().toISOString(),
      isTemp: true,
    };
    setRoomMessages(roomId, [...messages, tempMessage]);
    sendMessage(roomId, content, mediaPayload);
    scrollToBottom();
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Room not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#111827]">
      {/* Sticky Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/50 bg-[#111827] shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/chat')}
          className="lg:hidden h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        
        <div className="w-8 h-8 rounded-md bg-cyan-500/10 flex items-center justify-center shrink-0">
          <Hash className="w-4 h-4 text-cyan-500" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-200 truncate">{room.name}</h3>
          <p className="text-xs text-slate-500">
            {room.type === 'org' && 'Organization chat'}
            {room.type === 'team' && `${room.participants?.length || 0} members`}
            {room.type === 'dm' && 'Direct message'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center mb-3">
              <Hash className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-sm text-slate-400 mb-1">No messages yet</p>
            <p className="text-xs text-slate-600">Send the first message to start the conversation</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date Divider */}
                <div className="flex items-center justify-center mb-4">
                  <span className="text-xs text-slate-600 px-2">{date}</span>
                </div>

                {/* Messages */}
                <div className="space-y-1">
                  {dateMessages.map((message, index) => {
                    const isOwn = message.sender.id === user.id;
                    const showSender = !isOwn && (index === 0 || dateMessages[index - 1].sender.id !== message.sender.id);

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                          {/* Sender Name */}
                          {!isOwn && showSender && (
                            <p className="text-xs text-slate-500 mb-0.5 ml-1">{message.sender.fullName}</p>
                          )}

                          {/* Message Bubble */}
                          <div className={message.isTemp ? 'opacity-70' : ''}>
                            {message.type === 'image' ? (
                              <ImageMessage mediaUrl={message.mediaUrl} content={message.content} />
                            ) : message.type === 'audio' ? (
                              <VoiceMessage mediaUrl={message.mediaUrl} duration={message.duration} isOwn={isOwn} />
                            ) : (
                              <div className={`px-3 py-2 rounded-lg text-sm max-w-[280px] break-words ${
                                isOwn
                                  ? 'bg-cyan-600 text-white rounded-br-sm'
                                  : 'bg-[#1E293B] text-slate-300 rounded-bl-sm'
                              }`}>
                                {message.content}
                              </div>
                            )}
                          </div>

                          {/* Time */}
                          <p className={`text-[10px] text-slate-600 mt-0.5 ${isOwn ? 'text-right' : 'text-left'}`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      <ChatInput
        roomId={roomId}
        connected={connected}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default ChatRoom;
