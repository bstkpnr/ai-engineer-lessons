import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from "react-native";
import { ApiError, streamChat } from "../api";
import { DevPanel } from "../components/DevPanel";
import { Header } from "../components/Header";
import { useStore } from "../store";
import { buildSummary } from "../summary";
import { colors, radius } from "../theme";
import type { ChatMessage } from "../types";

const SUGGESTIONS = [
  "Bu ay neden bu kadar çok harcadım?",
  "Hangi aboneliklerden vazgeçebilirim?",
  "En çok nereye harcıyorum?",
  "Biraz para biriktirmek için ne yapabilirim?",
];

// Model hafızasız (Gün 2): Sohbet geçmişini her istekte biz gönderiyoruz.
// Context'i ve maliyeti sınırlamak için sadece son mesajları gönderiyoruz.
const HISTORY_LIMIT = 10;

export function CoachScreen() {
  const { islemler, messages, setMessages, devMode } = useStore();
  const summary = useMemo(() => buildSummary(islemler), [islemler]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);

  async function send(text: string) {
    const question = text.trim();
    if (!question || streaming) return;
    setInput("");

    const history: ChatMessage[] = [...messages.filter((m) => !m.error), { role: "user", content: question }];
    setMessages((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setStreaming(true);

    // Cevap geldikçe son mesajı güncelle (streaming, Gün 4)
    const appendToLast = (update: (m: ChatMessage) => ChatMessage) =>
      setMessages((prev) => [...prev.slice(0, -1), update(prev[prev.length - 1])]);

    try {
      const payload = history.slice(-HISTORY_LIMIT).map(({ role, content }) => ({ role, content }));
      const debug = await streamChat(summary, payload, (delta) => {
        appendToLast((m) => ({ ...m, content: m.content + delta }));
        scrollRef.current?.scrollToEnd({ animated: false });
      });
      appendToLast((m) => ({ ...m, debug }));
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Beklenmeyen bir hata oluştu.";
      appendToLast((m) => ({ ...m, content: m.content || message, error: true }));
    } finally {
      setStreaming(false);
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }

  const empty = islemler.length === 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Header title="Koç" subtitle="Harcamaların hakkında soru sor" />

        {empty ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>Koçla konuşmak için önce Ekle sekmesinden birkaç harcama ekle.</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.hint}>Şunlardan biriyle başlayabilirsin:</Text>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} onPress={() => send(s)} style={styles.suggestion}>
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {messages.map((m, i) => (
          <View key={i} style={{ gap: 6 }}>
            <View style={[styles.bubble, m.role === "user" ? styles.user : styles.assistant, m.error && styles.errorBubble]}>
              {m.role === "assistant" && !m.content && streaming && i === messages.length - 1 ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={[styles.bubbleText, m.role === "user" && styles.userText, m.error && styles.errorText]}>
                  {m.content}
                </Text>
              )}
            </View>
            {devMode && m.role === "assistant" && m.debug && <DevPanel debug={m.debug} title="Koç isteği" />}
          </View>
        ))}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={empty ? "Önce harcama ekle" : "Bir soru sor…"}
          placeholderTextColor={colors.muted}
          style={styles.input}
          editable={!empty && !streaming}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <Pressable
          onPress={() => send(input)}
          disabled={empty || streaming || !input.trim()}
          style={[styles.send, (empty || streaming || !input.trim()) && { opacity: 0.4 }]}
        >
          <Text style={styles.sendText}>↑</Text>
        </Pressable>
      </View>
      <Text style={styles.disclaimer}>Koç harcamalarını yorumlar, yatırım tavsiyesi vermez.</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, paddingBottom: 24 },
  notice: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 16 },
  noticeText: { color: colors.primary, fontSize: 14, lineHeight: 20 },
  hint: { fontSize: 13, color: colors.muted },
  suggestion: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14 },
  suggestionText: { fontSize: 15, color: colors.ink },
  bubble: { borderRadius: radius.md, padding: 14, maxWidth: "88%" },
  user: { backgroundColor: colors.primary, alignSelf: "flex-end", borderBottomRightRadius: 4 },
  assistant: { backgroundColor: colors.surface, alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.line },
  errorBubble: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
  bubbleText: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  userText: { color: "#fff" },
  errorText: { color: colors.danger },
  composer: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 10, backgroundColor: colors.bg },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
  },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sendText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  disclaimer: { fontSize: 11, color: colors.muted, textAlign: "center", paddingVertical: 6 },
});
