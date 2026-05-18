'use client';

import { useState, useEffect } from 'react';
import { Trophy, Users, Play, Copy, Check, Sun, Moon, ArrowLeft, Shuffle, Save } from 'lucide-react';
import { useQuizRoom } from "@/hooks/useQuizRoom";
import { db } from '@/lib/firebase';
import { ref, update, get } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';

// ── КОНФЕТТИ (без внешних пакетов) ──────────────────────────────────────────
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
      p.y += p.speed; p.angle += p.spin; p.x += Math.sin(p.angle) * 2;
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    });
    frame++;
    if (frame < 200) requestAnimationFrame(animate); else canvas.remove();
  };
  animate();
}

// ── ТИПЫ И КОНСТАНТЫ ────────────────────────────────────────────────────────
type Question = { text: string; options: string[]; correctIndex: number };

const avatarOptions = [
  { id: 1, emoji: '🐱' }, { id: 2, emoji: '🐶' }, { id: 3, emoji: '🦊' }, { id: 4, emoji: '🐸' },
  { id: 5, emoji: '🐵' }, { id: 6, emoji: '🐯' }, { id: 7, emoji: '🐨' }, { id: 8, emoji: '🐙' }
];

// Дефолтные вопросы по Dota 2 (используются как фолбэк и для импорта)
const dotaQuestions: Question[] = [
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
const DEFAULT_TIMER = 15;

const emptyQ = (): Question => ({ text: '', options: ['', '', '', ''], correctIndex: 0 });

// ── ГЛАВНЫЙ КОМПОНЕНТ ────────────────────────────────────────────────────────
export default function QuizPage() {
  // Навигация
  const [screen, setScreen] = useState('home');

  // Тема
  const [isDark, setIsDark] = useState(true);

  // Данные пользователя
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(avatarOptions[0]);
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);

  // Конструктор
  const [builderQuestions, setBuilderQuestions] = useState<Question[]>([]);
  const [activeQIndex, setActiveQIndex] = useState(0);
  const [templateSelected, setTemplateSelected] = useState(false);
  const [timerDuration, setTimerDuration] = useState(DEFAULT_TIMER);
  const [builderError, setBuilderError] = useState('');

  // Игра
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [localTime, setLocalTime] = useState(DEFAULT_TIMER);

  // Загружаем тему из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('quizTheme');
    if (saved) setIsDark(saved === 'dark');
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('quizTheme', next ? 'dark' : 'light');
      return next;
    });
  };

  // ── FIREBASE ХУК ────────────────────────────────────────────────────────
  const { roomData, updateScore, submitAnswer } = useQuizRoom(roomId, nickname, selectedAvatar.emoji, joined);

  // Вопросы: из Firebase (если хост создал через конструктор) или дефолтные
  const activeQuestions: Question[] = roomData?.questions || dotaQuestions;
  const roomTimerDuration: number = roomData?.timerDuration || DEFAULT_TIMER;

  const currentQ = roomData?.currentQuestion || 0;
  const isHost = !!roomData?.host && roomData.host === nickname;

  const players: any[] = roomData?.players
    ? Object.values(roomData.players).filter((p: any) => p.nickname)
    : [];

  const answeredCount = Object.keys(roomData?.answers?.[currentQ] || {}).length;
  const playerCount = players.length;
  const allAnswered = playerCount > 0 && answeredCount >= playerCount;

  // ── ТЕМА: вспомогательные классы ────────────────────────────────────────
  const th = {
    page:    isDark ? 'bg-[#0f172a] text-white'            : 'bg-gray-50 text-gray-900',
    card:    isDark ? 'bg-slate-800/50 border-white/10'    : 'bg-white border-gray-200',
    cardSolid: isDark ? 'bg-slate-800 border-white/10'     : 'bg-white border-gray-200',
    input:   isDark ? 'bg-slate-900/50 border-white/10 text-white placeholder:text-white/30'
                    : 'bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-400',
    sub:     isDark ? 'text-white/40'                      : 'text-gray-400',
    divider: isDark ? 'bg-white/10'                        : 'bg-gray-200',
    btnSec:  isDark ? 'bg-slate-700/50 border-white/10 hover:bg-slate-700 text-white'
                    : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-700',
    btnGhost: isDark ? 'bg-slate-700 text-white/60 hover:text-white hover:bg-slate-600'
                     : 'bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200',
    answerIdle: isDark ? 'bg-slate-800/40 border-white/5 hover:border-white/20'
                       : 'bg-white border-gray-200 hover:border-amber-400',
    questionCard: isDark ? 'bg-slate-800/80 border-white/10' : 'bg-white border-gray-200',
  };

  // ── КНОПКА ТЕМЫ (везде) ─────────────────────────────────────────────────
  const ThemeToggle = () => (
    <button
      onClick={toggleTheme}
      className={`fixed top-4 right-4 z-50 p-3 rounded-2xl border shadow-lg transition-all ${th.cardSolid} ${isDark ? 'text-amber-400 hover:bg-slate-700' : 'text-gray-500 hover:bg-gray-50'}`}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );

  // ── АВТО-ПЕРЕХОД: все ответили ───────────────────────────────────────────
  useEffect(() => {
    if (!isHost || screen !== 'quiz' || !allAnswered) return;
    const timer = setTimeout(() => {
      if (currentQ < activeQuestions.length - 1) {
        update(ref(db, `rooms/${roomId}`), { currentQuestion: currentQ + 1 });
      } else {
        update(ref(db, `rooms/${roomId}`), { status: 'finished' });
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [allAnswered, isHost, screen, currentQ, roomId, activeQuestions.length]);

  // ── ПЕРЕХОДЫ МЕЖДУ ЭКРАНАМИ ──────────────────────────────────────────────
  useEffect(() => {
    if (roomData?.status === 'playing' && screen === 'lobby') setScreen('quiz');
    if (roomData?.status === 'finished' && screen === 'quiz') setScreen('results');
    if (roomData?.status === 'waiting' && screen === 'results') {
      setScore(0); setScreen('lobby');
    }
    setSelectedAnswer(null);
    setLocalTime(roomTimerDuration);
  }, [currentQ, roomData?.status]);

  // ── ТАЙМЕР ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'quiz') return;
    setLocalTime(roomTimerDuration);
    const interval = setInterval(() => {
      setLocalTime(prev => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentQ, screen, roomTimerDuration]);

  // Таймаут → авто-сабмит
  useEffect(() => {
    if (localTime === 0 && screen === 'quiz') submitAnswer(currentQ);
  }, [localTime]);

  // Конфетти для победителя
  useEffect(() => {
    if (screen !== 'results' || players.length === 0) return;
    const sorted = [...players].sort((a: any, b: any) => b.score - a.score);
    if (sorted[0]?.nickname === nickname) fireConfetti();
  }, [screen]);

  // ── ДЕЙСТВИЯ ─────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    const snapshot = await get(ref(db, `rooms/${roomId}`));
    const data = snapshot.val();
    const existingPlayers = data?.players ? Object.values(data.players) : [];

    // Сбрасываем статус ДО joined=true — иначе onValue поймает старый status:'playing'
    if (existingPlayers.length === 0 || data?.status === 'finished') {
      await update(ref(db, `rooms/${roomId}`), {
        status: 'waiting',
        currentQuestion: 0,
        answers: null,
      });
    }

    setJoined(true);
    setScreen('lobby');
  };

  const handleCreate = async () => {
    const snapshot = await get(ref(db, `rooms/${roomId}`));
    if (!snapshot.val()?.host) {
      await update(ref(db, `rooms/${roomId}`), { host: nickname, status: 'waiting', currentQuestion: 0 });
    }
    setJoined(true);
    setTemplateSelected(false);
    setBuilderQuestions([]);
    setScreen('builder');
  };

  const saveAndOpenLobby = async () => {
    const valid = builderQuestions.length > 0 &&
      builderQuestions.every(q => q.text.trim() && q.options.every(o => o.trim()));
    if (!valid) { setBuilderError('Заполни все вопросы и варианты ответов!'); return; }
    setBuilderError('');
    await update(ref(db, `rooms/${roomId}`), { questions: builderQuestions, timerDuration });
    setScreen('lobby');
  };

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null || localTime === 0) return;
    setSelectedAnswer(index);
    submitAnswer(currentQ);
    if (index === activeQuestions[currentQ].correctIndex) {
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

  const startGlobalGame = () => {
    update(ref(db, `rooms/${roomId}`), { status: 'playing', currentQuestion: 0 });
  };

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
    setScore(0); setSelectedAnswer(null);
  };

  // Конструктор: обновление вопроса
  const updateQuestion = (idx: number, field: keyof Question, value: any) => {
    setBuilderQuestions(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setBuilderQuestions(prev => {
      const next = [...prev];
      const options = [...next[qIdx].options];
      options[optIdx] = value;
      next[qIdx] = { ...next[qIdx], options };
      return next;
    });
  };

  const shuffleQuestions = () => {
    setBuilderQuestions(prev => [...prev].sort(() => Math.random() - 0.5));
    setActiveQIndex(0);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ЭКРАН: ГЛАВНАЯ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (screen === 'home') return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`min-h-screen ${th.page} flex flex-col items-center justify-center p-6 transition-colors duration-300`}>
      <ThemeToggle />

      <motion.h1 initial={{ y: -20 }} animate={{ y: 0 }} className="text-6xl font-black mb-12 bg-gradient-to-r from-amber-400 to-orange-600 bg-clip-text text-transparent italic">
        iseedeadp3ple
      </motion.h1>

      <div className={`${th.card} border p-8 rounded-[2.5rem] w-full max-w-md backdrop-blur-xl shadow-2xl`}>
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-bold text-amber-500 uppercase ml-2 mb-1 block">Никнейм</label>
            <input className={`w-full p-4 rounded-2xl border outline-none focus:ring-2 ring-amber-500/50 transition-all ${th.input}`} placeholder="Твой ник" value={nickname} onChange={e => setNickname(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-amber-500 uppercase ml-2 mb-1 block">Код лобби</label>
            <input className={`w-full p-4 rounded-2xl border outline-none focus:ring-2 ring-amber-500/50 transition-all ${th.input}`} placeholder="Например: gaben777" value={roomId} onChange={e => setRoomId(e.target.value.toLowerCase().trim())} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
          {avatarOptions.map(a => (
            <button key={a.id} onClick={() => setSelectedAvatar(a)} className={`text-3xl p-3 rounded-xl transition-all ${selectedAvatar.id === a.id ? 'bg-amber-500 scale-110 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : th.btnGhost}`}>
              {a.emoji}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <button disabled={!nickname || !roomId} onClick={handleJoin} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 p-5 rounded-2xl font-black text-xl text-white hover:brightness-110 disabled:opacity-30 transition-all uppercase tracking-widest shadow-lg">
            Войти в игру
          </button>
          <div className="flex items-center gap-4 my-2">
            <div className={`h-[1px] flex-1 ${th.divider}`} />
            <span className={`text-[10px] font-bold uppercase ${th.sub}`}>или</span>
            <div className={`h-[1px] flex-1 ${th.divider}`} />
          </div>
          <button disabled={!nickname || !roomId} onClick={handleCreate} className={`w-full border p-4 rounded-2xl font-bold text-sm transition-all uppercase tracking-widest ${th.btnSec}`}>
            🛠️ Создать и настроить викторину
          </button>
        </div>
      </div>
    </motion.div>
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ЭКРАН: КОНСТРУКТОР
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (screen === 'builder') {

    // ШАГ 1: Выбор шаблона
    if (!templateSelected) return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`min-h-screen ${th.page} flex flex-col items-center justify-center p-6 transition-colors duration-300`}>
        <ThemeToggle />
        <h2 className="text-4xl font-black mb-2">🛠️ Конструктор</h2>
        <p className={`${th.sub} mb-8 text-center text-sm`}>Выбери кол-во вопросов или импортируй готовые</p>

        {/* Настройка таймера */}
        <div className={`${th.card} border p-6 rounded-2xl w-full max-w-md mb-6`}>
          <p className="text-xs font-bold text-amber-500 uppercase mb-3">⏱ Время на каждый вопрос</p>
          <div className="flex gap-3">
            {[10, 15, 20, 30].map(t => (
              <button key={t} onClick={() => setTimerDuration(t)} className={`flex-1 p-3 rounded-xl font-black transition-all ${timerDuration === t ? 'bg-amber-500 text-black' : th.btnGhost}`}>
                {t}с
              </button>
            ))}
          </div>
        </div>

        {/* Выбор кол-ва вопросов */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-6">
          {[5, 10, 15].map(count => (
            <motion.button key={count} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setBuilderQuestions(Array.from({ length: count }, emptyQ)); setTemplateSelected(true); setActiveQIndex(0); }}
              className={`${th.card} border p-8 rounded-[2rem] flex flex-col items-center gap-3 transition-all hover:border-amber-500/50`}
            >
              <span className="text-4xl font-black text-amber-500">{count}</span>
              <span className={`text-sm font-bold uppercase ${th.sub}`}>вопросов</span>
            </motion.button>
          ))}
        </div>

        {/* Импорт Dota */}
        <button
          onClick={() => { setBuilderQuestions([...dotaQuestions]); setTemplateSelected(true); setActiveQIndex(0); }}
          className={`text-sm font-bold ${th.sub} hover:text-amber-500 transition-all uppercase tracking-widest`}
        >
          📋 Импортировать 10 вопросов по Dota 2
        </button>
      </motion.div>
    );

    // ШАГ 2: Редактор вопросов
    const q = builderQuestions[activeQIndex];
    const completedCount = builderQuestions.filter(bq => bq.text.trim() && bq.options.every(o => o.trim())).length;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`min-h-screen ${th.page} p-6 transition-colors duration-300`}>
        <ThemeToggle />
        <div className="max-w-2xl mx-auto">

          {/* Хедер конструктора */}
          <div className="flex items-center justify-between mb-6 mt-2">
            <button onClick={() => setTemplateSelected(false)} className={`flex items-center gap-2 ${th.sub} hover:text-amber-500 transition-all text-sm font-bold`}>
              <ArrowLeft size={16} /> Назад
            </button>
            <div className="text-center">
              <p className="text-amber-500 font-bold text-sm uppercase tracking-widest">
                Заполнено {completedCount}/{builderQuestions.length}
              </p>
              <div className={`h-1.5 w-40 ${th.divider} rounded-full mt-1 overflow-hidden`}>
                <div className="h-full bg-amber-500 transition-all duration-500 rounded-full" style={{ width: `${(completedCount / builderQuestions.length) * 100}%` }} />
              </div>
            </div>
            <button onClick={shuffleQuestions} className={`p-2 rounded-xl transition-all ${th.btnGhost}`} title="Перемешать порядок вопросов">
              <Shuffle size={16} />
            </button>
          </div>

          {/* Табы вопросов */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {builderQuestions.map((bq, idx) => {
              const done = bq.text.trim() && bq.options.every(o => o.trim());
              return (
                <button key={idx} onClick={() => setActiveQIndex(idx)}
                  className={`flex-shrink-0 w-10 h-10 rounded-xl font-black text-sm transition-all ${
                    idx === activeQIndex ? 'bg-amber-500 text-black'
                    : done ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : th.btnGhost
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Карточка редактора */}
          <div className={`${th.card} border p-8 rounded-[2rem] mb-4`}>
            <label className="text-xs font-bold text-amber-500 uppercase mb-2 block">Вопрос {activeQIndex + 1}</label>
            <textarea
              className={`w-full p-4 rounded-2xl border outline-none focus:ring-2 ring-amber-500/50 transition-all resize-none ${th.input}`}
              placeholder="Введи текст вопроса..."
              rows={3}
              value={q.text}
              onChange={e => updateQuestion(activeQIndex, 'text', e.target.value)}
            />

            <p className="text-xs font-bold text-amber-500 uppercase mt-6 mb-3">Варианты ответов</p>
            <div className="grid gap-3">
              {q.options.map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-3">
                  {/* Кружок = правильный ответ */}
                  <button
                    onClick={() => updateQuestion(activeQIndex, 'correctIndex', optIdx)}
                    className={`w-8 h-8 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      q.correctIndex === optIdx
                        ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                        : isDark ? 'border-white/20 hover:border-emerald-500/50' : 'border-gray-300 hover:border-emerald-500/50'
                    }`}
                  >
                    {q.correctIndex === optIdx && <span className="text-white text-xs">✓</span>}
                  </button>
                  <input
                    className={`flex-1 p-3 rounded-xl border outline-none focus:ring-2 ring-amber-500/50 transition-all ${th.input} ${q.correctIndex === optIdx ? 'border-emerald-500/50' : ''}`}
                    placeholder={`Вариант ${optIdx + 1}`}
                    value={opt}
                    onChange={e => updateOption(activeQIndex, optIdx, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <p className={`text-xs ${th.sub} mt-3`}>Нажми кружок чтобы отметить правильный ответ</p>
          </div>

          {/* Ошибка валидации */}
          {builderError && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm font-bold text-center mb-4">
              ⚠️ {builderError}
            </motion.p>
          )}

          {/* Навигация */}
          <div className="flex gap-3 mb-4">
            <button disabled={activeQIndex === 0} onClick={() => setActiveQIndex(prev => prev - 1)}
              className={`flex-1 p-4 rounded-2xl font-bold transition-all disabled:opacity-30 ${th.btnGhost}`}
            >
              ← Назад
            </button>
            {activeQIndex < builderQuestions.length - 1 ? (
              <button onClick={() => setActiveQIndex(prev => prev + 1)} className="flex-1 p-4 rounded-2xl font-bold bg-amber-500 text-black hover:brightness-110 transition-all">
                Далее →
              </button>
            ) : (
              <button onClick={saveAndOpenLobby} className="flex-1 p-4 rounded-2xl font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:brightness-110 transition-all flex items-center justify-center gap-2">
                <Save size={18} /> Сохранить
              </button>
            )}
          </div>

          {/* Кнопка "Сохранить" всегда видна */}
          <button onClick={saveAndOpenLobby} className="w-full p-4 rounded-2xl font-bold border text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2">
            <Save size={16} /> Сохранить и открыть лобби
          </button>
        </div>
      </motion.div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ЭКРАН: ЛОББИ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (screen === 'lobby') {
    if (!roomData) return (
      <div className={`min-h-screen ${th.page} flex items-center justify-center transition-colors`}>
        <p className={`${th.sub} animate-pulse uppercase tracking-widest text-sm`}>Подключение к лобби...</p>
      </div>
    );

    return (
      <div className={`min-h-screen ${th.page} flex flex-col items-center justify-center p-6 transition-colors duration-300`}>
        <ThemeToggle />
        <div className="mb-8 text-center">
          <button onClick={copyRoomId} className={`flex items-center gap-2 mx-auto mb-3 px-4 py-2 ${th.card} border rounded-xl text-sm font-mono hover:border-amber-500/40 transition-all group`}>
            <span className="text-amber-500 tracking-tight">{roomId}</span>
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className={`${th.sub} group-hover:text-amber-500 transition-all`} />}
            <span className={`${th.sub} text-xs`}>{copied ? 'скопировано!' : 'скопировать'}</span>
          </button>
          <h1 className="text-4xl font-black flex items-center gap-3"><Users className="text-amber-500" /> КТО В СЕТИ?</h1>
          <p className={`${th.sub} text-sm mt-2`}>Хост: <span className="text-amber-400">👑 {roomData?.host || '...'}</span></p>
          {roomData?.questions && (
            <p className={`${th.sub} text-xs mt-1`}>Викторина: {roomData.questions.length} вопросов · {roomData.timerDuration || DEFAULT_TIMER}с на вопрос</p>
          )}
        </div>

        <div className="grid gap-3 w-full max-w-md mb-10">
          <AnimatePresence>
            {players.map((p: any) => (
              <motion.div key={p.nickname} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
                className={`${th.card} border p-5 rounded-2xl flex items-center justify-between backdrop-blur-md`}
              >
                <div className="flex items-center gap-4">
                  <span className={`text-4xl ${isDark ? 'bg-slate-900' : 'bg-gray-100'} p-2 rounded-xl`}>{p.avatar}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold">{p.nickname}</span>
                      {roomData?.host === p.nickname && <span className="text-amber-400 text-lg">👑</span>}
                    </div>
                    {p.nickname === nickname && <span className={`${th.sub} text-xs`}>это ты</span>}
                  </div>
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest">Ready</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {isHost ? (
          <button onClick={startGlobalGame} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-5 px-16 rounded-2xl font-black text-xl hover:brightness-110 transition-all flex items-center gap-3 shadow-lg">
            <Play fill="white" /> ПОГНАЛИ!
          </button>
        ) : (
          <p className={`${th.sub} text-sm animate-pulse uppercase tracking-widest`}>Ждём хоста...</p>
        )}
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ЭКРАН: ВОПРОС
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (screen === 'quiz') {
    const q = activeQuestions[currentQ];
    if (!q) return null;

    const timerColor = localTime > 10 ? 'text-emerald-400' : localTime > 5 ? 'text-amber-400' : 'text-red-400';
    const timerBorder = localTime > 10 ? 'border-emerald-500/30' : localTime > 5 ? 'border-amber-500/30' : 'border-red-500/50';
    const timerPct = (localTime / roomTimerDuration) * 100;

    return (
      <div className={`min-h-screen ${th.page} flex flex-col items-center justify-center p-4 transition-colors duration-300`}>
        <ThemeToggle />
        <div className="w-full max-w-2xl">

          {/* Хедер: прогресс + таймер + счёт */}
          <div className="flex justify-between items-center mb-8 px-2">
            <div>
              <p className="text-amber-500 font-bold text-sm uppercase tracking-widest mb-1">
                Вопрос {currentQ + 1} / {activeQuestions.length}
              </p>
              <div className={`h-1.5 w-48 ${isDark ? 'bg-white/10' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                <motion.div animate={{ width: `${((currentQ + 1) / activeQuestions.length) * 100}%` }} className="h-full bg-amber-500" />
              </div>
            </div>

            {/* Таймер с круговым прогрессом */}
            <div className="relative flex items-center justify-center">
              <svg className="absolute" width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth="4"/>
                <circle cx="32" cy="32" r="28" fill="none"
                  stroke={localTime > 10 ? '#10b981' : localTime > 5 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - timerPct / 100)}`}
                  transform="rotate(-90 32 32)"
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
                />
              </svg>
              <motion.div
                className={`w-16 h-16 rounded-2xl border-2 ${timerBorder} ${isDark ? 'bg-slate-800/60' : 'bg-white'} flex items-center justify-center`}
                animate={{ scale: localTime <= 5 && localTime > 0 ? [1, 1.1, 1] : 1 }}
                transition={{ repeat: localTime <= 5 ? Infinity : 0, duration: 0.5 }}
              >
                <span className={`text-2xl font-black ${timerColor}`}>{localTime}</span>
              </motion.div>
            </div>

            <div className="text-right">
              <p className={`${th.sub} text-xs uppercase font-bold`}>Счёт</p>
              <p className="text-3xl font-black text-amber-500 tracking-tighter">{score}</p>
            </div>
          </div>

          {/* Вопрос */}
          <AnimatePresence mode="wait">
            <motion.div key={currentQ} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              className={`${th.questionCard} border p-10 rounded-[2.5rem] mb-8 shadow-2xl backdrop-blur-xl relative overflow-hidden`}
            >
              <div className="absolute top-0 left-0 w-1 bg-amber-500 h-full rounded-l-full" />
              <h2 className="text-3xl font-bold leading-tight">{q.text}</h2>
            </motion.div>
          </AnimatePresence>

          {/* Варианты ответов */}
          <div className="grid gap-4">
            {q.options.map((opt, i) => {
              const isSelected = selectedAnswer === i;
              const isCorrect = i === q.correctIndex;
              const showResult = selectedAnswer !== null || localTime === 0;
              let style = th.answerIdle;
              if (showResult) {
                if (isCorrect) style = 'bg-emerald-500/20 border-emerald-500 text-emerald-400';
                else if (isSelected) style = 'bg-red-500/20 border-red-500 text-red-400';
                else style = isDark ? 'bg-slate-800/20 border-white/5 opacity-50' : 'bg-gray-50 border-gray-100 opacity-50';
              }
              return (
                <motion.button whileHover={!showResult ? { scale: 1.02 } : {}} whileTap={!showResult ? { scale: 0.98 } : {}}
                  key={i} onClick={() => handleAnswer(i)} disabled={showResult}
                  className={`p-6 rounded-2xl border-2 text-left font-bold text-lg transition-all ${style}`}
                >
                  <span className={`mr-3 text-sm font-black ${th.sub}`}>{['A','B','C','D'][i]}.</span>
                  {opt}
                </motion.button>
              );
            })}
          </div>

          {/* Статус ответов */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center">
            {selectedAnswer !== null || localTime === 0 ? (
              allAnswered ? (
                <p className="text-emerald-400 text-sm font-bold animate-pulse uppercase tracking-widest">✓ Все ответили! Переходим...</p>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <p className={`${th.sub} text-sm uppercase tracking-widest`}>Ждём остальных... {answeredCount}/{playerCount}</p>
                  <div className="flex gap-1">
                    {Array.from({ length: playerCount }).map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < answeredCount ? 'bg-emerald-400' : isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </div>
              )
            ) : (
              <p className={`${th.sub} text-xs uppercase tracking-widest`}>Выбери ответ</p>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ЭКРАН: РЕЗУЛЬТАТЫ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (screen === 'results') {
    const sorted = [...players].sort((a: any, b: any) => b.score - a.score);
    const isWinner = sorted[0]?.nickname === nickname;

    return (
      <div className={`min-h-screen ${th.page} flex flex-col items-center justify-center p-6 transition-colors duration-300`}>
        <ThemeToggle />

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
            <motion.div key={p.nickname}
              initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }}
              className={`p-6 rounded-[2rem] flex items-center justify-between border-2 ${
                idx === 0 ? 'bg-gradient-to-r from-amber-500/20 to-transparent border-amber-500 shadow-lg shadow-amber-900/20'
                : idx === 1 ? `${isDark ? 'bg-gradient-to-r from-slate-400/10 to-transparent' : 'bg-gray-50'} border-slate-400/40`
                : idx === 2 ? `${isDark ? 'bg-gradient-to-r from-orange-900/20 to-transparent' : 'bg-orange-50'} border-orange-800/40`
                : `${isDark ? 'bg-slate-800/30' : 'bg-gray-50'} border-gray-200`
              }`}
            >
              <div className="flex items-center gap-5">
                <span className="text-3xl">{MEDALS[idx] || `#${idx + 1}`}</span>
                <span className="text-4xl">{p.avatar}</span>
                <div>
                  <span className="text-xl font-black uppercase tracking-tight">{p.nickname}</span>
                  {p.nickname === nickname && <p className={`${th.sub} text-xs`}>это ты</p>}
                </div>
              </div>
              <div className={`text-2xl font-black ${idx === 0 ? 'text-amber-400' : th.sub}`}>{p.score}</div>
            </motion.div>
          ))}
        </div>

        {isHost ? (
          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            onClick={playAgain}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-5 px-14 rounded-2xl font-black text-xl hover:brightness-110 transition-all shadow-lg uppercase tracking-widest"
          >
            🔄 Играть ещё!
          </motion.button>
        ) : (
          <p className={`${th.sub} text-sm animate-pulse uppercase tracking-widest`}>Ждём решения хоста...</p>
        )}

        <button onClick={() => window.location.reload()} className={`mt-6 ${th.sub} uppercase text-xs font-black tracking-[0.3em] hover:text-amber-500 transition-all`}>
          выйти в меню
        </button>
      </div>
    );
  }

  return null;
}
