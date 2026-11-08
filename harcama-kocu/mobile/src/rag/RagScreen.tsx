import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card } from "../components/Card";
import { Header } from "../components/Header";
import { useStore } from "../store";
import { colors, mono, radius } from "../theme";
import { ask, getRagHealth, RAG_URL, RagError, search } from "./api";
import type { AskResponse, Hit, RagHealth, SearchResponse } from "./types";

type Mode = "ask" | "search";
type Result = { mode: "ask"; data: AskResponse; ms: number } | { mode: "search"; data: SearchResponse; ms: number };

const EXAMPLES = [
  "Kartım çalınırsa sorumluluğum ne kadar?",
  "Asgari ödeme tutarı nasıl belirlenir?",
  "Kart aidatı geri alınabilir mi?",
];

const score = (x: number | null) => (x === null ? "–" : x.toFixed(3));

export function RagScreen() {
  const { devMode } = useStore();
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<Mode>("ask");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [health, setHealth] = useState<RagHealth | null>(null);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    getRagHealth().then(setHealth, () => setHealthError(true));
  }, []);

  async function handleSubmit() {
    const q = question.trim();
    setLoading(true);
    setError(null);
    const started = Date.now();
    try {
      if (mode === "ask") setResult({ mode, data: await ask(q), ms: Date.now() - started });
      else setResult({ mode, data: await search(q), ms: Date.now() - started });
    } catch (e) {
      setError(e instanceof RagError ? e.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || question.trim().length < 2;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Header title="Doküman" subtitle="Kanun ve kart sözleşmesine sor, kaynağıyla cevap al" />

      <View style={styles.status}>
        <View style={[styles.dot, { backgroundColor: health ? colors.positive : healthError ? colors.danger : colors.line }]} />
        <Text style={styles.statusText}>
          {health
            ? `finans-rag bağlı · ${health.chunks} parça yüklü`
            : healthError
              ? `finans-rag'e ulaşılamadı (${RAG_URL})`
              : "finans-rag kontrol ediliyor…"}
        </Text>
      </View>

      <Card>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Sorunu yaz…"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={500}
          style={styles.input}
          editable={!loading}
        />
        <View style={styles.examples}>
          {EXAMPLES.map((ex) => (
            <Pressable key={ex} onPress={() => setQuestion(ex)} disabled={loading} style={styles.chip}>
              <Text style={styles.chipText}>{ex}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <View style={styles.segment}>
        {(["ask", "search"] as const).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.segmentItem, mode === m && styles.segmentActive]}>
            <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
              {m === "ask" ? "Cevapla  /ask" : "Sadece ara  /search"}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={disabled}
        style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && styles.pressed]}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{mode === "ask" ? "Sor" : "Ara"}</Text>}
      </Pressable>

      {error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {result?.mode === "ask" && <AskResult data={result.data} />}
      {result?.mode === "search" && <SearchResult data={result.data} />}

      {result && devMode && (
        <View style={styles.dev}>
          <Text style={styles.devTitle}>
            {result.mode === "ask" ? "POST /ask" : "POST /search"} · {result.ms} ms
          </Text>
          <Text style={styles.devJson} selectable>
            {JSON.stringify(result.data, null, 2)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function FoundBadge({ found }: { found: boolean }) {
  return (
    <View style={[styles.badge, { backgroundColor: found ? colors.primarySoft : colors.dangerSoft }]}>
      <Text style={[styles.badgeText, { color: found ? colors.primary : colors.danger }]}>
        {found ? "Kaynakta bulundu" : "Kaynakta bulunamadı"}
      </Text>
    </View>
  );
}

function SourceLine({ source, page, section }: { source: string; page: number; section: string | null }) {
  return (
    <Text style={styles.sourceLine}>
      {source} · s.{page}
      {section ? ` · ${section}` : ""}
    </Text>
  );
}

function AskResult({ data }: { data: AskResponse }) {
  return (
    <>
      <Card title="CEVAP">
        <FoundBadge found={data.found} />
        <Text style={styles.answer}>{data.answer}</Text>
      </Card>
      {data.citations.length > 0 && (
        <Card title={`KAYNAKLAR (${data.citations.length})`}>
          {data.citations.map((c) => (
            <View key={c.n} style={styles.item}>
              <View style={styles.itemHead}>
                <Text style={styles.num}>[{c.n}]</Text>
                <View style={{ flex: 1 }}>
                  <SourceLine source={c.source} page={c.page} section={c.section} />
                </View>
              </View>
              <Text style={styles.excerpt} numberOfLines={6}>
                {c.text}
              </Text>
              {c.url && (
                <Pressable onPress={() => Linking.openURL(c.url!)}>
                  <Text style={styles.link}>Belgeyi aç</Text>
                </Pressable>
              )}
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

function SearchResult({ data }: { data: SearchResponse }) {
  return (
    <Card title={`PARÇALAR (${data.hits.length})`}>
      <FoundBadge found={data.found} />
      {data.hits.map((h: Hit, i) => (
        <View key={h.chunk.id} style={styles.item}>
          <View style={styles.itemHead}>
            <Text style={styles.num}>{i + 1}.</Text>
            <View style={{ flex: 1 }}>
              <SourceLine source={h.chunk.source} page={h.chunk.page} section={h.chunk.section} />
            </View>
          </View>
          <View style={styles.scores}>
            <Text style={styles.score}>anlam {score(h.dense_score)}</Text>
            <Text style={styles.score}>kelime {score(h.keyword_score)}</Text>
            <Text style={styles.score}>RRF {h.score.toFixed(4)}</Text>
          </View>
          <Text style={styles.excerpt} numberOfLines={6}>
            {h.chunk.text}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14, paddingBottom: 40 },
  status: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: -6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, color: colors.muted, flexShrink: 1 },
  input: { minHeight: 70, fontSize: 15, color: colors.ink, textAlignVertical: "top" },
  examples: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { backgroundColor: colors.bg, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.line },
  chipText: { fontSize: 12, color: colors.ink },
  segment: { flexDirection: "row", backgroundColor: colors.line, borderRadius: radius.sm, padding: 3 },
  segmentItem: { flex: 1, paddingVertical: 8, borderRadius: radius.sm - 2, alignItems: "center" },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  segmentTextActive: { color: colors.primary },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
  error: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: 14 },
  errorText: { color: colors.danger, fontSize: 14 },
  badge: { alignSelf: "flex-start", borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  answer: { fontSize: 15, lineHeight: 22, color: colors.ink },
  item: { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  itemHead: { flexDirection: "row", gap: 8 },
  num: { fontSize: 13, fontWeight: "800", color: colors.primary },
  sourceLine: { fontSize: 13, fontWeight: "600", color: colors.ink },
  scores: { flexDirection: "row", gap: 12 },
  score: { ...mono, color: colors.muted },
  excerpt: { fontSize: 13, lineHeight: 19, color: colors.muted },
  link: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  dev: { backgroundColor: colors.devBg, borderRadius: radius.md, padding: 14, gap: 8 },
  devTitle: { ...mono, color: colors.devMuted },
  devJson: { ...mono, color: colors.devInk },
});
