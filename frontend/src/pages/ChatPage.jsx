import DashboardLayout from '@/layouts/DashboardLayout';
import ChatLayout from '@/components/chat/ChatLayout';

const ChatPage = () => {
  return (
    <DashboardLayout fullHeight>
      <ChatLayout />
    </DashboardLayout>
  );
};

export default ChatPage;
