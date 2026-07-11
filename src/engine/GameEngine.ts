import type { GameData, GameEvent, GameObject, Item, Room, Trigger } from "./types";
import { evaluateConditions, type ConditionContext } from "./conditions";

export interface ObjectRuntimeState {
  visible: boolean;
  enabled: boolean;
  state: string;
}

export interface EngineSnapshot {
  stageId: string;
  roomId: string;
  navigationStack: string[];
  inventory: string[];
  selectedItemId: string | null;
  globalState: Record<string, unknown>;
  objectStates: Record<string, ObjectRuntimeState>;
  message: string | null;
  image: string | null;
  cleared: boolean;
  locked: boolean;
}

type Listener = () => void;

interface IndexedObject {
  def: GameObject;
  roomId: string;
  stageId: string;
}

const WATCH_STATE_MAX_DEPTH = 10;

/**
 * Executes the JSON-defined game graph. React components only read
 * `getSnapshot()` / `getDisplayedObjects()` and call the public action
 * methods below — no puzzle-specific logic lives outside this class.
 */
export class GameEngine {
  private readonly game: GameData;
  private readonly objectIndex = new Map<string, IndexedObject>();
  private readonly roomIndex = new Map<string, { room: Room; stageId: string }>();
  private readonly itemIndex = new Map<string, Item>();
  private readonly stageOrder: string[] = [];
  private readonly listeners = new Set<Listener>();
  private readonly watchMemory = new Map<string, boolean>();

  private snapshot: EngineSnapshot;
  private messageResolver: (() => void) | null = null;
  private imageResolver: (() => void) | null = null;

  constructor(game: GameData) {
    this.game = game;
    for (const stage of game.stages) {
      this.stageOrder.push(stage.id);
      for (const room of stage.rooms) {
        this.roomIndex.set(room.id, { room, stageId: stage.id });
        this.indexObjects(room.objects, room.id, stage.id);
      }
    }
    for (const item of game.items) this.itemIndex.set(item.id, item);
    this.snapshot = this.buildInitialSnapshot();
  }

  private indexObjects(objects: GameObject[], roomId: string, stageId: string) {
    for (const obj of objects) {
      this.objectIndex.set(obj.id, { def: obj, roomId, stageId });
      if (obj.children.length) this.indexObjects(obj.children, roomId, stageId);
    }
  }

  private buildInitialSnapshot(): EngineSnapshot {
    const objectStates: Record<string, ObjectRuntimeState> = {};
    for (const [id, { def }] of this.objectIndex) {
      objectStates[id] = { visible: def.visible, enabled: def.enabled, state: def.state };
    }
    return {
      stageId: this.game.initialStageId,
      roomId: this.game.initialRoomId,
      navigationStack: [],
      inventory: [],
      selectedItemId: null,
      globalState: {},
      objectStates,
      message: null,
      image: null,
      cleared: false,
      locked: false,
    };
  }

  // -------- Store plumbing --------

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): EngineSnapshot => this.snapshot;

  private emit(patch: Partial<EngineSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }

  private patchObjectState(targetId: string, patch: Partial<ObjectRuntimeState>) {
    const current = this.snapshot.objectStates[targetId];
    if (!current) return;
    this.emit({
      objectStates: {
        ...this.snapshot.objectStates,
        [targetId]: { ...current, ...patch },
      },
    });
  }

  // -------- Read helpers for the UI layer --------

  getGame(): GameData {
    return this.game;
  }

  getItem(itemId: string): Item | undefined {
    return this.itemIndex.get(itemId);
  }

  getObjectDef(objectId: string): GameObject | undefined {
    return this.objectIndex.get(objectId)?.def;
  }

  getObjectState(objectId: string): ObjectRuntimeState | undefined {
    return this.snapshot.objectStates[objectId];
  }

  getCurrentRoom(): Room | undefined {
    return this.roomIndex.get(this.snapshot.roomId)?.room;
  }

  /** Objects currently on screen: room-level objects, or the children of the zoomed-in object. */
  getDisplayedObjects(): GameObject[] {
    const room = this.getCurrentRoom();
    if (!room) return [];
    const stack = this.snapshot.navigationStack;
    if (stack.length === 0) return room.objects;
    const topId = stack[stack.length - 1];
    return this.objectIndex.get(topId)?.def.children ?? [];
  }

  getBackgroundImage(): string | undefined {
    const room = this.getCurrentRoom();
    if (!room) return undefined;
    const stack = this.snapshot.navigationStack;
    if (stack.length === 0) return room.background;
    const topId = stack[stack.length - 1];
    return this.objectIndex.get(topId)?.def.image ?? room.background;
  }

  private conditionContext(): ConditionContext {
    return {
      inventory: this.snapshot.inventory,
      selectedItemId: this.snapshot.selectedItemId,
      globalState: this.snapshot.globalState,
      objectState: (id) => this.snapshot.objectStates[id],
    };
  }

  // -------- Public user actions --------

  async touch(objectId: string): Promise<void> {
    if (this.snapshot.locked || this.snapshot.cleared) return;
    const entry = this.objectIndex.get(objectId);
    if (!entry) return;
    const state = this.snapshot.objectStates[objectId];
    if (!state?.visible || !state?.enabled) return;
    const triggers = entry.def.triggers.filter((t) => t.type === "touch" || t.type === "input");
    await this.runTriggers(triggers);
  }

  async back(): Promise<void> {
    if (this.snapshot.locked || this.snapshot.cleared) return;
    const stack = this.snapshot.navigationStack;
    if (stack.length === 0) return;
    const topId = stack[stack.length - 1];
    const entry = this.objectIndex.get(topId);
    if (entry) {
      const triggers = entry.def.triggers.filter((t) => t.type === "onBack");
      await this.runTriggers(triggers);
    }
    const stillOnTop =
      this.snapshot.navigationStack.length > 0 &&
      this.snapshot.navigationStack[this.snapshot.navigationStack.length - 1] === topId;
    if (stillOnTop) {
      this.emit({ navigationStack: this.snapshot.navigationStack.slice(0, -1) });
    }
  }

  selectInventoryItem(itemId: string): void {
    if (this.snapshot.locked || this.snapshot.cleared) return;
    this.emit({ selectedItemId: this.snapshot.selectedItemId === itemId ? null : itemId });
  }

  moveRoom(direction: "left" | "right"): void {
    if (this.snapshot.locked || this.snapshot.cleared) return;
    if (this.snapshot.navigationStack.length > 0) return;
    const room = this.getCurrentRoom();
    if (!room) return;
    const targetId = direction === "left" ? room.leftRoomId : room.rightRoomId;
    if (!targetId) return;
    this.emit({ roomId: targetId, navigationStack: [] });
  }

  dismissMessage(): void {
    if (!this.snapshot.message) return;
    this.emit({ message: null });
    const resolve = this.messageResolver;
    this.messageResolver = null;
    resolve?.();
  }

  dismissImage(): void {
    if (!this.snapshot.image) return;
    this.emit({ image: null });
    const resolve = this.imageResolver;
    this.imageResolver = null;
    resolve?.();
  }

  // -------- Trigger / event execution --------

  private async runTriggers(triggers: Trigger[]): Promise<void> {
    const matched = triggers.filter((t) => evaluateConditions(t.conditions, this.conditionContext()));
    if (matched.length === 0) return;
    this.emit({ locked: true });
    for (const trigger of matched) {
      await this.runEventList(trigger.events);
    }
    this.emit({ locked: false });
    await this.runWatchStatePass();
  }

  private async runEventList(events: GameEvent[]): Promise<void> {
    for (const event of events) {
      await this.applyEvent(event);
    }
  }

  private applyEvent(event: GameEvent): void | Promise<void> {
    switch (event.type) {
      case "setObjectState":
        this.patchObjectState(event.targetId, { state: event.value });
        return;
      case "setGlobalState":
        this.emit({ globalState: { ...this.snapshot.globalState, [event.key]: event.value } });
        return;
      case "showObject":
        this.patchObjectState(event.targetId, { visible: true });
        return;
      case "hideObject":
        this.patchObjectState(event.targetId, { visible: false });
        return;
      case "enableObject":
        this.patchObjectState(event.targetId, { enabled: true });
        return;
      case "disableObject":
        this.patchObjectState(event.targetId, { enabled: false });
        return;
      case "addItem":
        if (this.snapshot.inventory.includes(event.itemId)) return;
        this.emit({ inventory: [...this.snapshot.inventory, event.itemId] });
        return;
      case "removeItem": {
        const inventory = this.snapshot.inventory.filter((id) => id !== event.itemId);
        const selectedItemId =
          this.snapshot.selectedItemId === event.itemId ? null : this.snapshot.selectedItemId;
        this.emit({ inventory, selectedItemId });
        return;
      }
      case "selectItem":
        this.emit({ selectedItemId: event.itemId });
        return;
      case "clearSelectedItem":
        this.emit({ selectedItemId: null });
        return;
      case "navigateRoom":
        this.emit({ roomId: event.roomId, navigationStack: [] });
        return;
      case "pushNavigation":
        this.emit({ navigationStack: [...this.snapshot.navigationStack, event.targetId] });
        return;
      case "popNavigation":
        this.emit({ navigationStack: this.snapshot.navigationStack.slice(0, -1) });
        return;
      case "showMessage":
        this.emit({ message: event.text });
        return new Promise<void>((resolve) => {
          this.messageResolver = resolve;
        });
      case "showImage":
        this.emit({ image: event.image });
        return new Promise<void>((resolve) => {
          this.imageResolver = resolve;
        });
      case "playSound":
        this.playSound(event.sound);
        return;
      case "nextStage": {
        const currentIndex = this.stageOrder.indexOf(this.snapshot.stageId);
        const targetStageId = event.stageId ?? this.stageOrder[currentIndex + 1];
        const stage = this.game.stages.find((s) => s.id === targetStageId);
        const firstRoom = stage?.rooms[0];
        if (!stage || !firstRoom) return;
        this.emit({ stageId: stage.id, roomId: firstRoom.id, navigationStack: [] });
        return;
      }
      case "clearGame":
        this.emit({ cleared: true });
        return;
    }
  }

  private playSound(src: string) {
    if (typeof Audio === "undefined") return;
    try {
      const audio = new Audio(src);
      void audio.play().catch(() => {});
    } catch {
      // ignore in environments without audio support
    }
  }

  private async runWatchStatePass(depth = 0): Promise<void> {
    if (depth > WATCH_STATE_MAX_DEPTH) return;
    let firedAny = false;
    for (const [objectId, entry] of this.objectIndex) {
      const watchTriggers = entry.def.triggers.filter((t) => t.type === "watchState");
      for (let i = 0; i < watchTriggers.length; i++) {
        const trigger = watchTriggers[i];
        const key = `${objectId}#${i}`;
        const result = evaluateConditions(trigger.conditions, this.conditionContext());
        const previouslyTrue = this.watchMemory.get(key) ?? false;
        if (result && !previouslyTrue) {
          this.watchMemory.set(key, true);
          this.emit({ locked: true });
          await this.runEventList(trigger.events);
          this.emit({ locked: false });
          firedAny = true;
        } else if (!result && previouslyTrue) {
          this.watchMemory.set(key, false);
        }
      }
    }
    if (firedAny) await this.runWatchStatePass(depth + 1);
  }
}
