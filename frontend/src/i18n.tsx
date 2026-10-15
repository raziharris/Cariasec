import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  cards as sourceCards,
  categories as sourceCategories,
  type LogEntry,
  type View,
} from "../../shared/game";
import { validNickname } from "../../shared/nickname";
import { english, careerTitles, familyEnglish } from "./translations";
import { careerDescriptions } from "./careerDescriptions";

export type Language = "ms" | "en";
export type Profile = { name: string; language: Language; reducedMotion: boolean };
const PROFILE_KEY = "cariasec-profile";
const READY_KEY = "cariasec-onboarded";
export function validName(name: string) {
  return validNickname(name);
}
function storedProfile(): Profile {
  try {
    const data = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
    if (
      data &&
      typeof data.name === "string" &&
      validName(data.name) &&
      (data.language === "ms" || data.language === "en")
    )
      return { name: data.name.trim(), language: data.language, reducedMotion: data.reducedMotion === true };
  } catch {
    /* Storage can be unavailable in a restricted browser. */
  }
  return { name: "", language: "ms", reducedMotion: false };
}
export function translate(
  language: Language,
  key: string,
  values: Record<string, string | number> = {},
) {
  const template = language === "en" ? (english[key] ?? key) : key;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    String(values[name] ?? match),
  );
}
export function serverMessage(
  text: string | null | undefined,
  language: Language,
): string {
  if (!text) return "";
  if (language === "ms") return text;
  if (english[text]) return english[text];
  let match;
  if ((match = /^Had (\d+) tindakan telah dicapai\.$/.exec(text)))
    return `The ${match[1]}-action limit was reached.`;
  if (
    (match =
      /^(.*) meninggalkan permainan\. Pusingan dibatalkan tanpa pemenang\.$/.exec(
        text,
      ))
  )
    return `${match[1]} left the game. Round cancelled with no winner.`;
  if ((match = /^(.*) telah kembali\.$/.exec(text)))
    return `${match[1]} is back.`;
  if ((match = /^(.*) terputus\. Menunggu sambungan semula\.$/.exec(text)))
    return `${match[1]} disconnected. Waiting to reconnect.`;
  if ((match = /^Salin kod bilik: (.*)$/.exec(text)))
    return `Copy room code: ${match[1]}`;
  return text;
}
export function logMessage(
  entry: LogEntry | undefined,
  room: View,
  language: Language,
): string {
  if (!entry) return "";
  if (language === "ms") return entry.text;
  const actor =
    room.players.find((p) => p.id === entry.actor)?.name ?? "Player";
  const target =
    room.players.find((p) => p.id === entry.target)?.name ?? "Player";
  const card = entry.card ? careerTitles[entry.card] : "card";
  if (entry.kind === "transfer")
    return `${actor} received ${card} from ${target}.`;
  if (entry.kind === "family") {
    const family = sourceCategories.find((c) =>
      entry.text.endsWith(`keluarga ${c.name}.`),
    );
    return `${actor} completed the ${family ? familyEnglish[family.code].name : "card"} family!`;
  }
  if (entry.kind === "draw") {
    if (entry.target)
      return `${target} has no ${card}. ${actor} ${entry.text.endsWith("mengambil satu kad.") ? "draws a card" : "passes the turn"}.`;
    if (entry.text.endsWith("Giliran pemain seterusnya."))
      return `${actor}'s time is up. ${entry.text.includes("Satu kad diambil.") ? "A card was drawn. " : ""}Next player's turn.`;
    return `${actor} ${entry.text.includes("mengambil satu kad") ? "draws a card" : "passes the turn"}: no other player has cards.`;
  }
  return serverMessage(entry.text, language);
}
type ContextValue = {
  profile: Profile;
  ready: boolean;
  setLanguage: (language: Language) => void;
  finishSetup: (name: string) => boolean;
  rememberName: (name: string) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
};
const LanguageContext = createContext<ContextValue | null>(null);
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState(storedProfile);
  const [ready, setReady] = useState(() => {
    try {
      return (
        validName(storedProfile().name) &&
        sessionStorage.getItem(READY_KEY) === "yes"
      );
    } catch {
      return false;
    }
  });
  const persist = (next: Profile) => {
    setProfile(next);
    try {
      if (validName(next.name))
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {
      /* Keep working in memory. */
    }
  };
  useEffect(() => {
    document.documentElement.lang = profile.language;
  }, [profile.language]);
  return (
    <LanguageContext.Provider
      value={{
        profile,
        ready,
        setLanguage: (language) => persist({ ...profile, language }),
        setReducedMotion: (reducedMotion) => persist({ ...profile, reducedMotion }),
        rememberName: (name) => {
          if (validName(name)) persist({ ...profile, name: name.trim() });
        },
        finishSetup: (name) => {
          if (!validName(name)) return false;
          persist({ ...profile, name: name.trim() });
          setReady(true);
          try {
            sessionStorage.setItem(READY_KEY, "yes");
          } catch {
            /* Keep working in memory. */
          }
          return true;
        },
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("LanguageProvider is required.");
  const language = context.profile.language;
  const data = useMemo(() => {
    const cards = sourceCards.map((card) => ({
      ...card,
      title: language === "en" ? careerTitles[card.id] : card.title,
      description: language === "en" ? careerDescriptions[card.id] : card.description,
    }));
    const categories = sourceCategories.map((category) =>
      language === "ms"
        ? category
        : {
            ...category,
            ...familyEnglish[category.code],
            challenge: `Act out a job from the ${familyEnglish[category.code].name} family`,
          },
    );
    return {
      cards,
      categories,
      cardById: Object.fromEntries(cards.map((card) => [card.id, card])),
    };
  }, [language]);
  return {
    ...context,
    ...data,
    language,
    t: (key: string, values?: Record<string, string | number>) =>
      translate(language, key, values),
    message: (text: string | null | undefined) => serverMessage(text, language),
    logText: (entry: LogEntry | undefined, room: View) =>
      logMessage(entry, room, language),
  };
}
