'use client';

import { useState, useEffect } from 'react';
import { Trophy, Users, Play, Star, ChevronRight } from 'lucide-react';
import { useQuizRoom } from "@/hooks/useQuizRoom";
import { db } from '@/lib/firebase';
import { ref, update } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';

const avatarOptions = [
  { id: 1, emoji: '🐱' }, { id: 2, emoji: '🐶' }, { id: 3, emoji: '🦊' }, { id: 4, emoji: '🐸' },
  { id: 5, emoji: '🐵' }, { id: 6, emoji: '🐯' }, { id: 7, emoji: '🐨' }, { id: 8, emoji: '🐙' }
];

const dotaQuestions = [
  { text: "Какой предмет собирается из Sacred Relic и Radiance Recipe?", options: ["Radiance", "Divine Rapier", "Nullifier", "Heart of Tarrasque"], correctIndex: 0 },
  { text: "Сколько героев было в первой Доте?", options: ["100", "112", "120", "98"], correctIndex: 1 },
  { text: "Какой ульт у Enigma?", options: ["Black Hole", "Echo Slam", "Reverse Polarity", "Chrono"], correctIndex: 0 }
];

export default function QuizPage() {
  const [screen, setScreen] = useState('home');
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(avatarOptions[0]);
  
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [localTime, setLocalTime] = useState(15);

  const { roomData, updateScore } = useQuizRoom(roomId, nickname, selectedAvatar.emoji);

  // СИНХРОНИЗАЦИЯ: Следим за индексом вопроса в Firebase
  const currentQ = roomData?.currentQuestion || 0;
  const isHost = roomData?.host === nickname || !roomData?.host;

  useEffect(() => {
    if (roomData?.status === 'playing' && screen === 'lobby') setScreen('quiz');
    if (roomData?.status === 'finished' && screen === 'quiz') setScreen('results');
    
    // Сброс локального выбора при смене вопроса в базе
    setSelectedAnswer(null);
    setLocalTime(15);
  }, [currentQ, roomData?.status]);

  const startGlobalGame = () => {
    update(ref(db, `rooms/${roomId}`), { 
      status: 'playing', 
      currentQuestion: 0,
      host: nickname 
    });
  };

  const nextQuestion = () => {
    if (currentQ < dotaQuestions.length - 1) {
      update(ref(db, `rooms/${roomId}`), { currentQuestion: currentQ + 1 });
    } else {
      update(ref(db, `rooms/${roomId}`), { status: 'finished' });
    }
  };

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    if (index === dotaQuestions[currentQ].correctIndex) {
      const newScore = score + 100 + (localTime * 5);
      setScore(newScore);
      updateScore(newScore);
    }
  };

  // Экран входа
  // Экран входа
  if (screen === 'home') {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6"
      >
        <motion.h1 
          initial={{ y: -20 }} 
          animate={{ y: 0 }} 
          className="text-6xl font-black mb-12 bg-gradient-to-r from-amber-400 to-orange-600 bg-clip-text text-transparent italic"
        >
          DOTA QUIZ
        </motion.h1>

        <div className="bg-slate-800/50 p-8 rounded-[2.5rem] border border-white/10 w-full max-w-md backdrop-blur-xl shadow-2xl">
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs font-bold text-amber-500 uppercase ml-2 mb-1 block">Никнейм</label>
              <input 
                className="w-full p-4 rounded-2xl bg-slate-900/50 border border-white/10 outline-none focus:ring-2 ring-amber-500/50 transition-all" 
                placeholder="Твой ник" 
                value={nickname} 
                onChange={(e) => setNickname(e.target.value)} 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-amber-500 uppercase ml-2 mb-1 block">Код лобби</label>
              <input 
                className="w-full p-4 rounded-2xl bg-slate-900/50 border border-white/10 outline-none focus:ring-2 ring-amber-500/50 transition-all" 
                placeholder="Например: gaben777" 
                value={roomId} 
                onChange={(e) => setRoomId(e.target.value)} 
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-8">
            {avatarOptions.map(a => (
              <button 
                key={a.id} 
                onClick={() => setSelectedAvatar(a)} 
                className={`text-3xl p-3 rounded-xl transition-all ${selectedAvatar.id === a.id ? 'bg-amber-500 scale-110 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-slate-900/50 hover:bg-slate-700'}`}
              >
                {a.emoji}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <button 
              disabled={!nickname || !roomId} 
              onClick={() => setScreen('lobby')} 
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 p-5 rounded-2xl font-black text-xl hover:brightness-110 disabled:opacity-30 transition-all uppercase tracking-widest shadow-lg shadow-orange-900/20"
            >
              Войти в игру
            </button>
            
            <div className="flex items-center gap-4 my-2">
              <div className="h-[1px] bg-white/10 flex-1"></div>
              <span className="text-[10px] text-white/20 font-bold uppercase">или</span>
              <div className="h-[1px] bg-white/10 flex-1"></div>
            </div>

            <button 
              disabled={!nickname || !roomId} 
              onClick={() => {
                // Если хочешь, чтобы "Создать" генерило случайный ID, можно добавить функцию, 
                // но пока оставим так для простоты
                setScreen('lobby');
              }} 
              className="w-full bg-slate-700/50 border border-white/10 p-4 rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all uppercase tracking-widest"
            >
              Создать новое пати
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Лобби
  if (screen === 'lobby') {
    const players = roomData?.players ? Object.values(roomData.players) : [];
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6">
        <div className="mb-8 text-center">
            <p className="text-amber-500 font-mono tracking-tighter uppercase mb-2">ID: {roomId}</p>
            <h1 className="text-4xl font-black flex items-center gap-3"><Users className="text-amber-500" /> КТО В СЕТИ?</h1>
        </div>
        <div className="grid gap-3 w-full max-w-md mb-10">
          <AnimatePresence>
            {players.map((p: any, idx: number) => (
              <motion.div key={idx} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="bg-slate-800/40 p-5 rounded-2xl flex items-center justify-between border border-white/5 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <span className="text-4xl bg-slate-900 p-2 rounded-xl">{p.avatar}</span>
                  <span className="text-xl font-bold">{p.nickname}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest">Ready</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {isHost && (
          <button onClick={startGlobalGame} className="group bg-white text-black p-5 px-16 rounded-2xl font-black text-xl hover:bg-amber-400 transition-all flex items-center gap-3">
            <Play fill="black" /> ПОГНАЛИ!
          </button>
        )}
      </div>
    );
  }

  // Игра (Синхронная)
  if (screen === 'quiz') {
    const q = dotaQuestions[currentQ];
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="flex justify-between items-end mb-8 px-2">
            <div>
                <p className="text-amber-500 font-bold text-sm uppercase tracking-widest mb-1">Вопрос {currentQ + 1} / {dotaQuestions.length}</p>
                <div className="h-1.5 w-48 bg-white/10 rounded-full overflow-hidden">
                    <motion.div animate={{ width: `${((currentQ + 1) / dotaQuestions.length) * 100}%` }} className="h-full bg-amber-500" />
                </div>
            </div>
            <div className="text-right">
                <p className="text-white/40 text-xs uppercase font-bold">Твой счет</p>
                <p className="text-3xl font-black text-amber-500 tracking-tighter">{score}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={currentQ} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="bg-slate-800/80 p-10 rounded-[2.5rem] border border-white/10 mb-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 bg-amber-500 h-full" />
                <h2 className="text-3xl font-bold leading-tight">{q.text}</h2>
            </motion.div>
          </AnimatePresence>

          <div className="grid gap-4">
            {q.options.map((opt, i) => (
              <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                key={i} 
                onClick={() => handleAnswer(i)} 
                className={`p-6 rounded-2xl border-2 text-left font-bold text-lg transition-all ${
                  selectedAnswer === i 
                  ? (i === q.correctIndex ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-red-500/20 border-red-500 text-red-400') 
                  : 'bg-slate-800/40 border-white/5 hover:border-white/20'
                }`}
              >
                {opt}
              </motion.button>
            ))}
          </div>

          {isHost && selectedAnswer !== null && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={nextQuestion} className="mt-10 w-full bg-white text-black p-5 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-amber-400 transition-all">
               СЛЕДУЮЩИЙ ВОПРОС <ChevronRight />
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  // Пьедестал
  if (screen === 'results') {
    const players = roomData?.players ? Object.values(roomData.players).sort((a: any, b: any) => b.score - a.score) : [];
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center mb-12 text-center">
            <Trophy className="w-24 h-24 text-amber-500 mb-4 drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]" />
            <h1 className="text-5xl font-black italic tracking-tighter">THE WINNERS</h1>
        </motion.div>
        
        <div className="w-full max-w-md space-y-3">
          {players.map((p: any, idx: number) => (
            <motion.div key={idx} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }} className={`p-6 rounded-[2rem] flex items-center justify-between border-2 ${idx === 0 ? 'bg-gradient-to-r from-amber-500/20 to-transparent border-amber-500 shadow-lg' : 'bg-slate-800/30 border-white/5'}`}>
              <div className="flex items-center gap-5">
                <span className={`text-2xl font-black italic ${idx === 0 ? 'text-amber-500' : 'text-white/20'}`}>#0{idx + 1}</span>
                <span className="text-4xl">{p.avatar}</span>
                <span className="text-xl font-black uppercase tracking-tight">{p.nickname}</span>
              </div>
              <div className="text-2xl font-black text-amber-500">{p.score}</div>
            </motion.div>
          ))}
        </div>
        <button onClick={() => window.location.reload()} className="mt-12 text-white/30 uppercase text-xs font-black tracking-[0.3em] hover:text-white transition-all">ВЕРНУТЬСЯ В МЕНЮ</button>
      </div>
    );
  }
  return null;
}
