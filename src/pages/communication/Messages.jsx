import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { messagesApi } from '../../services/messagesApi';
import { timeAgo, formatRWF } from '../../utils/formatters';

export default function Messages() {
  const { user } = useAuth();
  const { isMobile, showAuth } = useUI();
  const navigate = useNavigate();
  const { id } = useParams(); // conversationId

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-full px-6">
        <div className="w-20 h-20 bg-ink-100 rounded-3xl flex items-center justify-center mb-4">
          <MessageCircle size={40} className="text-ink-300" />
        </div>
        <h3 className="text-lg font-bold text-ink-800 mb-2">Sign in to view messages</h3>
        <p className="text-sm text-ink-500 mb-6">Your conversations with sellers and buyers will appear here.</p>
        <button onClick={() => showAuth()} className="btn btn-primary px-6">Sign In</button>
      </div>
    );
  }

  if (id) {
    return <ConversationView convId={id} />;
  }

  return <ConversationList />;
}

function ConversationList() {
  const navigate = useNavigate();
  const { isMobile } = useUI();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await messagesApi.getConversations();
        if (res.data && res.data.data) {
          setConversations(res.data.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, []);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <div className="bg-ink-50 min-h-full animate-fade-in">
      <div className={`bg-white border-b border-ink-100 ${isMobile ? 'sticky top-0 z-30' : ''}`}>
        <div className={`px-4 py-4 ${isMobile ? '' : 'max-w-screen-xl mx-auto lg:px-8'}`}>
          <div className="flex items-center gap-3">
            {isMobile && (
              <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-ink-100">
                <ArrowLeft size={20} className="text-ink-600" />
              </button>
            )}
            <h1 className="text-lg font-bold text-ink-950">Messages</h1>
            {totalUnread > 0 && (
              <span className="ml-1 bg-brand-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalUnread}</span>
            )}
          </div>
        </div>
      </div>

      <div className={`${isMobile ? 'px-3 pt-4' : 'max-w-screen-xl mx-auto px-4 lg:px-8 pt-6 max-w-2xl'}`}>
        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : conversations.length === 0 ? (
          <EmptyInbox />
        ) : (
          <div className="flex flex-col gap-2">
            {conversations.map(conv => (
              <ConversationRow key={conv.id} conv={conv} onClick={() => navigate(`/messages/${conv.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationRow({ conv, onClick }) {
  const otherUser = conv.other_user || {};
  const listing = conv.listing || {};
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 bg-white rounded-xl border border-ink-200 hover:border-ink-300 p-3 text-left transition-all">
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-ink-100 shrink-0 relative">
        {otherUser.avatar_url
          ? <img src={otherUser.avatar_url} alt={otherUser.name || 'User'} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-ink-200 flex items-center justify-center text-ink-500 font-bold">{(otherUser.name || 'U')[0].toUpperCase()}</div>
        }
        {conv.unread_count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{conv.unread_count}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${conv.unread_count > 0 ? 'text-ink-950' : 'text-ink-800'}`}>{otherUser.name || 'User'}</span>
          <span className="text-[10px] text-ink-400">{timeAgo(conv.last_message_at)}</span>
        </div>
        <p className="text-xs text-ink-400 truncate mt-0.5 flex items-center gap-1">
          <span className="shrink-0 bg-ink-100 px-1.5 py-0.5 rounded text-[9px] font-medium">{listing.title?.slice(0, 20)}…</span>
        </p>
        <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? 'text-ink-800 font-medium' : 'text-ink-500'}`}>
          {conv.last_message_preview || 'New conversation'}
        </p>
      </div>
      <ChevronRight size={16} className="text-ink-300 shrink-0" />
    </button>
  );
}

function ConversationView({ convId }) {
  const navigate = useNavigate();
  const { isMobile } = useUI();
  const { user } = useAuth();
  
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchConvData = async () => {
      try {
        const [convRes, msgRes] = await Promise.all([
          messagesApi.getConversation(convId),
          messagesApi.getMessages(convId)
        ]);
        setConv(convRes.data.data);
        setMessages(msgRes.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConvData();
    
    // Polling setup can go here
    const interval = setInterval(async () => {
      try {
        const msgRes = await messagesApi.getMessages(convId);
        setMessages(msgRes.data.data || []);
      } catch (e) {
        console.error('Polling error', e);
      }
    }, 5000); // 5 sec poll
    
    return () => clearInterval(interval);
  }, [convId]);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      await messagesApi.sendMessage(convId, { content: text.trim() });
      // Optimistic update
      setMessages(msgs => [...msgs, {
        id: `m${Date.now()}`,
        sender_id: user.id,
        content: text.trim(),
        created_at: new Date().toISOString(),
      }]);
      setText('');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-center pt-24">Loading conversation...</div>;
  if (!conv) return <div className="text-center pt-24">Conversation not found</div>;

  const otherUser = conv.other_user || {};
  const listing = conv.listing || {};

  return (
    <div className="flex flex-col h-full bg-ink-50 animate-fade-in">
      {/* Conversation header */}
      <div className={`bg-white border-b border-ink-100 ${isMobile ? 'sticky top-0 z-30' : ''}`}>
        <div className={`flex items-center gap-3 px-4 py-3 ${isMobile ? '' : 'max-w-screen-xl mx-auto lg:px-8'}`}>
          <button onClick={() => navigate('/messages')} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-ink-100">
            <ArrowLeft size={20} className="text-ink-600" />
          </button>
          <div className="w-9 h-9 rounded-full overflow-hidden bg-ink-100 shrink-0">
            {otherUser.avatar_url && <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-900">{otherUser.name || 'User'}</p>
            <p className="text-xs text-ink-400 truncate">{listing.title}</p>
          </div>
        </div>

        {/* Listing context */}
        <button onClick={() => navigate(`/listing/${listing.id}`)} className="flex items-center gap-3 px-4 py-2.5 border-t border-ink-100 w-full hover:bg-ink-50 transition-colors">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-ink-100 shrink-0">
            <img 
              src={listing.images?.[0] || '/images/default-listing.svg'} 
              alt="" 
              className="w-full h-full object-cover" 
              onError={(e) => { e.target.onerror = null; e.target.src = '/images/default-listing.svg'; }}
            />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-ink-800 truncate">{listing.title}</p>
            {listing.price && (
              <p className="text-xs text-brand-600 font-bold">{formatRWF(listing.price)}</p>
            )}
          </div>
          <ChevronRight size={16} className="text-ink-300 shrink-0" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className={`flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 ${isMobile ? '' : 'max-w-screen-xl mx-auto w-full lg:px-8 max-w-2xl'}`}>
        {messages.map(msg => {
          const isMe = msg.sender_id === user.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-brand-600 text-white rounded-br-md' : 'bg-white border border-ink-200 text-ink-800 rounded-bl-md'}`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-ink-400'}`}>{timeAgo(msg.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message input */}
      <div className={`bg-white border-t border-ink-200 px-4 py-3 ${isMobile ? 'fixed bottom-16 left-0 right-0 z-20' : ''}`}>
        <div className={`flex gap-2 ${isMobile ? '' : 'max-w-screen-xl mx-auto lg:px-8 max-w-2xl'}`}>
          <div className="flex-1 flex items-center gap-2 border border-ink-200 rounded-2xl px-4 py-2.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition-all bg-ink-50">
            <input
              type="text"
              placeholder="Write a message…"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className="flex-1 text-sm text-ink-800 placeholder-ink-400 outline-none bg-transparent"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-11 h-11 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-2xl flex items-center justify-center text-white transition-colors disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyInbox() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="w-20 h-20 bg-ink-100 rounded-3xl flex items-center justify-center mb-4">
        <MessageCircle size={40} className="text-ink-300" />
      </div>
      <h3 className="text-lg font-bold text-ink-800 mb-2">No messages yet</h3>
      <p className="text-sm text-ink-500 max-w-xs">When you contact a seller or receive a message about your listing, it will appear here.</p>
    </div>
  );
}
