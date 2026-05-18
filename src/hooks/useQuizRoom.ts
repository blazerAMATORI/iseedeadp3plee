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

    // Если комната пустая (нет хоста или нет других игроков) — становимся хостом
    get(roomRef).then((snapshot) => {
      const data = snapshot.val();
      const players = data?.players ? Object.keys(data.players) : [];
      const hasNoHost = !data?.host;
      const isAloneInRoom = players.length === 0; // проверяем ДО того как сами зашли

      if (hasNoHost || isAloneInRoom) {
        update(roomRef, { host: nickname });
      }
    });

    return () => {
      unsubscribe();
      // При уходе: удаляем себя и если мы были хостом — передаём хостинг
      remove(playerRef).then(() => {
        get(roomRef).then((snapshot) => {
          const data = snapshot.val();
          if (!data) return;

          // Если мы были хостом — передаём роль следующему игроку
          if (data.host === nickname) {
            const remaining = data.players
              ? Object.values(data.players).filter((p: any) => p.nickname && p.nickname !== nickname)
              : [];

            if (remaining.length > 0) {
              // Передаём хостинг первому оставшемуся
              update(roomRef, { host: (remaining[0] as any).nickname });
            } else {
              // Все ушли — очищаем хоста
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
