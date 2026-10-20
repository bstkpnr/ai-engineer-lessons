import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { TabBar, type Tab } from "./src/components/TabBar";
import { AddScreen } from "./src/screens/AddScreen";
import { CoachScreen } from "./src/screens/CoachScreen";
import { ExpensesScreen } from "./src/screens/ExpensesScreen";
import { StoreProvider } from "./src/store";
import { colors } from "./src/theme";

function Main() {
  const [tab, setTab] = useState<Tab>("add");
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {tab === "add" && <AddScreen onDone={() => setTab("expenses")} />}
        {tab === "expenses" && <ExpensesScreen />}
        {tab === "coach" && <CoachScreen />}
      </View>
      <TabBar active={tab} onChange={setTab} />
      <StatusBar style="dark" />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Main />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
});
