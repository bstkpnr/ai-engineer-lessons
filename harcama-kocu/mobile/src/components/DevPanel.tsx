import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, mono, radius } from "../theme";
import type { Debug } from "../types";

// Her işlemin arkasında ne olduğunu gösterir: token, maliyet, önbellek, süre...
export function DevPanel({ debug, title }: { debug?: Debug; title: string }) {
  const [showPrompt, setShowPrompt] = useState(false);
  if (!debug) return null;

  const u = debug.usage;
  const cacheRead = u?.cache_read_input_tokens ?? 0;
  const cacheWrite = u?.cache_creation_input_tokens ?? 0;
  const cacheText = !u
    ? "—"
    : cacheRead > 0
      ? `önbellekten okundu: ${cacheRead} token`
      : cacheWrite > 0
        ? `önbelleğe yazıldı: ${cacheWrite} token`
        : "kullanılmadı";

  const rows: [string, string][] = [
    ["model", debug.model],
    ["input token", u ? String(u.input_tokens) : "— (demo)"],
    ["output token", u ? String(u.output_tokens) : "— (demo)"],
    ["prompt caching", cacheText],
    ["maliyet", debug.maliyet_usd != null ? `$${debug.maliyet_usd}` : "fiyat girilmedi"],
    ["stop_reason", debug.stop_reason ?? "—"],
    ["toplam süre", `${debug.sure_ms} ms`],
  ];
  if (debug.ilk_token_ms != null) rows.splice(7, 0, ["ilk token", `${debug.ilk_token_ms} ms`]);
  if (debug.gecmis_mesaj_sayisi != null) rows.push(["modele giden mesaj", `${debug.gecmis_mesaj_sayisi} (geçmiş dahil)`]);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>⚙︎ {title}</Text>
      {rows.map(([k, v]) => (
        <View key={k} style={styles.row}>
          <Text style={styles.key}>{k}</Text>
          <Text style={styles.value}>{v}</Text>
        </View>
      ))}
      {debug.prompt ? (
        <Pressable onPress={() => setShowPrompt((s) => !s)}>
          <Text style={styles.link}>{showPrompt ? "Prompt'u gizle" : "Modele giden prompt'u göster"}</Text>
        </Pressable>
      ) : null}
      {showPrompt && debug.prompt ? (
        <Text style={styles.prompt}>
          {"[system]\n"}
          {debug.prompt.system}
          {"\n\n[user]\n"}
          {debug.prompt.user}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.devBg, borderRadius: radius.sm, padding: 12, gap: 4 },
  title: { ...mono, color: colors.devInk, fontWeight: "700", marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  key: { ...mono, color: colors.devMuted },
  value: { ...mono, color: colors.devInk, flexShrink: 1, textAlign: "right" },
  link: { ...mono, color: colors.accent, marginTop: 6 },
  prompt: { ...mono, color: colors.devInk, marginTop: 6, lineHeight: 17 },
});
