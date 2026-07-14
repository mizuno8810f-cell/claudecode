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
  | { type: "showImage"; image: string }
  | { type: "playSound"; soundId: string }
  | { type: "wait"; ms: number }
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

export interface GameData {
  gameId: string;
  title: string;
  initialStageId: string;
  initialRoomId: string;
  stages: Stage[];
  items: Item[];
}
