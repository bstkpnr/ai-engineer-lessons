import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";

export type Tab = "add" | "expenses" | "coach";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "add", label: "Ekle", icon: "＋" },
  { key: "expenses", label: "Harcamalar", icon: "▤" },
  { key: "coach", label: "Koç", icon: "✦" },
];

export function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.icon, selected && styles.selected]}>{tab.icon}</Text>
            <Text style={[styles.label, selected && styles.selected]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
  tab: { flex: 1, alignItems: "center", gap: 2 },
  icon: { fontSize: 18, color: colors.muted },
  label: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  selected: { color: colors.primary },
});
