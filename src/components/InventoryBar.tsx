import type { GameEngine, EngineSnapshot } from "../engine";

interface InventoryBarProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

export function InventoryBar({ engine, snapshot }: InventoryBarProps) {
  if (snapshot.inventory.length === 0) return null;

  return (
    <div className="inventory-bar">
      {snapshot.inventory.map((itemId) => {
        const item = engine.getItem(itemId);
        if (!item) return null;
        const selected = snapshot.selectedItemId === itemId;
        return (
          <button
            type="button"
            key={itemId}
            className={`inventory-item${selected ? " inventory-item--selected" : ""}`}
            onClick={() => engine.selectInventoryItem(itemId)}
            disabled={snapshot.locked}
            title={item.description}
          >
            <img src={item.image} alt={item.name} draggable={false} onError={(e) => (e.currentTarget.style.display = "none")} />
            <span>{item.name}</span>
          </button>
        );
      })}
    </div>
  );
}
