import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  BookOpen, 
  Settings, 
  History, 
  User, 
  Sparkles,
  Loader2,
  ChevronRight,
  PlusCircle,
  Calendar
} from 'lucide-react';
import { diaryService, type DiaryEntry, type UserPreferences } from './services/diaryService';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'prefs'>('chat');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, data?: any }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadData = async () => {
    const [fetchedEntries, fetchedPrefs] = await Promise.all([
      diaryService.getEntries(),
      diaryService.getPreferences()
    ]);
    setEntries(fetchedEntries);
    setPreferences(fetchedPrefs);
    
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hey! I'm your student diary buddy. How was your day? Just tell me what you did or what's on your mind, and I'll help you summarize it and track your learning!"
      }]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const result = await diaryService.generateDiary(userMessage, preferences, entries);
      
      if (result.updatedPreferences) {
        const { key, value } = result.updatedPreferences;
        if (key && value) {
          await diaryService.savePreference(key, value);
          setPreferences(prev => ({ ...prev, [key]: value }));
        }
      }

      if (result.summary && result.learning) {
        const newEntry: DiaryEntry = {
          content: userMessage,
          summary: result.summary,
          learning: result.learning
        };
        const { id } = await diaryService.saveEntry(newEntry);
        setEntries(prev => [{ ...newEntry, id, created_at: new Date().toISOString() }, ...prev]);
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.chatResponse,
        data: result.summary ? { summary: result.summary, learning: result.learning } : null
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Oops, something went wrong. Can you try again?" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      {/* Sidebar / Nav */}
      <nav className="fixed left-0 top-0 h-full w-20 md:w-64 bg-white border-r border-black/5 flex flex-col items-center md:items-stretch p-4 z-50">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <BookOpen size={24} />
          </div>
          <h1 className="hidden md:block font-bold text-xl tracking-tight">Diary Buddy</h1>
        </div>

        <div className="flex-1 space-y-2">
          <NavButton 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')}
            icon={<Sparkles size={20} />}
            label="Daily Chat"
          />
          <NavButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
            icon={<History size={20} />}
            label="Past Entries"
          />
          <NavButton 
            active={activeTab === 'prefs'} 
            onClick={() => setActiveTab('prefs')}
            icon={<User size={20} />}
            label="My Profile"
          />
        </div>

        <div className="pt-4 border-t border-black/5">
          <div className="hidden md:block p-4 bg-emerald-50 rounded-2xl">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">Status</p>
            <p className="text-sm text-emerald-700 font-medium">Ready for today's entry</p>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="ml-20 md:ml-64 min-h-screen flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 md:p-8"
            >
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-hide"
              >
                {messages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex flex-col",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "max-w-[85%] p-4 rounded-2xl shadow-sm",
                      msg.role === 'user' 
                        ? "bg-emerald-500 text-white rounded-tr-none" 
                        : "bg-white border border-black/5 rounded-tl-none"
                    )}>
                      <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                        <Markdown>
                          {msg.content}
                        </Markdown>
                      </div>
                    </div>
                    
                    {msg.data && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-3 w-full max-w-[85%] bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm"
                      >
                        <div className="flex items-center gap-2 mb-3 text-emerald-600">
                          <PlusCircle size={16} />
                          <span className="text-xs font-bold uppercase tracking-widest">Diary Entry Created</span>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Summary</h4>
                            <p className="text-sm font-medium leading-relaxed">{msg.data.summary}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Learning Outcome</h4>
                            <p className="text-sm italic text-gray-600 leading-relaxed">"{msg.data.learning}"</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-gray-400 p-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs font-medium">Buddy is thinking...</span>
                  </div>
                )}
              </div>

              <div className="mt-6 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="What did you do today? Tell me everything..."
                  className="w-full bg-white border border-black/5 rounded-2xl p-4 pr-16 shadow-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none min-h-[100px]"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-4 bottom-4 w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 hover:bg-emerald-600 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold tracking-tight">Your Journey</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-black/5">
                  <Calendar size={14} />
                  <span>{entries.length} Entries</span>
                </div>
              </div>

              <div className="grid gap-6">
                {entries.map((entry) => (
                  <div key={entry.id} className="bg-white border border-black/5 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                        {new Date(entry.created_at!).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold mb-2 group-hover:text-emerald-600 transition-colors">{entry.summary}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{entry.content}</p>
                      </div>
                      <div className="pt-4 border-t border-black/5">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                          <Sparkles size={12} />
                          Learning Outcome
                        </div>
                        <p className="text-sm font-medium italic text-emerald-700">"{entry.learning}"</p>
                      </div>
                    </div>
                  </div>
                ))}
                {entries.length === 0 && (
                  <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-black/10">
                    <History size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No entries yet. Start chatting to create your first one!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'prefs' && (
            <motion.div 
              key="prefs"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-8"
            >
              <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                    <User size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Your Profile</h2>
                    <p className="text-sm text-gray-500">What I've learned about you so far</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {Object.entries(preferences).length > 0 ? (
                    Object.entries(preferences).map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1 p-4 bg-gray-50 rounded-2xl border border-black/5">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{key}</span>
                        <span className="text-base font-medium">{value}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-gray-500 italic">I'm still getting to know you. Tell me more about yourself in the chat!</p>
                    </div>
                  )}
                </div>

                <div className="mt-10 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex gap-3">
                    <Settings className="text-emerald-600 shrink-0" size={20} />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900 mb-1">Privacy First</h4>
                      <p className="text-xs text-emerald-700 leading-relaxed">
                        Your personal details are stored locally and used only to personalize your diary experience. I won't share them with anyone else.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-2xl transition-all group",
        active 
          ? "bg-emerald-50 text-emerald-600" 
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <div className={cn(
        "shrink-0 transition-transform group-hover:scale-110",
        active ? "text-emerald-600" : "text-gray-400"
      )}>
        {icon}
      </div>
      <span className="hidden md:block font-semibold text-sm">{label}</span>
      {active && <ChevronRight size={16} className="hidden md:block ml-auto opacity-50" />}
    </button>
  );
}
