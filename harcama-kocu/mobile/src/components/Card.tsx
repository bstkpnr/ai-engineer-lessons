import { StyleSheet, Text, View, type ViewProps } from "react-native";
import { colors, radius } from "../theme";

export function Card({ title, children, style, ...rest }: ViewProps & { title?: string }) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.line },
  title: { fontSize: 12, fontWeight: "700", color: colors.muted, letterSpacing: 0.6 },
});
