import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, set, update, remove, onDisconnect } from 'firebase/database';

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

    const unsubscribe = onValue(roomRef, (snapshot) => {
      setRoomData(snapshot.val());
    });

    set(playerRef, { nickname, avatar, score: 0 });
    onDisconnect(playerRef).remove();

    return () => {
      unsubscribe();
      remove(playerRef);
    };
  }, [roomId, nickname, joined]);

  const updateScore = (newScore: number) => {
    update(ref(db, `rooms/${roomId}/players/${nickname}`), { score: newScore });
  };

  // Записываем что игрок "ответил" (true = ответил или таймаут)
  // Это нужно для авто-перехода когда ВСЕ ответили
  const submitAnswer = (questionIndex: number) => {
    if (!roomId || !nickname) return;
    set(ref(db, `rooms/${roomId}/answers/${questionIndex}/${nickname}`), true);
  };

  return { roomData, updateScore, submitAnswer };
}
