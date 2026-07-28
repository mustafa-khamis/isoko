import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, MessageCircle, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { messagesApi } from '../../services/messagesApi';
import { formatRWF, timeAgo } from '../../utils/formatters';
import './Messages.css';

export default function Messages() {
  const { user } = useAuth();
  const { isMobile, showAuth } = useUI();
  const { id } = useParams();

  if (!user) {
    return (
      <div className="messages-auth-state">
        <div className="messages-state-icon"><MessageCircle size={40} /></div>
        <h3 className="messages-state-title">Sign in to view messages</h3>
        <p className="messages-state-copy">Your conversations with sellers and buyers will appear here.</p>
        <button onClick={() => showAuth()} className="messages-auth-button">Sign In</button>
      </div>
    );
  }

  return id ? <ConversationView convId={id} isMobile={isMobile} /> : <ConversationList isMobile={isMobile} />;
}

function ConversationList({ isMobile }) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await messagesApi.getConversations();
        if (response.data?.data) {
          setConversations(response.data.data || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, []);

  const totalUnread = conversations.reduce((sum, conversation) => sum + (conversation.unread_count || 0), 0);

  return (
    <div className="messages-page">
      <header className={`messages-header ${isMobile ? 'messages-header--sticky' : ''}`}>
        <div className={`messages-header__inner ${isMobile ? '' : 'messages-header__inner--desktop'}`}>
          <div className="messages-heading-row">
            {isMobile && (
              <button onClick={() => navigate(-1)} className="messages-back-button" aria-label="Go back">
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="messages-title">Messages</h1>
            {totalUnread > 0 && <span className="messages-unread-count">{totalUnread}</span>}
          </div>
        </div>
      </header>

      <main className={`messages-list-content ${isMobile ? 'messages-list-content--mobile' : 'messages-list-content--desktop'}`}>
        {loading ? (
          <div className="messages-loading">Loading...</div>
        ) : conversations.length === 0 ? (
          <EmptyInbox />
        ) : (
          <div className="messages-list">
            {conversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                onClick={() => navigate(`/messages/${conversation.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ConversationRow({ conversation, onClick }) {
  const otherUser = conversation.other_user || {};
  const listing = conversation.listing || {};
  const unread = conversation.unread_count > 0;

  return (
    <button onClick={onClick} className="conversation-row">
      <div className="conversation-row__avatar">
        {otherUser.avatar_url ? (
          <img src={otherUser.avatar_url} alt={otherUser.name || 'User'} className="conversation-row__avatar-image" />
        ) : (
          <div className="conversation-row__avatar-fallback">{(otherUser.name || 'U')[0].toUpperCase()}</div>
        )}
        {unread && <span className="conversation-row__badge">{conversation.unread_count}</span>}
      </div>

      <div className="conversation-row__content">
        <div className="conversation-row__heading">
          <span className={`conversation-row__name ${unread ? 'conversation-row__name--unread' : ''}`}>
            {otherUser.name || 'User'}
          </span>
          <span className="conversation-row__time">{timeAgo(conversation.last_message_at)}</span>
        </div>
        <p className="conversation-row__listing">
          <span className="conversation-row__listing-label">{listing.title?.slice(0, 20)}...</span>
        </p>
        <p className={`conversation-row__preview ${unread ? 'conversation-row__preview--unread' : ''}`}>
          {conversation.last_message_preview || 'New conversation'}
        </p>
      </div>
      <ChevronRight size={16} className="conversation-row__chevron" />
    </button>
  );
}

function ConversationView({ convId, isMobile }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        const [conversationResponse, messagesResponse] = await Promise.all([
          messagesApi.getConversation(convId),
          messagesApi.getMessages(convId),
        ]);
        setConversation(conversationResponse.data.data);
        setMessages(messagesResponse.data.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchConversation();

    const interval = setInterval(async () => {
      try {
        const response = await messagesApi.getMessages(convId);
        setMessages(response.data.data || []);
      } catch (error) {
        console.error('Polling error', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [convId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;

    try {
      await messagesApi.sendMessage(convId, { content });
      setMessages((current) => [...current, {
        id: `m${Date.now()}`,
        sender_id: user.id,
        content,
        created_at: new Date().toISOString(),
      }]);
      setText('');
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="messages-conversation-state">Loading conversation...</div>;
  if (!conversation) return <div className="messages-conversation-state">Conversation not found</div>;

  const otherUser = conversation.other_user || {};
  const listing = conversation.listing || {};

  return (
    <div className="messages-conversation">
      <header className={`conversation-header ${isMobile ? 'conversation-header--sticky' : ''}`}>
        <div className={`conversation-header__person ${isMobile ? '' : 'conversation-header__person--desktop'}`}>
          <button onClick={() => navigate('/messages')} className="messages-back-button" aria-label="Back to messages">
            <ArrowLeft size={20} />
          </button>
          <div className="conversation-header__avatar">
            {otherUser.avatar_url && (
              <img src={otherUser.avatar_url} alt="" className="conversation-header__avatar-image" />
            )}
          </div>
          <div className="conversation-header__identity">
            <p className="conversation-header__name">{otherUser.name || 'User'}</p>
            <p className="conversation-header__listing-title">{listing.title}</p>
          </div>
        </div>

        <button onClick={() => navigate(`/listing/${listing.id}`)} className="conversation-listing-context">
          <div className="conversation-listing-context__image-frame">
            <img
              src={listing.images?.[0] || '/images/default-listing.svg'}
              alt=""
              className="conversation-listing-context__image"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/images/default-listing.svg';
              }}
            />
          </div>
          <div className="conversation-listing-context__content">
            <p className="conversation-listing-context__title">{listing.title}</p>
            {listing.price && <p className="conversation-listing-context__price">{formatRWF(listing.price)}</p>}
          </div>
          <ChevronRight size={16} className="conversation-listing-context__chevron" />
        </button>
      </header>

      <div
        ref={scrollRef}
        className={`conversation-messages ${isMobile ? 'conversation-messages--mobile' : 'conversation-messages--desktop'}`}
      >
        {messages.map((message) => {
          const sentByCurrentUser = message.sender_id === user.id;
          return (
            <div
              key={message.id}
              className={`conversation-message-row ${sentByCurrentUser ? 'conversation-message-row--sent' : 'conversation-message-row--received'}`}
            >
              <div className={`conversation-bubble ${sentByCurrentUser ? 'conversation-bubble--sent' : 'conversation-bubble--received'}`}>
                <p className="conversation-bubble__content">{message.content}</p>
                <p className={`conversation-bubble__time ${sentByCurrentUser ? 'conversation-bubble__time--sent' : ''}`}>
                  {timeAgo(message.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`conversation-composer ${isMobile ? 'conversation-composer--mobile' : ''}`}>
        <div className={`conversation-composer__inner ${isMobile ? '' : 'conversation-composer__inner--desktop'}`}>
          <div className="conversation-composer__field">
            <input
              type="text"
              placeholder="Write a message..."
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              className="conversation-composer__input"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="conversation-composer__send"
            aria-label="Send message"
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
    <div className="messages-empty-state">
      <div className="messages-state-icon"><MessageCircle size={40} /></div>
      <h3 className="messages-state-title">No messages yet</h3>
      <p className="messages-state-copy messages-state-copy--narrow">
        When you contact a seller or receive a message about your listing, it will appear here.
      </p>
    </div>
  );
}
