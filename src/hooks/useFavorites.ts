import { useState } from "react";

// Избранные матчи (по id). Хранятся только в памяти, пока открыто приложение.

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  const isFavorite = (id: string) => favorites.includes(id);

  const toggle = (id: string) =>
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return { favorites, isFavorite, toggle };
}
