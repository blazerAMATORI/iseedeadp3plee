import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, set, update, remove, onDisconnect } from 'firebase/database';

// FIX: добавлен параметр `joined` — регистрация происходит ТОЛЬКО после нажатия кнопки,
// а не во время набора ника/кода комнаты
export function useQuizRoom(
  roomId: string,
  nickname: string,
  avatar: string,
  joined: boolean  // <-- НОВЫЙ ПАРАМЕТР
) {
  const [roomData, setRoomData] = useState<any>(null);

  useEffect(() => {
    // FIX: не лезем в Firebase, пока пользователь не нажал кнопку входа
    if (!roomId || !nickname || !joined) return;

    const roomRef = ref(db, `rooms/${roomId}`);
    const playerRef = ref(db, `rooms/${roomId}/players/${nickname}`);

    // Слушаем изменения в комнате
    const unsubscribe = onValue(roomRef, (snapshot) => {
      setRoomData(snapshot.val());
    });

    // Регистрируем себя в комнате
    set(playerRef, { nickname, avatar, score: 0 });

    // FIX: автоматически удаляем игрока если он закрыл вкладку/потерял соединение
    onDisconnect(playerRef).remove();

    return () => {
      unsubscribe();
      // FIX: удаляем игрока при размонтировании компонента (например, reload)
      remove(playerRef);
    };
  }, [roomId, nickname, joined]); // avatar намеренно не в зависимостях — не хотим ресет при смене

  const updateScore = (newScore: number) => {
    update(ref(db, `rooms/${roomId}/players/${nickname}`), { score: newScore });
  };

  return { roomData, updateScore };
}
