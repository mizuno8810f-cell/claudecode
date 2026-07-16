import type { GameData, GameEvent, GameObject, Item, ObjectState, Room, Trigger } from "./types";
import { evaluateConditions, type ConditionContext } from "./conditions";
import { assetUrl } from "../assets";

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
  toast: string | null;
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

const EMPTY_STATE: ObjectState = { image: undefined, children: [], triggers: [] };
const WATCH_STATE_MAX_DEPTH = 10;

/**
 * Executes the JSON-defined game graph. React components only read
 * `getSnapshot()` / `getDisplayedObjects()` and call the public action
 * methods below — no puzzle-specific logic lives outside this class.
 *
 * Objects are flat within a room: a state's `children` are id references
 * into that same flat object list, not inline nested definitions. An
 * object counts as "root" (shown directly in the room) unless some other
 * object's state lists it as a child.
 */
export class GameEngine {
  private readonly game: GameData;
  private readonly objectIndex = new Map<string, IndexedObject>();
  private readonly roomIndex = new Map<string, { room: Room; stageId: string }>();
  private readonly itemIndex = new Map<string, Item>();
  private readonly rootObjectIds = new Set<string>();
  private readonly stageOrder: string[] = [];
  private readonly listeners = new Set<Listener>();
  private readonly watchMemory = new Map<string, boolean>();

  private snapshot: EngineSnapshot;
  private imageResolver: (() => void) | null = null;
  private toastSeq = 0;
  private readonly toastDurationMs = 2500;

  constructor(game: GameData) {
    this.game = game;
    for (const stage of game.stages) {
      this.stageOrder.push(stage.id);
      for (const room of stage.rooms) {
        this.roomIndex.set(room.id, { room, stageId: stage.id });
        for (const obj of room.objects) {
          this.objectIndex.set(obj.id, { def: obj, roomId: room.id, stageId: stage.id });
          this.rootObjectIds.add(obj.id);
        }
      }
    }
    for (const [, { def }] of this.objectIndex) {
      for (const state of Object.values(def.states)) {
        for (const childId of state.children) this.rootObjectIds.delete(childId);
      }
    }
    for (const item of game.items) this.itemIndex.set(item.id, item);
    this.snapshot = this.buildInitialSnapshot();
  }

  private buildInitialSnapshot(): EngineSnapshot {
    const objectStates: Record<string, ObjectRuntimeState> = {};
    for (const [id, { def }] of this.objectIndex) {
      objectStates[id] = { visible: def.visible, enabled: def.enabled, state: def.defaultState };
    }
    return {
      stageId: this.game.initialStageId,
      roomId: this.game.initialRoomId,
      navigationStack: [],
      inventory: [],
      selectedItemId: null,
      globalState: {},
      objectStates,
      toast: null,
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

  /** Data-driven configuration (exclusion lists, projector video, ...). */
  getConfig(): NonNullable<GameData["config"]> {
    return this.game.config ?? {};
  }

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

  /** Resolves the state slice (image/children/triggers) an object is currently in. */
  private getCurrentObjectState(objectId: string): ObjectState {
    const def = this.objectIndex.get(objectId)?.def;
    if (!def) return EMPTY_STATE;
    const stateKey = this.snapshot.objectStates[objectId]?.state ?? def.defaultState;
    return def.states[stateKey] ?? def.states[def.defaultState] ?? EMPTY_STATE;
  }

  getCurrentImage(objectId: string): string | undefined {
    return this.getCurrentObjectState(objectId).image;
  }

  getCurrentRoom(): Room | undefined {
    return this.roomIndex.get(this.snapshot.roomId)?.room;
  }

  /** Objects currently on screen: room-level root objects, or the current state's children. */
  getDisplayedObjects(): GameObject[] {
    const room = this.getCurrentRoom();
    if (!room) return [];
    const stack = this.snapshot.navigationStack;
    if (stack.length === 0) {
      return room.objects.filter((o) => this.rootObjectIds.has(o.id));
    }
    const topId = stack[stack.length - 1];
    const childIds = this.getCurrentObjectState(topId).children;
    return childIds
      .map((id) => this.objectIndex.get(id)?.def)
      .filter((def): def is GameObject => def !== undefined);
  }

  getBackgroundImage(): string | undefined {
    const room = this.getCurrentRoom();
    if (!room) return undefined;
    const stack = this.snapshot.navigationStack;
    if (stack.length === 0) return room.background;
    const topId = stack[stack.length - 1];
    return this.getCurrentObjectState(topId).image ?? room.background;
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
    if (!this.objectIndex.has(objectId)) return;
    const state = this.snapshot.objectStates[objectId];
    if (!state?.visible || !state?.enabled) return;
    const triggers = this.getCurrentObjectState(objectId).triggers.filter(
      (t) => t.type === "touch" || t.type === "input",
    );
    if (triggers.length > 0) this.playSoundKey("touch");
    await this.runTriggers(triggers);
  }

  async back(): Promise<void> {
    if (this.snapshot.locked || this.snapshot.cleared) return;
    const stack = this.snapshot.navigationStack;
    if (stack.length === 0) return;
    const topId = stack[stack.length - 1];
    if (this.objectIndex.has(topId)) {
      const triggers = this.getCurrentObjectState(topId).triggers.filter((t) => t.type === "onBack");
      await this.runTriggers(triggers);
    }
    const stillOnTop =
      this.snapshot.navigationStack.length > 0 &&
      this.snapshot.navigationStack[this.snapshot.navigationStack.length - 1] === topId;
    if (stillOnTop) {
      this.emit({ navigationStack: this.snapshot.navigationStack.slice(0, -1) });
      this.playSoundKey("zoomBack");
    }
  }

  selectInventoryItem(itemId: string): void {
    if (this.snapshot.locked || this.snapshot.cleared) return;
    this.emit({ selectedItemId: this.snapshot.selectedItemId === itemId ? null : itemId });
  }

  /**
   * Inventory tap: first tap selects; tapping an already-selected item opens
   * its close-up if an inspect object exists (an object whose id is
   * `${itemId}_inspect`), otherwise deselects. The inspect object is zoomed
   * via the normal navigation stack, so back/flip reuse existing behavior.
   */
  pressInventoryItem(itemId: string): void {
    if (this.snapshot.locked || this.snapshot.cleared) return;
    if (this.snapshot.selectedItemId !== itemId) {
      this.emit({ selectedItemId: itemId });
      return;
    }
    const inspectId = `${itemId}_inspect`;
    if (this.objectIndex.has(inspectId)) {
      this.emit({ navigationStack: [...this.snapshot.navigationStack, inspectId] });
      return;
    }
    this.emit({ selectedItemId: null });
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

  /** Fire-and-forget toast: shows briefly at the top, then auto-clears. */
  private showToast(text: string): void {
    const seq = ++this.toastSeq;
    this.emit({ toast: text });
    setTimeout(() => {
      if (this.toastSeq === seq) this.emit({ toast: null });
    }, this.toastDurationMs);
  }

  dismissToast(): void {
    this.toastSeq++;
    if (this.snapshot.toast) this.emit({ toast: null });
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
        this.playSoundKey("itemGet");
        return;
      case "removeItem": {
        const inventory = this.snapshot.inventory.filter((id) => id !== event.itemId);
        const selectedItemId =
          this.snapshot.selectedItemId === event.itemId ? null : this.snapshot.selectedItemId;
        this.emit({ inventory, selectedItemId });
        this.playSoundKey("itemUse");
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
        this.playSoundKey("doorOpen");
        return;
      case "pushNavigation":
        this.emit({ navigationStack: [...this.snapshot.navigationStack, event.targetId] });
        this.playSoundKey(
          event.targetId === "projector_video" ? "videoStart"
            : event.targetId === "projector_confirm" ? "popupOpen"
              : "zoomIn",
        );
        return;
      case "popNavigation":
        this.emit({ navigationStack: this.snapshot.navigationStack.slice(0, -1) });
        this.playSoundKey("zoomBack");
        return;
      case "showMessage":
        this.showToast(event.message);
        return;
      case "showRandomMessage": {
        const list = event.messages;
        if (list.length > 0) this.showToast(list[Math.floor(Math.random() * list.length)]);
        return;
      }
      case "showImage":
        this.emit({ image: event.image });
        return new Promise<void>((resolve) => {
          this.imageResolver = resolve;
        });
      case "playSound":
        this.playSoundKey(event.soundId);
        return;
      case "wait":
        // Pause the event sequence (input stays locked) for a timed transition.
        return new Promise<void>((resolve) => setTimeout(resolve, event.ms));
      case "nextStage": {
        const currentIndex = this.stageOrder.indexOf(this.snapshot.stageId);
        const targetStageId = event.stageId ?? this.stageOrder[currentIndex + 1];
        const stage = this.game.stages.find((s) => s.id === targetStageId);
        const firstRoom = stage?.rooms[0];
        if (!stage || !firstRoom) return;
        this.emit({ stageId: stage.id, roomId: firstRoom.id, navigationStack: [] });
        return;
      }
      case "disableAllExcept": {
        const keep = new Set(this.getConfig().disableExclusionObjectIds ?? []);
        const objectStates = { ...this.snapshot.objectStates };
        for (const id of this.objectIndex.keys()) {
          if (keep.has(id)) continue;
          const current = objectStates[id];
          if (current) objectStates[id] = { ...current, enabled: false };
        }
        this.emit({ objectStates });
        return;
      }
      case "clearGame":
        this.emit({ cleared: true });
        this.playSoundKey("clear");
        return;
    }
  }

  /**
   * Play a sound effect for an action key. The file comes from
   * config.sounds[key] (data-driven, swappable), falling back to
   * sounds/<key>.mp3. Missing files fail silently.
   */
  private playSoundKey(key: string) {
    if (typeof Audio === "undefined") return;
    const file = assetUrl(this.getConfig().sounds?.[key] ?? `sounds/${key}.mp3`);
    try {
      const audio = new Audio(file);
      void audio.play().catch(() => {});
    } catch {
      // ignore in environments without audio support
    }
  }

  private async runWatchStatePass(depth = 0): Promise<void> {
    if (depth > WATCH_STATE_MAX_DEPTH) return;
    let firedAny = false;
    for (const objectId of this.objectIndex.keys()) {
      const stateKey = this.snapshot.objectStates[objectId]?.state ?? "";
      const watchTriggers = this.getCurrentObjectState(objectId).triggers.filter(
        (t) => t.type === "watchState",
      );
      for (let i = 0; i < watchTriggers.length; i++) {
        const trigger = watchTriggers[i];
        const key = `${objectId}#${stateKey}#${i}`;
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
