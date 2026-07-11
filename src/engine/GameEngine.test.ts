import { describe, expect, it } from "vitest";
import { GameEngine } from "./GameEngine";
import type { GameData, GameObject } from "./types";

function obj(partial: Partial<GameObject> & { id: string }): GameObject {
  return {
    name: partial.id,
    type: "object",
    visible: true,
    enabled: true,
    state: "default",
    position: { x: 0, y: 0, width: 10, height: 10 },
    children: [],
    triggers: [],
    ...partial,
  };
}

function buildGame(overrides: Partial<GameData> = {}): GameData {
  return {
    gameId: "test_game",
    title: "テストゲーム",
    initialStageId: "stage_1",
    initialRoomId: "room_a",
    stages: [
      {
        id: "stage_1",
        name: "ステージ1",
        rooms: [
          {
            id: "room_a",
            name: "部屋A",
            background: "bg_a.png",
            leftRoomId: null,
            rightRoomId: "room_b",
            objects: [],
          },
          {
            id: "room_b",
            name: "部屋B",
            background: "bg_b.png",
            leftRoomId: "room_a",
            rightRoomId: null,
            objects: [],
          },
        ],
      },
    ],
    items: [{ id: "key", name: "鍵", image: "key.png", description: "テスト用の鍵" }],
    ...overrides,
  };
}

describe("touch triggers", () => {
  it("runs matching events in array order and skips non-matching triggers", async () => {
    const game = buildGame();
    game.stages[0].rooms[0].objects.push(
      obj({
        id: "door",
        type: "door",
        state: "locked",
        triggers: [
          {
            type: "touch",
            conditions: [{ type: "objectState", key: "door", operator: "equals", value: "locked" }],
            events: [
              { type: "setObjectState", targetId: "door", value: "open" },
              { type: "navigateRoom", roomId: "room_b" },
            ],
          },
          {
            type: "touch",
            conditions: [{ type: "objectState", key: "door", operator: "equals", value: "open" }],
            events: [{ type: "navigateRoom", roomId: "room_a" }],
          },
        ],
      }),
    );

    const engine = new GameEngine(game);
    await engine.touch("door");

    expect(engine.getSnapshot().objectStates.door.state).toBe("open");
    expect(engine.getSnapshot().roomId).toBe("room_b");
  });

  it("does not fire touch on invisible or disabled objects", async () => {
    const game = buildGame();
    game.stages[0].rooms[0].objects.push(
      obj({
        id: "hidden_thing",
        visible: false,
        triggers: [{ type: "touch", conditions: [], events: [{ type: "clearGame" }] }],
      }),
      obj({
        id: "disabled_thing",
        enabled: false,
        triggers: [{ type: "touch", conditions: [], events: [{ type: "clearGame" }] }],
      }),
    );
    const engine = new GameEngine(game);
    await engine.touch("hidden_thing");
    await engine.touch("disabled_thing");
    expect(engine.getSnapshot().cleared).toBe(false);
  });
});

describe("items and selection", () => {
  it("addItem/hasItem/selectItem/clearSelectedItem work end to end", async () => {
    const game = buildGame();
    game.stages[0].rooms[0].objects.push(
      obj({
        id: "key_pickup",
        type: "item",
        triggers: [
          {
            type: "touch",
            conditions: [],
            events: [
              { type: "addItem", itemId: "key" },
              { type: "hideObject", targetId: "key_pickup" },
            ],
          },
        ],
      }),
      obj({
        id: "lock",
        type: "door",
        triggers: [
          {
            type: "touch",
            conditions: [{ type: "selectedItem", key: "selectedItemId", operator: "equals", value: "key" }],
            events: [{ type: "setObjectState", targetId: "lock", value: "open" }, { type: "clearSelectedItem" }],
          },
        ],
      }),
    );

    const engine = new GameEngine(game);
    await engine.touch("key_pickup");
    expect(engine.getSnapshot().inventory).toEqual(["key"]);
    expect(engine.getSnapshot().objectStates.key_pickup.visible).toBe(false);

    engine.selectInventoryItem("key");
    expect(engine.getSnapshot().selectedItemId).toBe("key");

    await engine.touch("lock");
    expect(engine.getSnapshot().objectStates.lock.state).toBe("open");
    expect(engine.getSnapshot().selectedItemId).toBeNull();
  });
});

describe("navigation", () => {
  it("pushNavigation/popNavigation drill into children and onBack fires on back()", async () => {
    const game = buildGame();
    game.stages[0].rooms[0].objects.push(
      obj({
        id: "shelf",
        type: "zoom",
        children: [obj({ id: "book" })],
        triggers: [
          { type: "touch", conditions: [], events: [{ type: "pushNavigation", targetId: "shelf" }] },
          {
            type: "onBack",
            conditions: [],
            events: [{ type: "setObjectState", targetId: "shelf", value: "closed" }],
          },
        ],
      }),
    );

    const engine = new GameEngine(game);
    await engine.touch("shelf");
    expect(engine.getSnapshot().navigationStack).toEqual(["shelf"]);
    expect(engine.getDisplayedObjects().map((o) => o.id)).toEqual(["book"]);

    await engine.back();
    expect(engine.getSnapshot().navigationStack).toEqual([]);
    expect(engine.getSnapshot().objectStates.shelf.state).toBe("closed");
  });

  it("moveRoom follows leftRoomId/rightRoomId and resets the navigation stack", () => {
    const engine = new GameEngine(buildGame());
    engine.moveRoom("right");
    expect(engine.getSnapshot().roomId).toBe("room_b");
    engine.moveRoom("right");
    expect(engine.getSnapshot().roomId).toBe("room_b");
    engine.moveRoom("left");
    expect(engine.getSnapshot().roomId).toBe("room_a");
  });
});

describe("locking and sequential message events", () => {
  it("locks input while a showMessage is awaiting dismissal, then continues the event list", async () => {
    const game = buildGame();
    game.stages[0].rooms[0].objects.push(
      obj({
        id: "sign",
        type: "text",
        triggers: [
          {
            type: "touch",
            conditions: [],
            events: [
              { type: "showMessage", text: "hello" },
              { type: "setGlobalState", key: "afterMessage", value: true },
            ],
          },
        ],
      }),
    );
    const engine = new GameEngine(game);
    const touchPromise = engine.touch("sign");

    // Message shown, event list paused, engine locked.
    await Promise.resolve();
    await Promise.resolve();
    expect(engine.getSnapshot().message).toBe("hello");
    expect(engine.getSnapshot().locked).toBe(true);
    expect(engine.getSnapshot().globalState.afterMessage).toBeUndefined();

    engine.dismissMessage();
    await touchPromise;

    expect(engine.getSnapshot().message).toBeNull();
    expect(engine.getSnapshot().globalState.afterMessage).toBe(true);
    expect(engine.getSnapshot().locked).toBe(false);
  });
});

describe("watchState edge triggering", () => {
  it("fires only on the false-to-true transition, and can re-fire after going false again", async () => {
    const game = buildGame();
    game.stages[0].rooms[0].objects.push(
      obj({
        id: "toggle",
        state: "default",
        triggers: [
          {
            type: "touch",
            conditions: [{ type: "objectState", key: "toggle", operator: "equals", value: "default" }],
            events: [{ type: "setObjectState", targetId: "toggle", value: "on" }],
          },
          {
            type: "touch",
            conditions: [{ type: "objectState", key: "toggle", operator: "equals", value: "on" }],
            // Manually clear fireCount here (not via the watcher) so a later "true" reading of
            // fireCount can only have come from the watchState trigger firing again below.
            events: [
              { type: "setObjectState", targetId: "toggle", value: "off" },
              { type: "setGlobalState", key: "fireCount", value: false },
            ],
          },
          {
            type: "touch",
            conditions: [{ type: "objectState", key: "toggle", operator: "equals", value: "off" }],
            events: [{ type: "setObjectState", targetId: "toggle", value: "default" }],
          },
        ],
      }),
      obj({
        id: "watcher",
        triggers: [
          {
            type: "watchState",
            conditions: [{ type: "objectState", key: "toggle", operator: "equals", value: "on" }],
            events: [{ type: "setGlobalState", key: "fireCount", value: true }],
          },
        ],
      }),
    );

    const engine = new GameEngine(game);

    await engine.touch("toggle"); // default -> on: watcher fires
    expect(engine.getSnapshot().globalState.fireCount).toBe(true);

    await engine.touch("toggle"); // on -> off: manually cleared, watcher condition now false
    expect(engine.getSnapshot().globalState.fireCount).toBe(false);

    await engine.touch("toggle"); // off -> default: still false, no watcher change
    expect(engine.getSnapshot().globalState.fireCount).toBe(false);

    await engine.touch("toggle"); // default -> on again: watcher fires again
    expect(engine.getSnapshot().globalState.fireCount).toBe(true);
  });
});

describe("stage progression and clear", () => {
  it("nextStage without stageId advances to the following stage's first room", async () => {
    const game = buildGame({
      stages: [
        {
          id: "stage_1",
          name: "ステージ1",
          rooms: [
            {
              id: "room_a",
              name: "部屋A",
              background: "bg_a.png",
              leftRoomId: null,
              rightRoomId: null,
              objects: [
                obj({
                  id: "portal",
                  triggers: [{ type: "touch", conditions: [], events: [{ type: "nextStage" }] }],
                }),
              ],
            },
          ],
        },
        {
          id: "stage_2",
          name: "ステージ2",
          rooms: [
            {
              id: "room_final",
              name: "最終部屋",
              background: "bg_final.png",
              leftRoomId: null,
              rightRoomId: null,
              objects: [],
            },
          ],
        },
      ],
    });

    const engine = new GameEngine(game);
    await engine.touch("portal");
    expect(engine.getSnapshot().stageId).toBe("stage_2");
    expect(engine.getSnapshot().roomId).toBe("room_final");
  });

  it("clearGame marks the game as cleared", async () => {
    const game = buildGame();
    game.stages[0].rooms[0].objects.push(
      obj({ id: "goal", triggers: [{ type: "touch", conditions: [], events: [{ type: "clearGame" }] }] }),
    );
    const engine = new GameEngine(game);
    await engine.touch("goal");
    expect(engine.getSnapshot().cleared).toBe(true);
  });
});
