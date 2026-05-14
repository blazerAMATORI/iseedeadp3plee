'use client';

import { useState, useEffect } from 'react';
import { Crown, Users, Play, ArrowRight, Trophy, Clock, Zap, Star, Home, Copy, Check, X } from 'lucide-react';

// Вшитые данные, чтобы не искать папку /data
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
  const [selectedAvatar, setSelectedAvatar] = useState(avatarOptions[0]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);

  // Таймер
  useEffect(() => {
    if (screen === 'quiz' && timeLeft > 0 && selectedAnswer === null) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && selectedAnswer === null) {
      handleAnswer(-1);
    }
  }, [timeLeft, screen, selectedAnswer]);

  const handleAnswer = (index: number) => {
    setSelectedAnswer(index);
    if (index === dotaQuestions[currentQ].correctIndex) {
      setScore(score + 100 + (timeLeft * 5));
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
        <h1 className="text-5xl font-bold mb-8">Dota 2 Quiz 🎮</h1>
        <div className="bg-white/10 p-8 rounded-3xl border border-white/20 w-full max-w-md">
          <input 
            className="w-full p-4 rounded-xl bg-white/5 border border-white/20 mb-4 outline-none"
            placeholder="Твой никнейм"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <div className="grid grid-cols-4 gap-2 mb-6">
            {avatarOptions.map(a => (
              <button key={a.id} onClick={() => setSelectedAvatar(a)} className={`text-2xl p-2 rounded-lg ${selectedAvatar.id === a.id ? 'bg-amber-500' : 'bg-white/5'}`}>{a.emoji}</button>
            ))}
          </div>
          <button onClick={() => setScreen('quiz')} className="w-full bg-amber-500 p-4 rounded-xl font-bold text-lg hover:bg-amber-400 transition">Начать игру</button>
        </div>
      </div>
    );
  }

  if (screen === 'quiz') {
    const q = dotaQuestions[currentQ];
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="flex justify-between mb-4 items-center">
            <span className="text-xl font-bold">Вопрос {currentQ + 1}/3</span>
            <span className="text-amber-400 font-mono text-2xl">⏱ {timeLeft}с</span>
          </div>
          <div className="bg-white/10 p-8 rounded-3xl border border-white/20 mb-6 text-2xl font-bold text-center">
            {q.text}
          </div>
          <div className="grid grid-cols-1 gap-3">
            {q.options.map((opt, i) => (
              <button 
                key={i} 
                onClick={() => selectedAnswer === null && handleAnswer(i)}
                className={`p-5 rounded-2xl text-left border transition ${
                  selectedAnswer === i 
                    ? (i === q.correctIndex ? 'bg-emerald-500 border-emerald-400' : 'bg-red-500 border-red-400') 
                    : (selectedAnswer !== null && i === q.correctIndex ? 'bg-emerald-500 border-emerald-400' : 'bg-white/10 border-white/20')
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'results') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <Trophy className="w-20 h-20 text-amber-400 mb-4" />
        <h2 className="text-4xl font-bold mb-2">Финиш!</h2>
        <p className="text-2xl mb-8">{nickname}, ты набрал <span className="text-amber-400">{score}</span> очков</p>
        <button onClick={() => window.location.reload()} className="bg-white/10 p-4 px-8 rounded-xl flex items-center gap-2 hover:bg-white/20">
          <Home /> На главную
        </button>
      </div>
    );
  }

  return null;
}
