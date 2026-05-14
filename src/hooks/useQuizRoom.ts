import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, set, update } from 'firebase/database';

export function useQuizRoom(roomId: string, nickname: string, avatar: string) {
  const [roomData, setRoomData] = useState<any>(null);

  useEffect(() => {
    if (!roomId) return;
    const roomRef = ref(db, `rooms/${roomId}`);

    // Слушаем изменения в комнате
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      setRoomData(data);
    });

    // Добавляем себя в комнату
    const playerRef = ref(db, `rooms/${roomId}/players/${nickname}`);
    set(playerRef, { nickname, avatar, score: 0, status: 'idle' });

    return () => unsubscribe();
  }, [roomId, nickname]);

  const updateScore = (newScore: number) => {
    update(ref(db, `rooms/${roomId}/players/${nickname}`), { score: newScore });
  };

  return { roomData, updateScore };
}
