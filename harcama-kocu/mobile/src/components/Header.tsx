import { StyleSheet, Switch, Text, View } from "react-native";
import { useStore } from "../store";
import { colors } from "../theme";

type Props = { title: string; subtitle?: string };

export function Header({ title, subtitle }: Props) {
  const { devMode, setDevMode } = useStore();
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.dev}>
        <Text style={styles.devLabel}>Geliştirici{"\n"}modu</Text>
        <Switch
          value={devMode}
          onValueChange={setDevMode}
          trackColor={{ true: colors.primary, false: colors.line }}
          accessibilityLabel="Geliştirici modu"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "800", color: colors.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 2 },
  dev: { flexDirection: "row", alignItems: "center", gap: 8 },
  devLabel: { fontSize: 11, color: colors.muted, textAlign: "right", lineHeight: 13 },
});
