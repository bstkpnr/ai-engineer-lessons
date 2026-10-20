import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ApiError, extract } from "../api";
import { Card } from "../components/Card";
import { DevPanel } from "../components/DevPanel";
import { Header } from "../components/Header";
import { maskeLabel } from "../labels";
import { SAMPLE_SMS } from "../sampleSms";
import { useStore } from "../store";
import { colors, radius } from "../theme";
import type { ExtractResponse } from "../types";

const MAX_LENGTH = 10_000;

type Result = ExtractResponse & { eklenen: number; mukerrer: number };

export function AddScreen({ onDone }: { onDone: () => void }) {
  const { addIslemler, devMode } = useStore();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);

  async function handleExtract() {
    setLoading(true);
    setError(null);
    try {
      const response = await extract(text);
      const { eklenen, mukerrer } = addIslemler(response.islemler);
      setResult({ ...response, eklenen, mukerrer });
      setText("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || text.trim().length === 0;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Header title="Harcama Koçu" subtitle="Banka SMS'lerini yapıştır, gerisini koça bırak" />

      <Card>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={"Banka SMS'lerini ya da hesap hareketlerini buraya yapıştır…\nHer satır bir işlem olabilir."}
          placeholderTextColor={colors.muted}
          multiline
          maxLength={MAX_LENGTH}
          style={styles.input}
          editable={!loading}
        />
        <View style={styles.inputFooter}>
          <Pressable onPress={() => setText(SAMPLE_SMS)} disabled={loading}>
            <Text style={styles.link}>Örnek SMS'leri yükle</Text>
          </Pressable>
          <Text style={styles.counter}>{text.split("\n").filter((l) => l.trim()).length} satır</Text>
        </View>
      </Card>

      <Pressable
        onPress={handleExtract}
        disabled={disabled}
        style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && styles.pressed]}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Harcamaları çıkar</Text>}
      </Pressable>

      {error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {result && (
        <Card title="SONUÇ">
          <Text style={styles.big}>✓ {result.eklenen} işlem eklendi</Text>
          {result.mukerrer > 0 && (
            <Text style={styles.line}>↺ {result.mukerrer} işlem daha önce eklendiği için atlandı</Text>
          )}
          {result.atlananlar.length > 0 && (
            <Pressable onPress={() => setShowSkipped((s) => !s)}>
              <Text style={styles.line}>
                ⊘ {result.atlananlar.length} satır harcama değildi{" "}
                <Text style={styles.link}>{showSkipped ? "gizle" : "göster"}</Text>
              </Text>
            </Pressable>
          )}
          {showSkipped &&
            result.atlananlar.map((a, i) => (
              <Text key={i} style={styles.skipped}>
                “{a.kaynak}” — {a.neden}
              </Text>
            ))}
          {result.maskelenen.length > 0 && (
            <Text style={styles.masked}>
              🔒 Modele gönderilmeden önce maskelendi: {result.maskelenen.map((m) => maskeLabel[m] ?? m).join(", ")}
            </Text>
          )}
          {devMode && <DevPanel debug={result.debug} title="Harcama çıkarma isteği" />}
          <Pressable onPress={onDone}>
            <Text style={styles.link}>Harcamalarımı gör →</Text>
          </Pressable>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  input: { minHeight: 150, fontSize: 15, color: colors.ink, textAlignVertical: "top", lineHeight: 21 },
  inputFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  link: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  counter: { color: colors.muted, fontSize: 12 },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: "center" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  error: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: 12 },
  errorText: { color: colors.danger, fontSize: 14 },
  big: { fontSize: 18, fontWeight: "800", color: colors.ink },
  line: { fontSize: 14, color: colors.ink },
  skipped: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  masked: { fontSize: 13, color: colors.positive },
});
