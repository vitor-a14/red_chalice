import type { ReactNode } from "react";
import CombatTab from "./combat/CombatTab";
import DiceTab from "./dice/DiceTab";
import { usePersistentState } from "./lib/usePersistentState";
import MusicTab from "./music/MusicTab";
import { MusicProvider } from "./music/MusicProvider";
import NowPlaying from "./music/NowPlaying";
import Chalice from "./ui/Chalice";
import { D20Icon, LuteIcon, SwordsIcon } from "./ui/icons";

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "combat", label: "Combat", icon: <SwordsIcon /> },
  { id: "dice", label: "Dice", icon: <D20Icon /> },
  { id: "music", label: "Music", icon: <LuteIcon /> },
];

type TabId = "combat" | "dice" | "music";

export default function App() {
  const [tab, setTab] = usePersistentState<TabId>("rc.tab", "combat");

  return (
    <MusicProvider>
      <div className="app">
        <div className="backdrop" aria-hidden />
        <div className="embers" aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 1.7) % 12}s` }} />
          ))}
        </div>
        <header className="topbar">
          <div className="brand">
            <Chalice size={44} />
            <div className="brand-text">
              <span className="brand-name">Red Chalice</span>
              <span className="brand-sub">Pathfinder Game Master's Grimoire</span>
            </div>
          </div>
          <nav className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`tab ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <span className="tab-icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </header>
        <main className="content">
          {/* All tabs stay mounted so in-progress state survives switching. */}
          <div hidden={tab !== "combat"}>
            <CombatTab />
          </div>
          <div hidden={tab !== "dice"}>
            <DiceTab />
          </div>
          <div hidden={tab !== "music"}>
            <MusicTab />
          </div>
        </main>
        <NowPlaying onOpen={() => setTab("music")} />
      </div>
    </MusicProvider>
  );
}
