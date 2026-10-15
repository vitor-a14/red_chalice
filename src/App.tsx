import CombatTab from "./combat/CombatTab";
import DiceTab from "./dice/DiceTab";
import { usePersistentState } from "./lib/usePersistentState";

const TABS = [
  { id: "combat", label: "Combat", icon: "⚔" },
  { id: "dice", label: "Dice", icon: "⬢" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const [tab, setTab] = usePersistentState<TabId>("rc.tab", "combat");

  return (
    <div className="app">
      <div className="backdrop" aria-hidden />
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            🍷
          </span>
          <span className="brand-name">Red Chalice</span>
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
              <span className="tab-icon" aria-hidden>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="content">
        {/* Both tabs stay mounted so in-progress state survives switching. */}
        <div hidden={tab !== "combat"}>
          <CombatTab />
        </div>
        <div hidden={tab !== "dice"}>
          <DiceTab />
        </div>
      </main>
    </div>
  );
}
