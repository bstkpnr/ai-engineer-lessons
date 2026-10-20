import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ChatMessage, Islem, KayitliIslem } from "./types";

type Store = {
  islemler: KayitliIslem[];
  addIslemler: (yeni: Islem[]) => { eklenen: number; mukerrer: number };
  clear: () => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  devMode: boolean;
  setDevMode: (value: boolean) => void;
};

const StoreContext = createContext<Store | null>(null);

// Aynı SMS iki kez yapıştırılırsa toplam şişmesin diye her işlemin bir "parmak izi" var
function fingerprint(i: Islem) {
  const source = i.kaynak.trim().toLocaleLowerCase("tr");
  return source || `${i.satici}|${i.tutar}|${i.tarih ?? ""}|${i.tip}`;
}

// Veriler bellekte tutuluyor; uygulama kapanınca silinir
export function StoreProvider({ children }: { children: ReactNode }) {
  const [islemler, setIslemler] = useState<KayitliIslem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [devMode, setDevMode] = useState(false);

  const addIslemler = useCallback(
    (yeni: Islem[]) => {
      const seen = new Set(islemler.map(fingerprint));
      const eklenecek: KayitliIslem[] = [];
      let mukerrer = 0;
      for (const i of yeni) {
        const fp = fingerprint(i);
        if (seen.has(fp)) {
          mukerrer += 1;
          continue;
        }
        seen.add(fp);
        eklenecek.push({ ...i, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
      }
      setIslemler((prev) => [...eklenecek, ...prev]);
      return { eklenen: eklenecek.length, mukerrer };
    },
    [islemler],
  );

  const clear = useCallback(() => {
    setIslemler([]);
    setMessages([]);
  }, []);

  const value = useMemo(
    () => ({ islemler, addIslemler, clear, messages, setMessages, devMode, setDevMode }),
    [islemler, addIslemler, clear, messages, devMode],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore, StoreProvider içinde kullanılmalı");
  return store;
}
