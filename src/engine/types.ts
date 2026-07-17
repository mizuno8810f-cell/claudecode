/**
 * Object "type" is descriptive only — Trigger/Event/Condition drive all
 * behavior, so it is intentionally left open rather than a closed union.
 * Conventional values: object, item, door, input_panel, text, decoration.
 */
export type ObjectType = string;

export type TriggerType = "touch" | "input" | "watchState" | "onBack";

export type Operator =
  | "equals"
  | "notEquals"
  | "includes"
  | "notIncludes"
  | "greaterThan"
  | "lessThan";

export type Condition =
  | { type: "hasItem"; itemId: string; operator: Operator; value: unknown }
  | { type: "selectedItem"; operator: Operator; value: unknown }
  | { type: "objectState"; targetId: string; operator: Operator; value: unknown }
  | { type: "globalState"; key: string; operator: Operator; value: unknown }
  | { type: "visible"; targetId: string; operator: Operator; value: unknown }
  | { type: "enabled"; targetId: string; operator: Operator; value: unknown }
  | { type: "inputValue"; targetId: string; operator: Operator; value: unknown };

export type GameEvent =
  | { type: "setObjectState"; targetId: string; value: string }
  | { type: "setGlobalState"; key: string; value: unknown }
  // Increment a numeric global (default +1); used for attempt/touch counters.
  | { type: "incrementGlobal"; key: string; by?: number }
  | { type: "showObject"; targetId: string }
  | { type: "hideObject"; targetId: string }
  | { type: "enableObject"; targetId: string }
  | { type: "disableObject"; targetId: string }
  | { type: "addItem"; itemId: string }
  | { type: "removeItem"; itemId: string }
  | { type: "selectItem"; itemId: string }
  | { type: "clearSelectedItem" }
  | { type: "navigateRoom"; roomId: string }
  | { type: "pushNavigation"; targetId: string }
  | { type: "popNavigation" }
  | { type: "showMessage"; message: string }
  // Show one message picked at random from the list (as a toast) each time.
  | { type: "showRandomMessage"; messages: string[] }
  | { type: "showImage"; image: string }
  | { type: "playSound"; soundId: string }
  | { type: "wait"; ms: number }
  // Disable every object except those in config.disableExclusionObjectIds
  // (used by the projector black-out event). Sets runtime enabled = false.
  | { type: "disableAllExcept" }
  | { type: "nextStage"; stageId?: string }
  | { type: "clearGame" };

export interface Trigger {
  type: TriggerType;
  conditions: Condition[];
  events: GameEvent[];
}

export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** State-specific slice of an object: image, visible children, and behavior. */
export interface ObjectState {
  image?: string;
  children: string[];
  triggers: Trigger[];
}

/**
 * Object-wide info (id/name/type/position/visible/enabled/defaultState) plus
 * a `states` map holding everything that changes per state. The *current*
 * state, visible, and enabled are runtime concerns owned by the engine, not
 * this definition — see GameEngine's ObjectRuntimeState.
 */
export interface GameObject {
  id: string;
  name: string;
  type: ObjectType;
  position: Position;
  visible: boolean;
  enabled: boolean;
  defaultState: string;
  states: Record<string, ObjectState>;
}

export interface Room {
  id: string;
  name: string;
  background: string;
  leftRoomId: string | null;
  rightRoomId: string | null;
  objects: GameObject[];
}

export interface Stage {
  id: string;
  name: string;
  rooms: Room[];
}

export interface Item {
  id: string;
  name: string;
  image: string;
  description: string;
}

/**
 * Optional data-driven configuration consumed by the UI and a few events, so
 * gimmick-specific ids/paths live in game data rather than being hard-coded in
 * components. All fields optional for backwards compatibility.
 */
export interface GameConfig {
  /** Video played by the projector overlay; swap the file, not the code. */
  projectorVideo?: string;
  /** Message shown on the projector confirm dialog. */
  projectorConfirmMessage?: string;
  /** Objects that keep normal/lit brightness while roomDarkMode is on. */
  darkModeExclusionObjectIds?: string[];
  /** Objects that stay enabled when a "disableAllExcept" event fires. */
  disableExclusionObjectIds?: string[];
  /** Full-screen background art for the title screen (empty = none). */
  titleImage?: string;
  /** Full-screen image the clear screen fades into. */
  clearImage?: string;
  /** Objects that glow (light-up) while roomDarkMode is on, whatever state
   * they are in (e.g. the present box, which stays in its puzzle state). */
  lightUpObjectIds?: string[];
  /** Extra line appended to the projector confirm message on replays only. */
  projectorReplayNote?: string;
  /**
   * Sound-effect files by action key (e.g. touch, itemGet, zoomIn). Values are
   * asset paths; swap the files to change the SE. Missing files fail silently.
   */
  sounds?: Record<string, string>;
}

export interface GameData {
  gameId: string;
  title: string;
  initialStageId: string;
  initialRoomId: string;
  stages: Stage[];
  items: Item[];
  config?: GameConfig;
}
