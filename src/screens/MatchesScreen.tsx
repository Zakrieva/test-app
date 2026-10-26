import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MATCHES_URL } from "../config";
import { FavoriteButton } from "../components/FavoriteButton";
import { UpdatedAgo } from "../components/UpdatedAgo";
import { useFavorites } from "../hooks/useFavorites";

type Team = { id: string; name: string; city: string };
type Match = {
  id: string;
  startsAt: string | null;
  status: string;
  minute?: number;
  home: Team;
  away: Team;
  score: { home: number; away: number } | null;
};
type MatchesResponse = { round: number; matches: Match[] };
type Filter = "all" | "upcoming" | "finished";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "upcoming", label: "Предстоящие" },
  { key: "finished", label: "Завершённые" },
];

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Запланирован",
  live: "Идёт",
  finished: "Завершён",
  postponed: "Перенесён",
};

function formatStart(iso: string | null): string {
  if (!iso) return "Дата уточняется";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Дата уточняется";
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MatchesScreen() {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [round, setRound] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const { isFavorite, toggle } = useFavorites();

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await fetch(MATCHES_URL);
      if (!response.ok) throw new Error(`Сервер вернул ${response.status}`);
      const data: MatchesResponse = await response.json();
      if (!Array.isArray(data.matches))
        throw new Error("Неверный формат данных");
      setMatches(data.matches);
      setRound(data.round);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить матчи");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const visible = useMemo(() => {
    if (!matches) return [];
    if (filter === "finished")
      return matches.filter((m) => m.status === "finished");
    if (filter === "upcoming")
      return matches.filter((m) => m.status !== "finished");
    return matches;
  }, [matches, filter]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && !matches) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Не удалось загрузить матчи</Text>
        <Text style={styles.hint}>{error}</Text>
        <Pressable style={styles.button} onPress={() => load(false)}>
          <Text style={styles.buttonText}>Повторить</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>
        Матчи тура{round !== null ? ` ${round}` : ""}
      </Text>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.chip, filter === f.key && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                filter === f.key && styles.chipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.updateRow}>
        {updatedAt && <UpdatedAgo since={updatedAt} />}
        <Pressable onPress={() => load(true)} disabled={refreshing}>
          <Text style={styles.link}>
            {refreshing ? "Обновляем…" : "Обновить"}
          </Text>
        </Pressable>
      </View>

      {error && (
        <Text style={styles.errorBanner}>Не удалось обновить: {error}</Text>
      )}

      <FlatList
        data={visible}
        keyExtractor={(m) => m.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
          />
        }
        contentContainerStyle={
          visible.length === 0 ? styles.emptyContainer : undefined
        }
        ListEmptyComponent={<Text style={styles.message}>Матчей нет</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardMain}>
              <Text style={styles.teams}>
                {item.home.name} — {item.away.name}
              </Text>
              <Text style={styles.score}>
                {item.score ? `${item.score.home} : ${item.score.away}` : "—"}
              </Text>
              <Text style={styles.meta}>{formatStart(item.startsAt)}</Text>
              <Text style={styles.meta}>
                {STATUS_LABELS[item.status] ?? item.status}
                {item.status === "live" && item.minute != null
                  ? `, ${item.minute}'`
                  : ""}
              </Text>
            </View>
            <FavoriteButton
              active={isFavorite(item.id)}
              onPress={() => toggle(item.id)}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  filters: { flexDirection: "row", gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
  },
  chipActive: { backgroundColor: "#ef3124" },
  chipText: { color: "#374151" },
  chipTextActive: { color: "#fff" },
  updateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  link: { color: "#2563eb", fontSize: 13 },
  errorBanner: { color: "#b91c1c", marginBottom: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardMain: { flex: 1 },
  teams: { fontSize: 16, fontWeight: "600" },
  score: { fontSize: 20, fontWeight: "700", marginVertical: 2 },
  meta: { fontSize: 13, color: "#6b7280" },
  message: { fontSize: 16, textAlign: "center" },
  hint: { color: "#6b7280", marginVertical: 8, textAlign: "center" },
  emptyContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#ef3124",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
