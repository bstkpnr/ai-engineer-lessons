import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "../components/Card";
import { Header } from "../components/Header";
import { formatMoney } from "../format";
import { kategoriIcon, kategoriLabel } from "../labels";
import { useStore } from "../store";
import { buildSummary } from "../summary";
import { colors, radius } from "../theme";

export function ExpensesScreen() {
  const { islemler, clear } = useStore();
  const summary = useMemo(() => buildSummary(islemler), [islemler]);

  if (islemler.length === 0) {
    return (
      <View style={styles.container}>
        <Header title="Harcamalar" />
        <Card>
          <Text style={styles.emptyTitle}>Henüz harcama yok</Text>
          <Text style={styles.muted}>Ekle sekmesinden banka SMS'lerini yapıştırdığında özetin burada görünecek.</Text>
        </Card>
      </View>
    );
  }

  const max = summary.kategoriler[0]?.tutar ?? 1;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header title="Harcamalar" subtitle={`${summary.islem_sayisi} harcama`} />

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Net harcama</Text>
        <Text style={styles.heroValue}>{formatMoney(summary.net_harcama)}</Text>
        <Text style={styles.heroSub}>
          {formatMoney(summary.toplam_harcama)} harcama
          {summary.toplam_iade > 0 ? `  ·  ${formatMoney(summary.toplam_iade)} iade` : ""}
        </Text>
      </View>

      <Card title="KATEGORİLER">
        {summary.kategoriler.map((k) => (
          <View key={k.kategori} style={{ gap: 6 }}>
            <View style={styles.rowBetween}>
              <Text style={styles.rowLabel}>
                {kategoriIcon[k.kategori]}  {k.etiket}
              </Text>
              <Text style={styles.rowValue}>
                {formatMoney(k.tutar)} <Text style={styles.muted}>%{k.yuzde}</Text>
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(k.tutar / max) * 100}%` }]} />
            </View>
          </View>
        ))}
      </Card>

      {summary.abonelikler.length > 0 && (
        <Card title="ABONELİKLER">
          {summary.abonelikler.map((a) => (
            <View key={a.satici} style={styles.rowBetween}>
              <Text style={styles.rowLabel}>🔁  {a.satici}</Text>
              <Text style={styles.rowValue}>{formatMoney(a.tutar)}</Text>
            </View>
          ))}
          <View style={[styles.rowBetween, styles.totalRow]}>
            <Text style={styles.rowLabelBold}>Toplam</Text>
            <Text style={styles.rowValueBold}>{formatMoney(summary.abonelik_toplami)}</Text>
          </View>
        </Card>
      )}

      {summary.doviz_harcamalari.length > 0 && (
        <Card title="DÖVİZ HARCAMALARI">
          {summary.doviz_harcamalari.map((d, i) => (
            <View key={i} style={styles.rowBetween}>
              <Text style={styles.rowLabel}>{d.satici}</Text>
              <Text style={styles.rowValue}>{formatMoney(d.tutar, d.para_birimi)}</Text>
            </View>
          ))}
          <Text style={styles.muted}>Kura çevrilmediği için toplama dahil edilmedi.</Text>
        </Card>
      )}

      <Card title="TÜM İŞLEMLER">
        {islemler.map((i) => (
          <View key={i.id} style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{i.satici}</Text>
              <Text style={styles.small}>{kategoriLabel[i.kategori]}</Text>
            </View>
            <Text style={[styles.rowValue, i.tip === "iade" && { color: colors.positive }]}>
              {i.tip === "iade" ? "+" : ""}
              {formatMoney(i.tutar, i.para_birimi)}
            </Text>
          </View>
        ))}
      </Card>

      <Pressable onPress={clear} style={styles.clear}>
        <Text style={styles.clearText}>Tüm verileri temizle</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  hero: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: 20, gap: 4 },
  heroLabel: { color: "#CFE9E1", fontSize: 13, fontWeight: "600" },
  heroValue: { color: "#fff", fontSize: 34, fontWeight: "800", letterSpacing: -0.5, fontVariant: ["tabular-nums"] },
  heroSub: { color: "#CFE9E1", fontSize: 13 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  rowLabel: { fontSize: 15, color: colors.ink },
  rowLabelBold: { fontSize: 15, color: colors.ink, fontWeight: "700" },
  rowValue: { fontSize: 15, color: colors.ink, fontWeight: "600", fontVariant: ["tabular-nums"] },
  rowValueBold: { fontSize: 15, color: colors.ink, fontWeight: "800", fontVariant: ["tabular-nums"] },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
  track: { height: 8, backgroundColor: colors.primarySoft, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
  small: { fontSize: 12, color: colors.muted },
  muted: { fontSize: 13, color: colors.muted, fontWeight: "400" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  clear: { alignItems: "center", paddingVertical: 12 },
  clearText: { color: colors.danger, fontWeight: "600" },
});
