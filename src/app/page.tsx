'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuizRoom } from '@/hooks/useQuizRoom';
import { avatarOptions, dotaQuestions } from '@/data/questions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Crown, Users, Play, ArrowRight, Trophy, Clock, Zap, Star, Home, Copy, Check, X } from 'lucide-react';

type Screen = 'home' | 'nickname' | 'room' | 'quiz' | 'results';
type Role = 'host' | 'player' | null;

export default function QuizPage() {
  const [screen, setScreen] = useState<Screen>('home');
  const [role, setRole] = useState<Role>(null);
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(avatarOptions[0]);
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [resultPoints, setResultPoints] = useState(0);

  const {
    room,
    currentQuestion,
    playerId,
    error,
    timeLeft,
    totalTime,
    createRoom,
    joinRoom,
    startGame,
    submitAnswer,
    nextQuestion,
    leaveRoom,
    getLeaderboard,
    totalQuestions
  } = useQuizRoom();

  // Show error toasts
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Handle room status changes
  useEffect(() => {
    if (room?.status === 'playing' && screen === 'room') {
      setScreen('quiz');
      setShowResult(false);
      setSelectedAnswer(null);
    }
    if (room?.status === 'finished') {
      setScreen('results');
    }
  }, [room?.status, screen]);

  // Handle answer submission
  const handleSubmitAnswer = async (answerIndex: number) => {
    if (selectedAnswer !== null || !room) return;

    setSelectedAnswer(answerIndex);
    const question = dotaQuestions[room.currentQuestion];
    const isCorrect = answerIndex === question.correctIndex;
    const timeTaken = Date.now() - room.questionStartTime;
    const timeBonus = Math.max(0, Math.floor((totalTime - timeTaken) / 1000) * 10);
    const points = isCorrect ? 100 + timeBonus : 0;

    setResultPoints(points);
    setShowResult(true);

    if (isCorrect) {
      toast.success(`+${points} очков!`, { icon: '🎉' });
    } else {
      toast.error('Неправильно!');
    }

    await submitAnswer(answerIndex);
  };

  // Start creating room
  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      toast.error('Введите никнейм');
      return;
    }
    const code = await createRoom(nickname, selectedAvatar.emoji);
    if (code) {
      setScreen('room');
      toast.success('Комната создана!');
    }
  };

  // Join room
  const handleJoinRoom = async () => {
    if (!nickname.trim()) {
      toast.error('Введите никнейм');
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 6) {
      toast.error('Введите 6-значный код комнаты');
      return;
    }
    const success = await joinRoom(roomCode.toUpperCase(), nickname, selectedAvatar.emoji);
    if (success) {
      setScreen('room');
      toast.success('Вы подключились к комнате!');
    }
  };

  // Copy room code
  const copyRoomCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      setCopied(true);
      toast.success('Код скопирован!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Return to home
  const handleReturnHome = async () => {
    await leaveRoom();
    setScreen('home');
    setRole(null);
    setNickname('');
    setRoomCode('');
    setSelectedAvatar(avatarOptions[0]);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const isHost = room?.hostId === playerId;
  const currentPlayer = room?.players[playerId];
  const leaderboard = getLeaderboard();

  // Render home screen
  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg text-center">
          {/* Logo */}
          <div className="mb-8 animate-in fade-in zoom-in duration-500">
            <div className="text-7xl mb-4">🎮</div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
              Dota 2 Quiz
            </h1>
            <p className="text-purple-300 text-lg">Проверь свои знания Доты!</p>
          </div>

          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <button
              onClick={() => { setRole('host'); setScreen('nickname'); }}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 p-6 transition-all duration-300 hover:scale-105 hover:border-amber-400"
            >
              <Crown className="w-12 h-12 mx-auto mb-3 text-amber-400 group-hover:animate-bounce" />
              <h3 className="text-xl font-bold text-white mb-1">Хост</h3>
              <p className="text-sm text-purple-300">Создать комнату</p>
            </button>

            <button
              onClick={() => { setRole('player'); setScreen('nickname'); }}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 p-6 transition-all duration-300 hover:scale-105 hover:border-emerald-400"
            >
              <Users className="w-12 h-12 mx-auto mb-3 text-emerald-400 group-hover:animate-bounce" />
              <h3 className="text-xl font-bold text-white mb-1">Игрок</h3>
              <p className="text-sm text-purple-300">Присоединиться</p>
            </button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-2xl mb-1">🎯</div>
              <div className="text-xs text-purple-300">10 вопросов</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-2xl mb-1">⚡</div>
              <div className="text-xs text-purple-300">15 сек на ответ</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-xs text-purple-300">Очки за скорость</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Nickname & Avatar Selection
  if (screen === 'nickname') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <button
            onClick={() => setScreen('home')}
            className="mb-6 text-purple-300 hover:text-white flex items-center gap-2 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Назад
          </button>

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              {role === 'host' ? 'Создание комнаты' : 'Подключение к игре'}
            </h2>

            {/* Avatar Selection */}
            <div className="mb-6">
              <label className="block text-sm text-purple-300 mb-3">Выбери аватар</label>
              <div className="grid grid-cols-8 gap-2">
                {avatarOptions.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`aspect-square rounded-xl text-2xl transition-all duration-200 ${
                      selectedAvatar.id === avatar.id
                        ? 'bg-amber-500/30 ring-2 ring-amber-400 scale-110'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {avatar.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Nickname Input */}
            <div className="mb-6">
              <label className="block text-sm text-purple-300 mb-2">Твой никнейм</label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 16))}
                placeholder="Введи имя..."
                className="bg-white/10 border-white/20 text-white placeholder:text-purple-300/50 text-lg py-6 text-center uppercase tracking-wider"
              />
            </div>

            {/* Room Code Input (for players) */}
            {role === 'player' && (
              <div className="mb-6">
                <label className="block text-sm text-purple-300 mb-2">Код комнаты</label>
                <Input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="______"
                  className="bg-white/10 border-white/20 text-white placeholder:text-purple-300/30 text-2xl py-6 text-center uppercase tracking-[0.3em] font-mono"
                  maxLength={6}
                />
              </div>
            )}

            <Button
              onClick={role === 'host' ? handleCreateRoom : handleJoinRoom}
              className="w-full py-6 text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/30"
            >
              {role === 'host' ? (
                <>Создать комнату</>
              ) : (
                <>Присоединиться</>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Room Waiting Screen
  if (screen === 'room') {
    const players = room ? Object.values(room.players) : [];

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Room Code Card */}
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-3xl p-6 border border-amber-500/30 text-center mb-6">
            <p className="text-purple-300 text-sm mb-2">Код комнаты</p>
            <div className="flex items-center justify-center gap-3">
              <h2 className="text-4xl font-bold font-mono tracking-[0.3em] text-white">
                {room?.code}
              </h2>
              <button
                onClick={copyRoomCode}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Copy className="w-5 h-5 text-purple-300" />
                )}
              </button>
            </div>
          </div>

          {/* Players List */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-300" />
              Игроки ({players.length})
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 bg-white/5 rounded-xl p-3 animate-in fade-in slide-in-from-left duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="text-2xl">{player.avatar}</span>
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {player.nickname}
                      {player.isHost && (
                        <Crown className="inline-block w-4 h-4 text-amber-400 ml-2" />
                      )}
                      {player.id === playerId && (
                        <span className="text-purple-300 text-sm ml-2">(ты)</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {isHost ? (
            <div className="space-y-3">
              <Button
                onClick={startGame}
                disabled={players.length < 1}
                className="w-full py-6 text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/30 disabled:opacity-50"
              >
                <Play className="w-5 h-5 mr-2" />
                Начать игру
              </Button>
              <p className="text-center text-purple-300 text-sm">
                Подожди, пока присоединятся другие игроки
              </p>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 text-center">
              <div className="animate-pulse">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-white font-medium">Ожидание начала игры...</p>
                <p className="text-purple-300 text-sm mt-1">Хост скоро начнёт</p>
              </div>
            </div>
          )}

          <button
            onClick={handleReturnHome}
            className="w-full mt-4 py-3 text-purple-300 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Покинуть комнату
          </button>
        </div>
      </div>
    );
  }

  // Quiz Screen
  if (screen === 'quiz' && currentQuestion && room) {
    const questionNumber = room.currentQuestion + 1;
    const timerPercentage = (timeLeft / totalTime) * 100;
    const isTimerLow = timeLeft < 5000;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
        {/* Header */}
        <div className="w-full max-w-2xl mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentPlayer?.avatar}</span>
              <span className="text-white font-medium">{currentPlayer?.nickname}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/10 rounded-full px-4 py-2 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-white font-bold">{currentPlayer?.score || 0}</span>
              </div>
              <div className="bg-white/10 rounded-full px-4 py-2 text-white">
                {questionNumber}/{totalQuestions}
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="relative">
            <Progress
              value={timerPercentage}
              className="h-3 rounded-full bg-white/10 [&>*]:transition-all"
            />
            <div className={`absolute right-0 top-4 flex items-center gap-1 text-sm font-mono ${
              isTimerLow ? 'text-red-400 animate-pulse' : 'text-purple-300'
            }`}>
              <Clock className="w-4 h-4" />
              {(timeLeft / 1000).toFixed(1)}с
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="w-full max-w-2xl mb-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
            <p className="text-2xl md:text-3xl font-bold text-white text-center leading-relaxed">
              {currentQuestion.text}
            </p>
          </div>
        </div>

        {/* Answer Options */}
        <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === currentQuestion.correctIndex;
            const showCorrect = showResult && isCorrect;
            const showWrong = showResult && isSelected && !isCorrect;

            return (
              <button
                key={index}
                onClick={() => !showResult && handleSubmitAnswer(index)}
                disabled={showResult}
                className={`
                  relative p-5 rounded-2xl text-left transition-all duration-300 transform
                  ${showResult
                    ? isCorrect
                      ? 'bg-emerald-500/30 border-2 border-emerald-400 scale-105 shadow-lg shadow-emerald-500/30'
                      : isSelected
                        ? 'bg-red-500/30 border-2 border-red-400 animate-shake'
                        : 'bg-white/5 border border-white/10 opacity-50'
                    : isSelected
                      ? 'bg-amber-500/20 border-2 border-amber-400 scale-105'
                      : 'bg-white/10 border border-white/20 hover:bg-white/15 hover:scale-[1.02] hover:border-white/30'
                  }
                  ${!showResult && !isSelected ? 'hover:scale-[1.02]' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className={`
                    w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg
                    ${showResult && isCorrect
                      ? 'bg-emerald-500 text-white'
                      : showResult && showWrong
                        ? 'bg-red-500 text-white'
                        : isSelected
                          ? 'bg-amber-500 text-white'
                          : 'bg-white/10 text-purple-300'
                    }
                  `}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-white font-medium text-lg">{option}</span>
                  {showCorrect && <Zap className="w-6 h-6 text-emerald-400 ml-auto" />}
                  {showWrong && <X className="w-6 h-6 text-red-400 ml-auto" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Result Feedback */}
        {showResult && (
          <div className={`
            mt-6 p-6 rounded-2xl animate-in fade-in zoom-in duration-300
            ${resultPoints > 0
              ? 'bg-emerald-500/20 border border-emerald-500/30'
              : 'bg-red-500/20 border border-red-500/30'
            }
          `}>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{resultPoints > 0 ? '🎉' : '😢'}</span>
              <div>
                <p className={`text-xl font-bold ${resultPoints > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {resultPoints > 0 ? `+${resultPoints} очков!` : 'Неправильно!'}
                </p>
                <p className="text-purple-300 text-sm">
                  {resultPoints > 0 ? `Бонус за скорость: +${Math.max(0, resultPoints - 100)}` : `Правильный ответ: ${currentQuestion.options[currentQuestion.correctIndex]}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Host Controls */}
        {isHost && showResult && (
          <Button
            onClick={nextQuestion}
            className="mt-6 py-6 px-8 text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/30"
          >
            {questionNumber < totalQuestions ? 'Следующий вопрос' : 'Показать результаты'}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        )}

        {/* Leaderboard (visible to all after answering) */}
        {showResult && (
          <div className="w-full max-w-2xl mt-6 bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Таблица лидеров
            </h3>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((player, index) => (
                <div
                  key={player.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl
                    ${player.id === playerId ? 'bg-amber-500/20' : 'bg-white/5'}
                  `}
                >
                  <span className={`
                    w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                    ${index === 0 ? 'bg-amber-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-amber-700 text-white' :
                      'bg-white/10 text-purple-300'}
                  `}>
                    {index + 1}
                  </span>
                  <span className="text-2xl">{player.avatar}</span>
                  <span className="flex-1 text-white font-medium">{player.nickname}</span>
                  <span className="text-amber-400 font-bold">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Results Screen
  if (screen === 'results') {
    const topPlayers = leaderboard.slice(0, 3);
    const currentPlayerRank = leaderboard.findIndex(p => p.id === playerId) + 1;
    const myScore = currentPlayer?.score || 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg text-center">
          {/* Trophy Animation */}
          <div className="mb-8 animate-in zoom-in duration-500">
            <Trophy className="w-24 h-24 mx-auto text-amber-400 animate-bounce" />
            <h1 className="text-4xl font-bold text-white mt-4">Игра окончена!</h1>
          </div>

          {/* Podium */}
          {topPlayers.length > 0 && (
            <div className="flex items-end justify-center gap-4 mb-8">
              {/* Second Place */}
              {topPlayers[1] && (
                <div className="animate-in slide-in-from-left duration-500 delay-200">
                  <div className="text-5xl mb-2">{topPlayers[1].avatar}</div>
                  <div className="bg-gray-500/30 rounded-t-2xl p-4 w-28">
                    <p className="text-white font-bold truncate">{topPlayers[1].nickname}</p>
                    <p className="text-purple-300 text-sm">{topPlayers[1].score}</p>
                  </div>
                  <div className="w-28 h-16 bg-gray-500/30 rounded-b-2xl flex items-center justify-center">
                    <span className="text-3xl">🥈</span>
                  </div>
                </div>
              )}

              {/* First Place */}
              {topPlayers[0] && (
                <div className="animate-in zoom-in duration-500 delay-100">
                  <div className="text-6xl mb-2 animate-pulse">{topPlayers[0].avatar}</div>
                  <div className="bg-amber-500/30 rounded-t-2xl p-4 w-32">
                    <Crown className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                    <p className="text-white font-bold truncate">{topPlayers[0].nickname}</p>
                    <p className="text-amber-400 font-bold">{topPlayers[0].score}</p>
                  </div>
                  <div className="w-32 h-24 bg-amber-500/30 rounded-b-2xl flex items-center justify-center">
                    <span className="text-4xl animate-bounce">🏆</span>
                  </div>
                </div>
              )}

              {/* Third Place */}
              {topPlayers[2] && (
                <div className="animate-in slide-in-from-right duration-500 delay-300">
                  <div className="text-5xl mb-2">{topPlayers[2].avatar}</div>
                  <div className="bg-amber-800/30 rounded-t-2xl p-4 w-28">
                    <p className="text-white font-bold truncate">{topPlayers[2].nickname}</p>
                    <p className="text-purple-300 text-sm">{topPlayers[2].score}</p>
                  </div>
                  <div className="w-28 h-10 bg-amber-800/30 rounded-b-2xl flex items-center justify-center">
                    <span className="text-2xl">🥉</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Your Result */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-6 animate-in fade-in slide-in-from-bottom duration-500 delay-500">
            <p className="text-purple-300 mb-2">Твой результат</p>
            <div className="flex items-center justify-center gap-4">
              <span className="text-4xl font-bold text-white">#{currentPlayerRank}</span>
              <span className="text-4xl">{currentPlayer?.avatar}</span>
              <span className="text-3xl font-bold text-amber-400">{myScore}</span>
            </div>
          </div>

          {/* Full Leaderboard */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 mb-6">
            <h3 className="text-white font-bold mb-4">Полная таблица</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {leaderboard.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    player.id === playerId ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-white/5'
                  }`}
                >
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm bg-white/10 text-purple-300">
                    {index + 1}
                  </span>
                  <span className="text-2xl">{player.avatar}</span>
                  <span className="flex-1 text-white text-left">{player.nickname}</span>
                  <span className="text-amber-400 font-bold">{player.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleReturnHome}
              className="w-full py-6 text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/30"
            >
              <Home className="w-5 h-5 mr-2" />
              На главную
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
