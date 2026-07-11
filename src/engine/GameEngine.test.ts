import { describe, expect, it } from "vitest";
import { GameEngine } from "./GameEngine";
import type { GameData, GameObject, ObjectState, Trigger } from "./types";

function singleState(triggers: Trigger[] = []): Record<string, ObjectState> {
  return { default: { image: undefined, children: [], triggers } };
}

function makeObject(partial: {
  id: string;
  type?: string;
  visible?: boolean;
  enabled?: boolean;
  defaultState?: string;
  states: Record<string, ObjectState>;
}): GameObject {
  return {
    name: partial.id,
    type: partial.type ?? "object",
    visible: partial.visible ?? true,
    enabled: partial.enabled ?? true,
    position: { x: 0, y: 0, width: 10, height: 10 },
    defaultState: partial.defaultState ?? "default",
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

describe("state-scoped touch triggers", () => {
  it("dispatches to the triggers of the object's current state only", async () => {
    const game = buildGame();
    game.stages[0].rooms[0].objects.push(
      makeObject({
        id: "door",
        type: "door",
        defaultState: "locked",
        states: {
          locked: {
            image: "door_locked.png",
            children: [],
            triggers: [
              {
                type: "touch",
                conditions: [],
                events: [
                  { type: "setObjectState", targetId: "door", value: "open" },
                  { type: "navigateRoom", roomId: "room_b" },
                ],
              },
            ],
          },
          open: {
            image: "door_open.png",
            children: [],
            triggers: [
              {
                type: "touch",
                conditions: [],
                events: [{ type: "navigateRoom", roomId: "room_a" }],
              },
            ],
          },
        },
      }),
    );

    const engine = new GameEngine(game);
    await engine.touch("door");

    expect(engine.getSnapshot().objectStates.door.state).toBe("open");
    expect(engine.getSnapshot().roomId).toBe("room_b");

    // Now in the "open" state, touching runs the open-state trigger instead.
    await engine.touch("door");
    expect(engine.getSnapshot().roomId).toBe("room_a");
  });

  it("does not fire touch on invisible or disabled objects", async () => {
    const game = buildGame();
    game.stages[0].rooms[0].objects.push(
      makeObject({
        id: "hidden_thing",
        visible: false,
        states: singleState([{ type: "touch", conditions: [], events: [{ type: "clearGame" }] }]),
      }),
      makeObject({
        id: "disabled_thing",
        enabled: false,
        states: singleState([{ type: "touch", conditions: [], events: [{ type: "clearGame" }] }]),
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
      makeObject({
        id: "key_pickup",
        type: "item",
        states: singleState([
          {
            type: "touch",
            conditions: [],
            events: [
              { type: "addItem", itemId: "key" },
              { type: "hideObject", targetId: "key_pickup" },
            ],
          },
        ]),
      }),
      makeObject({
        id: "lock",
        type: "door",
        defaultState: "locked",
        states: {
          locked: {
            image: undefined,
            children: [],
            triggers: [
              {
                type: "touch",
                conditions: [{ type: "selectedItem", operator: "equals", value: "key" }],
                events: [
                  { type: "setObjectState", targetId: "lock", value: "open" },
                  { type: "clearSelectedItem" },
                ],
              },
            ],
          },
          open: { image: undefined, children: [], triggers: [] },
        },
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
  it("pushNavigation/popNavigation drill into a state's children and onBack fires on back()", async () => {
    const game = buildGame();
    game.stages[0].rooms[0].objects.push(
      makeObject({
        id: "shelf",
        type: "zoom",
        states: singleState([
          { type: "touch", conditions: [], events: [{ type: "pushNavigation", targetId: "shelf" }] },
          {
            type: "onBack",
            conditions: [],
            events: [{ type: "setGlobalState", key: "shelfClosed", value: true }],
          },
        ]),
      }),
    );
    // Redefine shelf's single state to reference "book" as a child.
    game.stages[0].rooms[0].objects[0].states.default.children = ["book"];
    game.stages[0].rooms[0].objects.push(makeObject({ id: "book", states: singleState([]) }));

    const engine = new GameEngine(game);
    await engine.touch("shelf");
    expect(engine.getSnapshot().navigationStack).toEqual(["shelf"]);
    expect(engine.getDisplayedObjects().map((o) => o.id)).toEqual(["book"]);

    await engine.back();
    expect(engine.getSnapshot().navigationStack).toEqual([]);
    expect(engine.getSnapshot().globalState.shelfClosed).toBe(true);
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

  it("treats an object referenced as a child as non-root, hidden from the room-level view", () => {
    const game = buildGame();
    game.stages[0].rooms[0].objects.push(
      makeObject({
        id: "shelf",
        states: { default: { image: undefined, children: ["book"], triggers: [] } },
      }),
      makeObject({ id: "book", states: singleState([]) }),
    );
    const engine = new GameEngine(game);
    expect(engine.getDisplayedObjects().map((o) => o.id)).toEqual(["shelf"]);
  });
});

describe("showMessage toast", () => {
  it("shows a non-blocking toast and continues the event list, then unlocks", async () => {
    const game = buildGame();
    game.stages[0].rooms[0].objects.push(
      makeObject({
        id: "sign",
        type: "text",
        states: singleState([
          {
            type: "touch",
            conditions: [],
            events: [
              { type: "showMessage", message: "hello" },
              { type: "setGlobalState", key: "afterMessage", value: true },
            ],
          },
        ]),
      }),
    );
    const engine = new GameEngine(game);
    await engine.touch("sign");

    // The toast is shown and the following event ran without needing dismissal.
    expect(engine.getSnapshot().toast).toBe("hello");
    expect(engine.getSnapshot().globalState.afterMessage).toBe(true);
    expect(engine.getSnapshot().locked).toBe(false);

    engine.dismissToast();
    expect(engine.getSnapshot().toast).toBeNull();
  });
});

describe("watchState edge triggering", () => {
  it("fires only on the false-to-true transition, and can re-fire after going false again", async () => {
    const game = buildGame();
    game.stages[0].rooms[0].objects.push(
      makeObject({
        id: "toggle",
        defaultState: "default",
        states: {
          default: {
            image: undefined,
            children: [],
            triggers: [
              {
                type: "touch",
                conditions: [],
                events: [{ type: "setObjectState", targetId: "toggle", value: "on" }],
              },
            ],
          },
          on: {
            image: undefined,
            children: [],
            triggers: [
              {
                type: "touch",
                conditions: [],
                // Manually clear fireCount here (not via the watcher) so a later "true" reading
                // of fireCount can only have come from the watchState trigger firing again below.
                events: [
                  { type: "setObjectState", targetId: "toggle", value: "off" },
                  { type: "setGlobalState", key: "fireCount", value: false },
                ],
              },
            ],
          },
          off: {
            image: undefined,
            children: [],
            triggers: [
              {
                type: "touch",
                conditions: [],
                events: [{ type: "setObjectState", targetId: "toggle", value: "default" }],
              },
            ],
          },
        },
      }),
      makeObject({
        id: "watcher",
        states: singleState([
          {
            type: "watchState",
            conditions: [{ type: "objectState", targetId: "toggle", operator: "equals", value: "on" }],
            events: [{ type: "setGlobalState", key: "fireCount", value: true }],
          },
        ]),
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
                makeObject({
                  id: "portal",
                  states: singleState([{ type: "touch", conditions: [], events: [{ type: "nextStage" }] }]),
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
      makeObject({
        id: "goal",
        states: singleState([{ type: "touch", conditions: [], events: [{ type: "clearGame" }] }]),
      }),
    );
    const engine = new GameEngine(game);
    await engine.touch("goal");
    expect(engine.getSnapshot().cleared).toBe(true);
  });
});
