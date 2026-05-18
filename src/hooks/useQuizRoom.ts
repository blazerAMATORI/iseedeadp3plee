import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, set, update, remove, onDisconnect, get } from 'firebase/database';

export function useQuizRoom(
  roomId: string,
  nickname: string,
  avatar: string,
  joined: boolean
) {
  const [roomData, setRoomData] = useState<any>(null);

  useEffect(() => {
    if (!roomId || !nickname || !joined) return;

    const roomRef = ref(db, `rooms/${roomId}`);
    const playerRef = ref(db, `rooms/${roomId}/players/${nickname}`);

    // Слушаем комнату
    const unsubscribe = onValue(roomRef, (snapshot) => {
      setRoomData(snapshot.val());
    });

    // Регистрируем себя
    set(playerRef, { nickname, avatar, score: 0 });
    onDisconnect(playerRef).remove();

    // Проверяем нужно ли стать хостом
    get(roomRef).then((snapshot) => {
      const data = snapshot.val();
      const players = data?.players ? Object.keys(data.players) : [];
      const hasNoHost = !data?.host;
      const isAloneInRoom = players.length === 0;

      if (hasNoHost || isAloneInRoom) {
        // FIX: сбрасываем статус комнаты чтобы не влетать сразу в игру
        // Вопросы (questions) НЕ трогаем — они остаются с прошлой сессии
        update(roomRef, {
          host: nickname,
          status: 'waiting',
          currentQuestion: 0,
          answers: null,
        });
      }
    });

    return () => {
      unsubscribe();
      remove(playerRef).then(() => {
        get(roomRef).then((snapshot) => {
          const data = snapshot.val();
          if (!data) return;

          if (data.host === nickname) {
            const remaining = data.players
              ? Object.values(data.players).filter((p: any) => p.nickname && p.nickname !== nickname)
              : [];

            if (remaining.length > 0) {
              update(roomRef, { host: (remaining[0] as any).nickname });
            } else {
              update(roomRef, { host: null });
            }
          }
        });
      });
    };
  }, [roomId, nickname, joined]);

  const updateScore = (newScore: number) => {
    update(ref(db, `rooms/${roomId}/players/${nickname}`), { score: newScore });
  };

  const submitAnswer = (questionIndex: number) => {
    if (!roomId || !nickname) return;
    set(ref(db, `rooms/${roomId}/answers/${questionIndex}/${nickname}`), true);
  };

  return { roomData, updateScore, submitAnswer };
}
