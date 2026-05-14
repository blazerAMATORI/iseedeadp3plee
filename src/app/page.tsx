'use client';

import { useState, useEffect } from 'react';
import { Trophy, Users, Play, Copy, Check } from 'lucide-react';
import { useQuizRoom } from "@/hooks/useQuizRoom";
import { db } from '@/lib/firebase';
import { ref, update, get } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
// Конфетти без внешних пакетов — чистый Canvas API
function fireConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 180 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    r: Math.random() * 8 + 4,
    color: ['#f59e0b','#ef4444','#3b82f6','#10b981','#a855f7','#ec4899'][Math.floor(Math.random()*6)],
    speed: Math.random() * 4 + 2,
    angle: Math.random() * 2 * Math.PI,
    spin: (Math.random() - 0.5) * 0.2,
  }));

  let frame = 0;
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y += p.speed;
      p.angle += p.spin;
      p.x += Math.sin(p.angle) * 2;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    frame++;
    if (frame < 200) requestAnimationFrame(animate);
    else canvas.remove();
  };
  animate();
}

const avatarOptions = [
  { id: 1, emoji: '🐱' }, { id: 2, emoji: '🐶' }, { id: 3, emoji: '🦊' }, { id: 4, emoji: '🐸' },
  { id: 5, emoji: '🐵' }, { id: 6, emoji: '🐯' }, { id: 7, emoji: '🐨' }, { id: 8, emoji: '🐙' }
];

const dotaQuestions = [
  { text: "Какой предмет собирается из Sacred Relic и Radiance Recipe?", options: ["Radiance", "Divine Rapier", "Nullifier", "Heart of Tarrasque"], correctIndex: 0 },
  { text: "Сколько героев было в первой Доте?", options: ["100", "112", "120", "98"], correctIndex: 1 },
  { text: "Какой ульт у Enigma?", options: ["Black Hole", "Echo Slam", "Reverse Polarity", "Chrono"], correctIndex: 0 },
  { text: "У какого героя есть способность Mana Void?", options: ["Lion", "Zeus", "Anti-Mage", "Pugna"], correctIndex: 2 },
  { text: "Сколько стоит Aghanim's Scepter?", options: ["3800", "4200", "4500", "3500"], correctIndex: 1 },
  { text: "Какой герой использует ульт Ravage?", options: ["Earthshaker", "Magnus", "Tidehunter", "Centaur"], correctIndex: 2 },
  { text: "Что делает предмет Blink Dagger?", options: ["Телепорт на базу", "Мгновенный рывок", "Замедление врагов", "Усиление атаки"], correctIndex: 1 },
  { text: "Какой атрибут у Morphling по умолчанию?", options: ["Сила", "Интеллект", "Ловкость", "Универсал"], correctIndex: 2 },
  { text: "Как называется главный магазин на базе в Dota 2?", options: ["Main Shop", "Secret Shop", "Side Shop", "Base Shop"], correctIndex: 0 },
  { text: "Сколько очков здоровья даёт каждый пункт Силы?", options: ["18", "20", "22", "25"], correctIndex: 2 },
];

const MEDALS = ['🥇', '🥈', '🥉'];
const TIMER_START = 15;

export default function QuizPage() {
  const [screen, setScreen] = useState('home');
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(avatarOptions[0]);
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);

  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [localTime, setLocalTime] = useState(TIMER_START);

  const { roomData, updateScore, submitAnswer } = useQuizRoom(roomId, nickname, selectedAvatar.emoji, joined);

  const currentQ = roomData?.currentQuestion || 0;
  const isHost = !!roomData?.host && roomData.host === nickname;

  // Список живых игроков (без призраков)
  const players: any[] = roomData?.players
    ? Object.values(roomData.players).filter((p: any) => p.nickname)
    : [];

  // Сколько уже ответили на текущий вопрос
  const answeredCount = Object.keys(roomData?.answers?.[currentQ] || {}).length;
  const playerCount = players.length;
  const allAnswered = playerCount > 0 && answeredCount >= playerCount;

  // ── АВТО-ПЕРЕХОД: все ответили → хост ждёт 2 секунды и двигает вперёд
  useEffect(() => {
    if (!isHost || screen !== 'quiz' || !allAnswered) return;
    const timer = setTimeout(() => {
      if (currentQ < dotaQuestions.length - 1) {
        update(ref(db, `rooms/${roomId}`), { currentQuestion: currentQ + 1 });
      } else {
        update(ref(db, `rooms/${roomId}`), { status: 'finished' });
      }
    }, 2000); // 2 секунды чтобы все увидели правильный ответ
    return () => clearTimeout(timer);
  }, [allAnswered, isHost, screen, currentQ, roomId]);

  // ── СТАТУС КОМНАТЫ: переходы между экранами
  useEffect(() => {
    if (roomData?.status === 'playing' && screen === 'lobby') setScreen('quiz');
    if (roomData?.status === 'finished' && screen === 'quiz') setScreen('results');
    if (roomData?.status === 'waiting' && screen === 'results') {
      setScore(0);
      setScreen('lobby');
    }
    setSelectedAnswer(null);
    setLocalTime(TIMER_START);
  }, [currentQ, roomData?.status]);

  // ── ТАЙМЕР: тикает пока идёт игра
  useEffect(() => {
    if (screen !== 'quiz') return;
    setLocalTime(TIMER_START);
    const interval = setInterval(() => {
      setLocalTime(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentQ, screen]);

  // ── ТАЙМАУТ: время вышло — принудительно фиксируем "ответил" для авто-перехода
  useEffect(() => {
    if (localTime === 0 && screen === 'quiz') {
      submitAnswer(currentQ);
    }
  }, [localTime]);

  // ── КОНФЕТТИ: победитель получает салют
  useEffect(() => {
    if (screen !== 'results' || players.length === 0) return;
    const sorted = [...players].sort((a: any, b: any) => b.score - a.score);
    if (sorted[0]?.nickname === nickname) {
      fireConfetti();
    }
  }, [screen]);

  const handleJoin = () => {
    setJoined(true);
    setScreen('lobby');
  };

  const handleCreate = async () => {
    const snapshot = await get(ref(db, `rooms/${roomId}`));
    if (!snapshot.val()?.host) {
      await update(ref(db, `rooms/${roomId}`), { host: nickname, status: 'waiting', currentQuestion: 0 });
    }
    setJoined(true);
    setScreen('lobby');
  };

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null || localTime === 0) return;
    setSelectedAnswer(index);
    submitAnswer(currentQ); // Говорим всем что этот игрок ответил
    if (index === dotaQuestions[currentQ].correctIndex) {
      const newScore = score + 100 + (localTime * 5);
      setScore(newScore);
      updateScore(newScore);
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Хост сбрасывает игру — все остаются в лобби
  const playAgain = async () => {
    const resetUpdates: Record<string, any> = {
      [`rooms/${roomId}/status`]: 'waiting',
      [`rooms/${roomId}/currentQuestion`]: 0,
      [`rooms/${roomId}/answers`]: null,
    };
    Object.keys(roomData?.players || {}).forEach(p => {
      resetUpdates[`rooms/${roomId}/players/${p}/score`] = 0;
    });
    await update(ref(db), resetUpdates);
  };

  const startGlobalGame = () => {
    update(ref(db, `rooms/${roomId}`), { status: 'playing', currentQuestion: 0 });
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ЭКРАН: ГЛАВНАЯ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (screen === 'home') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6">
        <motion.h1 initial={{ y: -20 }} animate={{ y: 0 }} className="text-6xl font-black mb-12 bg-gradient-to-r from-amber-400 to-orange-600 bg-clip-text text-transparent italic">
          DOTA QUIZ
        </motion.h1>

        <div className="bg-slate-800/50 p-8 rounded-[2.5rem] border border-white/10 w-full max-w-md backdrop-blur-xl shadow-2xl">
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs font-bold text-amber-500 uppercase ml-2 mb-1 block">Никнейм</label>
              <input className="w-full p-4 rounded-2xl bg-slate-900/50 border border-white/10 outline-none focus:ring-2 ring-amber-500/50 transition-all" placeholder="Твой ник" value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-amber-500 uppercase ml-2 mb-1 block">Код лобби</label>
              <input className="w-full p-4 rounded-2xl bg-slate-900/50 border border-white/10 outline-none focus:ring-2 ring-amber-500/50 transition-all" placeholder="Например: gaben777" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-8">
            {avatarOptions.map(a => (
              <button key={a.id} onClick={() => setSelectedAvatar(a)} className={`text-3xl p-3 rounded-xl transition-all ${selectedAvatar.id === a.id ? 'bg-amber-500 scale-110 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-slate-900/50 hover:bg-slate-700'}`}>
                {a.emoji}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <button disabled={!nickname || !roomId} onClick={handleJoin} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 p-5 rounded-2xl font-black text-xl hover:brightness-110 disabled:opacity-30 transition-all uppercase tracking-widest shadow-lg shadow-orange-900/20">
              Войти в игру
            </button>
            <div className="flex items-center gap-4 my-2">
              <div className="h-[1px] bg-white/10 flex-1" />
              <span className="text-[10px] text-white/20 font-bold uppercase">или</span>
              <div className="h-[1px] bg-white/10 flex-1" />
            </div>
            <button disabled={!nickname || !roomId} onClick={handleCreate} className="w-full bg-slate-700/50 border border-white/10 p-4 rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all uppercase tracking-widest">
              Создать новое пати
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ЭКРАН: ЛОББИ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (screen === 'lobby') {
    if (!roomData) {
      return (
        <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center">
          <p className="text-white/40 animate-pulse uppercase tracking-widest text-sm">Подключение к лобби...</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6">
        <div className="mb-8 text-center">
          {/* Кнопка копирования ID */}
          <button onClick={copyRoomId} className="flex items-center gap-2 mx-auto mb-3 px-4 py-2 bg-slate-800/60 border border-white/10 rounded-xl text-sm font-mono hover:border-amber-500/40 transition-all group">
            <span className="text-amber-500 tracking-tight">{roomId}</span>
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-white/30 group-hover:text-white/60 transition-all" />}
            <span className="text-white/30 text-xs">{copied ? 'скопировано!' : 'скопировать'}</span>
          </button>
          <h1 className="text-4xl font-black flex items-center gap-3"><Users className="text-amber-500" /> КТО В СЕТИ?</h1>
          <p className="text-white/30 text-sm mt-2">
            Хост: <span className="text-amber-400">👑 {roomData?.host || '...'}</span>
          </p>
        </div>

        <div className="grid gap-3 w-full max-w-md mb-10">
          <AnimatePresence>
            {players.map((p: any) => (
              <motion.div key={p.nickname} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} className="bg-slate-800/40 p-5 rounded-2xl flex items-center justify-between border border-white/5 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <span className="text-4xl bg-slate-900 p-2 rounded-xl">{p.avatar}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold">{p.nickname}</span>
                      {roomData?.host === p.nickname && <span className="text-amber-400 text-lg">👑</span>}
                    </div>
                    {p.nickname === nickname && <span className="text-white/30 text-xs">это ты</span>}
                  </div>
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest">Ready</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {isHost ? (
          <button onClick={startGlobalGame} className="bg-white text-black p-5 px-16 rounded-2xl font-black text-xl hover:bg-amber-400 transition-all flex items-center gap-3">
            <Play fill="black" /> ПОГНАЛИ!
          </button>
        ) : (
          <p className="text-white/20 text-sm animate-pulse uppercase tracking-widest">Ждём хоста...</p>
        )}
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ЭКРАН: ВОПРОС
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (screen === 'quiz') {
    const q = dotaQuestions[currentQ];
    const timerColor = localTime > 10 ? 'text-emerald-400' : localTime > 5 ? 'text-amber-400' : 'text-red-400';
    const timerBorder = localTime > 10 ? 'border-emerald-500/30' : localTime > 5 ? 'border-amber-500/30' : 'border-red-500/50';

    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl">

          {/* Хедер: прогресс + таймер + счёт */}
          <div className="flex justify-between items-center mb-8 px-2">
            <div>
              <p className="text-amber-500 font-bold text-sm uppercase tracking-widest mb-1">Вопрос {currentQ + 1} / {dotaQuestions.length}</p>
              <div className="h-1.5 w-48 bg-white/10 rounded-full overflow-hidden">
                <motion.div animate={{ width: `${((currentQ + 1) / dotaQuestions.length) * 100}%` }} className="h-full bg-amber-500" />
              </div>
            </div>

            {/* Таймер */}
            <motion.div
              key={currentQ}
              className={`flex items-center justify-center w-16 h-16 rounded-2xl border-2 ${timerBorder} bg-slate-800/60`}
              animate={{ scale: localTime <= 5 && localTime > 0 ? [1, 1.1, 1] : 1 }}
              transition={{ repeat: localTime <= 5 ? Infinity : 0, duration: 0.5 }}
            >
              <span className={`text-2xl font-black ${timerColor}`}>{localTime}</span>
            </motion.div>

            <div className="text-right">
              <p className="text-white/40 text-xs uppercase font-bold">Счёт</p>
              <p className="text-3xl font-black text-amber-500 tracking-tighter">{score}</p>
            </div>
          </div>

          {/* Вопрос */}
          <AnimatePresence mode="wait">
            <motion.div key={currentQ} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="bg-slate-800/80 p-10 rounded-[2.5rem] border border-white/10 mb-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 bg-amber-500 h-full" />
              <h2 className="text-3xl font-bold leading-tight">{q.text}</h2>
            </motion.div>
          </AnimatePresence>

          {/* Варианты ответов */}
          <div className="grid gap-4">
            {q.options.map((opt, i) => {
              const isSelected = selectedAnswer === i;
              const isCorrect = i === q.correctIndex;
              const showResult = selectedAnswer !== null || localTime === 0;

              let style = 'bg-slate-800/40 border-white/5 hover:border-white/20';
              if (showResult) {
                if (isCorrect) style = 'bg-emerald-500/20 border-emerald-500 text-emerald-400';
                else if (isSelected) style = 'bg-red-500/20 border-red-500 text-red-400';
              }

              return (
                <motion.button
                  whileHover={!showResult ? { scale: 1.02 } : {}}
                  whileTap={!showResult ? { scale: 0.98 } : {}}
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={showResult}
                  className={`p-6 rounded-2xl border-2 text-left font-bold text-lg transition-all ${style}`}
                >
                  {opt}
                </motion.button>
              );
            })}
          </div>

          {/* Статус: сколько ответили */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center">
            {selectedAnswer !== null || localTime === 0 ? (
              allAnswered ? (
                <p className="text-emerald-400 text-sm font-bold animate-pulse uppercase tracking-widest">✓ Все ответили! Переходим...</p>
              ) : (
                <p className="text-white/30 text-sm uppercase tracking-widest">
                  Ждём остальных... {answeredCount}/{playerCount}
                </p>
              )
            ) : (
              <p className="text-white/20 text-xs uppercase tracking-widest">Выбери ответ</p>
            )}
          </motion.div>

        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ЭКРАН: РЕЗУЛЬТАТЫ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (screen === 'results') {
    const sorted = [...players].sort((a: any, b: any) => b.score - a.score);
    const isWinner = sorted[0]?.nickname === nickname;

    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center mb-12 text-center">
          <Trophy className="w-24 h-24 text-amber-500 mb-4 drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]" />
          <h1 className="text-5xl font-black italic tracking-tighter">THE WINNERS</h1>
          {isWinner && (
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-amber-400 font-bold mt-3 text-lg">
              🎉 Ты победил, легенда!
            </motion.p>
          )}
        </motion.div>

        <div className="w-full max-w-md space-y-3 mb-12">
          {sorted.map((p: any, idx: number) => (
            <motion.div
              key={p.nickname}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-6 rounded-[2rem] flex items-center justify-between border-2 ${
                idx === 0 ? 'bg-gradient-to-r from-amber-500/20 to-transparent border-amber-500 shadow-lg shadow-amber-900/20'
                : idx === 1 ? 'bg-gradient-to-r from-slate-400/10 to-transparent border-slate-400/40'
                : idx === 2 ? 'bg-gradient-to-r from-orange-900/20 to-transparent border-orange-800/40'
                : 'bg-slate-800/30 border-white/5'
              }`}
            >
              <div className="flex items-center gap-5">
                <span className="text-3xl">{MEDALS[idx] || `#${idx + 1}`}</span>
                <span className="text-4xl">{p.avatar}</span>
                <div>
                  <span className="text-xl font-black uppercase tracking-tight">{p.nickname}</span>
                  {p.nickname === nickname && <p className="text-white/30 text-xs">это ты</p>}
                </div>
              </div>
              <div className={`text-2xl font-black ${idx === 0 ? 'text-amber-400' : 'text-white/60'}`}>
                {p.score}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Кнопка "Играть ещё" — только хост */}
        {isHost ? (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={playAgain}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-black p-5 px-14 rounded-2xl font-black text-xl hover:brightness-110 transition-all shadow-lg shadow-orange-900/30 uppercase tracking-widest"
          >
            🔄 Играть ещё!
          </motion.button>
        ) : (
          <p className="text-white/20 text-sm animate-pulse uppercase tracking-widest">Ждём решения хоста...</p>
        )}

        <button onClick={() => window.location.reload()} className="mt-6 text-white/20 uppercase text-xs font-black tracking-[0.3em] hover:text-white transition-all">
          выйти в меню
        </button>
      </div>
    );
  }

  return null;
}
