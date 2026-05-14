'use client';

import { useState, useEffect } from 'react';
import { Trophy, Home, Users, Play, Star } from 'lucide-react';
import { useQuizRoom } from "@/hooks/useQuizRoom";

const avatarOptions = [
  { id: 1, emoji: '🐱' }, { id: 2, emoji: '🐶' }, { id: 3, emoji: ' foxes' }, { id: 4, emoji: '🐸' },
  { id: 5, emoji: '🐵' }, { id: 6, emoji: '🐯' }, { id: 7, emoji: '🐨' }, { id: 8, emoji: '🐙' }
];

const dotaQuestions = [
  { text: "Какой предмет собирается из Sacred Relic и Radiance Recipe?", options: ["Radiance", "Divine Rapier", "Nullifier", "Heart of Tarrasque"], correctIndex: 0 },
  { text: "Сколько героев было в первой Доте?", options: ["100", "112", "120", "98"], correctIndex: 1 },
  { text: "Какой ульт у Enigma?", options: ["Black Hole", "Echo Slam", "Reverse Polarity", "Chrono"], correctIndex: 0 }
];

export default function QuizPage() {
  const [screen, setScreen] = useState('home'); // home, lobby, quiz, results
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(avatarOptions[0]);
  const [roomId, setRoomId] = useState('dota-lobby'); // Можно сделать ввод ID, но пока фиксированный
  
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);

  // ПОДКЛЮЧАЕМ ОНЛАЙН
  const { roomData, updateScore } = useQuizRoom(roomId, nickname, selectedAvatar.emoji);

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
    let newScore = score;
    if (index === dotaQuestions[currentQ].correctIndex) {
      newScore = score + 100 + (timeLeft * 5);
      setScore(newScore);
      updateScore(newScore); // Отправляем очки в Firebase
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

  // ЭКРАН ВХОДА
  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-5xl font-bold mb-8">Dota 2 Online 🎮</h1>
        <div className="bg-white/10 p-8 rounded-3xl border border-white/20 w-full max-w-md">
          <input 
            className="w-full p-4 rounded-xl bg-white/5 border border-white/20 mb-4 outline-none focus:border-amber-500"
            placeholder="Твой никнейм"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <div className="grid grid-cols-4 gap-2 mb-6">
            {avatarOptions.map(a => (
              <button key={a.id} onClick={() => setSelectedAvatar(a)} className={`text-2xl p-2 rounded-lg transition ${selectedAvatar.id === a.id ? 'bg-amber-500 scale-110' : 'bg-white/5'}`}>{a.emoji}</button>
            ))}
          </div>
          <button 
            disabled={!nickname}
            onClick={() => setScreen('lobby')} 
            className="w-full bg-amber-500 p-4 rounded-xl font-bold text-lg hover:bg-amber-400 disabled:opacity-50 transition"
          >
            Войти в лобби
          </button>
        </div>
      </div>
    );
  }

  // ЛОББИ (ОНЛАЙН ТУТ)
  if (screen === 'lobby') {
    const players = roomData?.players ? Object.values(roomData.players) : [];
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-2"><Users /> Игроки в лобби</h2>
        <div className="grid grid-cols-1 gap-4 w-full max-w-md mb-8">
          {players.map((p: any, idx: number) => (
            <div key={idx} className="bg-white/10 p-4 rounded-2xl flex items-center justify-between border border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{p.avatar}</span>
                <span className="font-bold">{p.nickname} {p.nickname === nickname && "(Вы)"}</span>
              </div>
              <div className="flex items-center gap-2 text-amber-400">
                <Star size={16} /> {p.score || 0}
              </div>
            </div>
          ))}
        </div>
        <button 
          onClick={() => setScreen('quiz')} 
          className="bg-emerald-500 p-4 px-12 rounded-xl font-bold text-lg hover:bg-emerald-400 transition flex items-center gap-2"
        >
          <Play /> Погнали!
        </button>
      </div>
    );
  }

  // КВИЗ И РЕЗУЛЬТАТЫ (оставил как было, но с отправкой очков)
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
        <button onClick={() => setScreen('lobby')} className="bg-white/10 p-4 px-8 rounded-xl flex items-center gap-2 hover:bg-white/20 transition">
           Вернуться в лобби
        </button>
      </div>
    );
  }

  return null;
}
