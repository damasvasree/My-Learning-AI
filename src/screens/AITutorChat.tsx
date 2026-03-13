import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Loader2,
  Sparkles,
  BookOpen,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play
} from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { StudyMaterial, TopicAnalysis } from '../types';
import { getTutorResponse } from '../services/gemini';
import { generateSpeech } from '../services/voiceService';

interface Message {
  role: 'user' | 'model';
  text: string;
  audioUrl?: string;
}

export default function AITutorChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello! I'm your AI Academic Advisor. I've analyzed your study materials and quiz results. What would you like to review today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const playMessage = async (text: string, index: number) => {
    if (playingId === index) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    setPlayingId(index);
    try {
      const audioUrl = await generateSpeech(text);
      if (audioUrl) {
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
          audioRef.current.onended = () => setPlayingId(null);
        }
      } else {
        setPlayingId(null);
      }
    } catch (error) {
      console.error(error);
      setPlayingId(null);
    }
  };

  useEffect(() => {
    const fetchContext = async () => {
      if (!auth.currentUser) return;
      try {
        const materialsSnap = await getDocs(query(collection(db, 'study_materials'), where('userId', '==', auth.currentUser.uid)));
        const analysisSnap = await getDocs(query(collection(db, 'topic_analysis'), where('userId', '==', auth.currentUser.uid)));
        
        const materials = materialsSnap.docs.map(d => d.data().summary).join('\n');
        const weakTopics = analysisSnap.docs
          .filter(d => d.data().masteryLevel === 'weak')
          .map(d => d.data().topic)
          .join(', ');

        setContext(`Study Materials Summary: ${materials}. Weak Topics: ${weakTopics}`);
      } catch (error) {
        console.error(error);
      }
    };
    fetchContext();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await getTutorResponse(userMsg, history, context);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
      
      if (autoPlay) {
        const newIndex = messages.length + 1;
        playMessage(response, newIndex);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden animate-in fade-in duration-500">
      {/* Header */}
      <div className="p-4 border-b border-black/5 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="font-bold text-sm">AI Tutor Advisor</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Online & Context Aware</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setAutoPlay(!autoPlay)}
            className={`p-2 rounded-xl transition-all ${autoPlay ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}
            title={autoPlay ? "Auto-play enabled" : "Auto-play disabled"}
          >
            {autoPlay ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold flex items-center gap-1">
            <Sparkles size={10} />
            ADAPTIVE
          </div>
        </div>
      </div>

      <audio ref={audioRef} hidden />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                m.role === 'user' ? 'bg-black text-white' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {m.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed relative group ${
                m.role === 'user' 
                  ? 'bg-black text-white rounded-tr-none' 
                  : 'bg-gray-100 text-gray-800 rounded-tl-none'
              }`}>
                {m.text}
                {m.role === 'model' && (
                  <button 
                    onClick={() => playMessage(m.text, i)}
                    className={`absolute -right-10 top-2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                      playingId === i ? 'bg-emerald-500 text-white opacity-100' : 'bg-white border border-black/5 text-gray-400 hover:text-emerald-500'
                    }`}
                  >
                    {playingId === i ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-emerald-500" />
                <span className="text-xs text-gray-500 font-medium">Tutor is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-black/5">
        <form onSubmit={handleSend} className="flex gap-2">
          <button 
            type="button"
            onClick={toggleListening}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <input 
            type="text" 
            placeholder={isListening ? "Listening..." : "Ask your tutor anything..."} 
            className="flex-1 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-600 transition-all disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </form>
        <div className="mt-2 flex items-center gap-4 px-1">
          <button className="text-[10px] font-bold text-gray-400 hover:text-emerald-600 flex items-center gap-1 transition-colors">
            <BookOpen size={10} />
            REFERENCE MATERIAL
          </button>
          <button className="text-[10px] font-bold text-gray-400 hover:text-emerald-600 flex items-center gap-1 transition-colors">
            <Sparkles size={10} />
            EXPLAIN WEAK TOPICS
          </button>
        </div>
      </div>
    </div>
  );
}
