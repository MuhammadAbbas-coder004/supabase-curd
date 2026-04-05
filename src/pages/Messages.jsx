import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSearchParams } from 'react-router-dom';
import { Send, User as UserIcon, Loader2, ArrowLeft, Search, MessageSquare } from 'lucide-react';

const Messages = () => {
  const [session, setSession] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [conversations, setConversations] = useState([]); // List of users we're chatting with
  const [activeChatUserId, setActiveChatUserId] = useState(searchParams.get('user'));
  const [activeChatProfile, setActiveChatProfile] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    initChat();
  }, []);

  const initChat = async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;
      setSession(authSession);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authSession.user.id)
        .single();
      setCurrentUserProfile(profile);

      await fetchConversations(authSession.user.id);
      
      // If we came from a 'Message Founder' link with a specific user
      const targetUserId = searchParams.get('user');
      if (targetUserId && targetUserId !== authSession.user.id) {
         await ensureConversationTargetExists(targetUserId);
         setActiveChatUserId(targetUserId);
      }
    } catch (err) {
      console.error("Error initializing chat:", err);
    } finally {
      setLoading(false);
    }
  };

  const ensureConversationTargetExists = async (targetUserId) => {
    // If they are not already in the conversation list, add them temporarily 
    // so we can message them.
    setConversations(prev => {
       const exists = prev.find(p => p.user_id === targetUserId);
       if (exists) return prev;
       
       // Add an optimistic placeholder until we load their real profile
       const placeholder = { user_id: targetUserId, name: "Loading...", role: "User" };
       fetchProfile(targetUserId).then(prof => {
          if (prof) {
            setConversations(currentList => 
              currentList.map(item => item.user_id === targetUserId ? prof : item)
            );
          }
       });
       return [placeholder, ...prev];
    });
  };

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
    return data;
  };

  const fetchConversations = async (currentUserId) => {
    // 1. Fetch all messages involving this user to figure out who they talked to
    const { data: messagesData, error } = await supabase
      .from('direct_messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

    if (error) {
       console.error("Error fetching messages (Hint: Have you run the SQL script in Supabase?)", error);
       return;
    }

    const uniqueUserIds = new Set();
    messagesData?.forEach(msg => {
      if (msg.sender_id !== currentUserId) uniqueUserIds.add(msg.sender_id);
      if (msg.receiver_id !== currentUserId) uniqueUserIds.add(msg.receiver_id);
    });

    // 2. Fetch profiles for those user IDs
    if (uniqueUserIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', Array.from(uniqueUserIds));
      
      if (profiles) setConversations(profiles);
    }
  };

  // Fetch messages when active chat changes
  useEffect(() => {
    if (session && activeChatUserId) {
      fetchMessages(session.user.id, activeChatUserId);
      
      const targetProf = conversations.find(p => p.user_id === activeChatUserId);
      if (targetProf) {
         setActiveChatProfile(targetProf);
      } else {
         fetchProfile(activeChatUserId).then(p => {
             if (p) setActiveChatProfile(p);
         });
      }
    }
  }, [activeChatUserId, session, conversations]);

  const fetchMessages = async (currentUserId, otherUserId) => {
    setChatLoading(true);
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
    setChatLoading(false);
    scrollToBottom();
  };

  // Setup Realtime Subscription
  useEffect(() => {
    if (!session) return;
    
    console.log("Setting up messaging realtime...");
    const channel = supabase
      .channel('public:direct_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const newMsg = payload.new;
          
          // If the message belongs to the CURRENT open chat window
          if (activeChatUserId && 
              ((newMsg.sender_id === session.user.id && newMsg.receiver_id === activeChatUserId) ||
               (newMsg.sender_id === activeChatUserId && newMsg.receiver_id === session.user.id))) {
             setMessages(prev => [...prev, newMsg]);
             scrollToBottom();
          }

          // If it's from someone else not in the conversation list, refresh conversations
          if (newMsg.receiver_id === session.user.id) {
             ensureConversationTargetExists(newMsg.sender_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, activeChatUserId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Fallback polling mechanism in case Supabase Realtime is disabled on the table
  useEffect(() => {
    if (!session) return;

    const pollInterval = setInterval(() => {
      // 1. Poll conversations list
      fetchConversations(session.user.id);
      
      // 2. Poll active chat messages
      if (activeChatUserId) {
        supabase
          .from('direct_messages')
          .select('*')
          .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${activeChatUserId}),and(sender_id.eq.${activeChatUserId},receiver_id.eq.${session.user.id})`)
          .order('created_at', { ascending: true })
          .then(({ data, error }) => {
            if (!error && data) {
              setMessages(prev => {
                if (prev.length !== data.length) {
                  setTimeout(scrollToBottom, 50);
                  return data;
                }
                return prev;
              });
            }
          });
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [session, activeChatUserId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatUserId || !session) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // clear input field
    
    // Optimistic insert + selection to update UI immediately
    const { data: insertedData, error } = await supabase
      .from('direct_messages')
      .insert([{
        sender_id: session.user.id,
        receiver_id: activeChatUserId,
        content: messageText
      }])
      .select();

    if (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message: " + error.message);
      // Restore input if it failed
      setNewMessage(messageText);
    } else if (insertedData && insertedData.length > 0) {
      // Optimistically add to UI in case realtime is disabled or slow
      setMessages(prev => {
        const exists = prev.find(m => m.id === insertedData[0].id);
        if (exists) return prev;
        return [...prev, insertedData[0]];
      });
      scrollToBottom();
      
      // Also ensure conversation exists
      ensureConversationTargetExists(activeChatUserId);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in-up">
      
      {/* Sidebar - Conversations List */}
      <div className={`w-full md:w-1/3 flex flex-col border-r border-slate-200 dark:border-slate-700 ${activeChatUserId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-indigo-500" />
            <span>Messages</span>
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? (
            filteredConversations.map(conv => (
              <div 
                key={conv.user_id}
                onClick={() => {
                   setActiveChatUserId(conv.user_id);
                   setSearchParams({ user: conv.user_id });
                }}
                className={`flex items-center p-4 border-b border-slate-100 dark:border-slate-700/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${activeChatUserId === conv.user_id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
              >
                <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div className="ml-3 flex-1 overflow-hidden">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{conv.name || 'Unknown User'}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">{conv.role?.replace('_', ' ')}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm">
              No conversations found.
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 ${!activeChatUserId ? 'hidden md:flex' : 'flex'}`}>
        {activeChatUserId ? (
          <>
            {/* Chat Area Header */}
            <div className="h-16 flex items-center px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <button 
                onClick={() => {
                   setActiveChatUserId(null);
                   setSearchParams({});
                }} 
                className="md:hidden mr-4 p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div className="ml-3">
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {activeChatProfile?.name || 'Loading user...'}
                  </h3>
                  <p className="text-xs text-slate-500 capitalize">{activeChatProfile?.role?.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {chatLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full">
                    <MessageSquare className="w-8 h-8 text-slate-400" />
                  </div>
                  <p>Send a message to start the conversation.</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.sender_id === session?.user?.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                      <div className={`max-w-[75%] rounded-2xl px-5 py-3 ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-tl-sm'}`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..." 
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all shadow-inner"
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="bg-indigo-600 text-white pb-3 pt-3 px-5 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all flex items-center justify-center shadow-lg shadow-indigo-600/30 w-12 h-12"
                >
                  <Send className="w-5 h-5 ml-1" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <MessageSquare className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Your Messages</h3>
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
