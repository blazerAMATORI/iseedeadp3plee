'use client';

import { useState, useEffect } from 'react';
import { Trophy, Users, Play, Star, Medal } from 'lucide-react';
import { useQuizRoom } from "@/hooks/useQuizRoom";
import { db } from '@/lib/firebase';
import { ref, update } from 'firebase/database';

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
  
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);

  const { roomData, updateScore } = useQuizRoom(roomId, nickname, selectedAvatar.emoji);

  // Следим за статусом комнаты (если админ нажал старт)
  useEffect(() => {
    if (roomData?.status === 'playing' && screen === 'lobby') {
      setScreen('quiz');
    }
  }, [roomData?.status, screen]);

  useEffect(() => {
    if (screen === 'quiz' && timeLeft > 0 && selectedAnswer === null) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && selectedAnswer === null) {
      handleAnswer(-1);
    }
  }, [timeLeft, screen, selectedAnswer]);

  const startGlobalGame = () => {
    update(ref(db, `rooms/${roomId}`), { status: 'playing' });
  };

  const handleAnswer = (index: number) => {
    setSelectedAnswer(index);
    let newScore = score;
    if (index === dotaQuestions[currentQ].correctIndex) {
      newScore = score + 100 + (timeLeft * 5);
      setScore(newScore);
      updateScore(newScore);
    }
    
    setTimeout(() => {
      if (currentQ < dotaQuestions.length - 1) {
        setCurrentQ(currentQ + 1);
        setSelectedAnswer(null);
        setTimeLeft(15);
      } else {
        setScreen('results');
      }
    }, 1500);
  };

  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-5xl font-bold mb-8">Dota 2 Online 🎮</h1>
        <div className="bg-white/10 p-8 rounded-3xl border border-white/20 w-full max-w-md">
          <input className="w-full p-4 rounded-xl bg-white/5 border border-white/20 mb-2 outline-none" placeholder="Ник" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          <input className="w-full p-4 rounded-xl bg-white/5 border border-white/20 mb-4 outline-none" placeholder="Код комнаты" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
          <div className="grid grid-cols-4 gap-2 mb-6">
            {avatarOptions.map(a => (
              <button key={a.id} onClick={() => setSelectedAvatar(a)} className={`text-2xl p-2 rounded-lg ${selectedAvatar.id === a.id ? 'bg-amber-500' : 'bg-white/5'}`}>{a.emoji}</button>
            ))}
          </div>
          <button disabled={!nickname || !roomId} onClick={() => setScreen('lobby')} className="w-full bg-amber-500 p-4 rounded-xl font-bold disabled:opacity-50">Войти</button>
        </div>
      </div>
    );
  }

  if (screen === 'lobby') {
    const players = roomData?.players ? Object.values(roomData.players) : [];
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl mb-2 text-white/50">ID комнаты: {roomId}</h2>
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2"><Users /> Ожидание игроков...</h1>
        <div className="grid grid-cols-1 gap-4 w-full max-w-md mb-8">
          {players.map((p: any, idx: number) => (
            <div key={idx} className="bg-white/10 p-4 rounded-2xl flex items-center justify-between border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{p.avatar}</span>
                <span className="font-bold">{p.nickname}</span>
              </div>
              <span className="text-emerald-400 text-sm">Готов</span>
            </div>
          ))}
        </div>
        <button onClick={startGlobalGame} className="bg-emerald-500 p-4 px-12 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition">
          <Play /> Начать для всех
        </button>
      </div>
    );
  }

  if (screen === 'quiz') {
    const q = dotaQuestions[currentQ];
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl text-center">
           <div className="text-amber-400 text-3xl font-mono mb-4">⏱ {timeLeft}</div>
           <div className="bg-white/10 p-10 rounded-3xl mb-6 text-2xl font-bold">{q.text}</div>
           <div className="grid gap-3">
             {q.options.map((opt, i) => (
               <button key={i} onClick={() => selectedAnswer === null && handleAnswer(i)} className={`p-4 rounded-xl border ${selectedAnswer === i ? (i === q.correctIndex ? 'bg-emerald-600' : 'bg-red-600') : 'bg-white/5'}`}>{opt}</button>
             ))}
           </div>
        </div>
      </div>
    );
  }

  if (screen === 'results') {
    const players = roomData?.players ? Object.values(roomData.players).sort((a: any, b: any) => b.score - a.score) : [];
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <Trophy className="w-16 h-16 text-amber-400 mb-4" />
        <h1 className="text-4xl font-bold mb-8">Пьедестал</h1>
        <div className="w-full max-w-md space-y-4">
          {players.map((p: any, idx: number) => (
            <div key={idx} className={`p-5 rounded-2xl flex items-center justify-between ${idx === 0 ? 'bg-amber-500/20 border-2 border-amber-500' : 'bg-white/5'}`}>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-black">{idx + 1}</span>
                <span className="text-3xl">{p.avatar}</span>
                <span className="text-xl font-bold">{p.nickname}</span>
              </div>
              <div className="text-amber-400 font-bold text-xl">{p.score}</div>
            </div>
          ))}
        </div>
        <button onClick={() => window.location.reload()} className="mt-8 opacity-50 hover:opacity-100">Выйти в меню</button>
      </div>
    );
  }
  return null;
}
