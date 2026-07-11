import { useState } from "react";
import type { GameEngine, EngineSnapshot } from "../engine";

const SLOT_COUNT = 5;

interface InventoryBarProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

export function InventoryBar({ engine, snapshot }: InventoryBarProps) {
  const [page, setPage] = useState(0);

  const total = snapshot.inventory.length;
  const pageCount = Math.max(1, Math.ceil(total / SLOT_COUNT));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * SLOT_COUNT;
  const visibleIds = snapshot.inventory.slice(start, start + SLOT_COUNT);
  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => visibleIds[i]);

  const canGoLeft = currentPage > 0;
  const canGoRight = currentPage < pageCount - 1;

  return (
    <div className="inventory-bar">
      <button
        type="button"
        className="inventory-bar__arrow"
        onClick={() => setPage(currentPage - 1)}
        disabled={!canGoLeft}
        aria-label="前のアイテム"
      >
        ‹
      </button>
      <div className="inventory-bar__slots">
        {slots.map((itemId, i) => {
          const item = itemId ? engine.getItem(itemId) : undefined;
          if (!itemId || !item) {
            return <div key={`empty-${i}`} className="inventory-slot inventory-slot--empty" />;
          }
          const selected = snapshot.selectedItemId === itemId;
          return (
            <button
              type="button"
              key={itemId}
              className={`inventory-slot${selected ? " inventory-slot--selected" : ""}`}
              onClick={() => engine.selectInventoryItem(itemId)}
              disabled={snapshot.locked}
              title={item.description}
            >
              <img
                src={item.image}
                alt={item.name}
                draggable={false}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="inventory-bar__arrow"
        onClick={() => setPage(currentPage + 1)}
        disabled={!canGoRight}
        aria-label="次のアイテム"
      >
        ›
      </button>
    </div>
  );
}
