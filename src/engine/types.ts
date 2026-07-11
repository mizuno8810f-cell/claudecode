export type ObjectType =
  | "object"
  | "zoom"
  | "item"
  | "door"
  | "inputPanel"
  | "text";

export type TriggerType = "touch" | "input" | "watchState" | "onBack";

export type ConditionType =
  | "hasItem"
  | "selectedItem"
  | "objectState"
  | "globalState"
  | "visible"
  | "enabled"
  | "inputValue";

export type Operator =
  | "equals"
  | "notEquals"
  | "includes"
  | "notIncludes"
  | "greaterThan"
  | "lessThan";

export interface Condition {
  type: ConditionType;
  key: string;
  operator: Operator;
  value: unknown;
}

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
  | { type: "showMessage"; text: string }
  | { type: "showImage"; image: string }
  | { type: "playSound"; sound: string }
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

export interface GameObject {
  id: string;
  name: string;
  type: ObjectType;
  image?: string;
  visible: boolean;
  enabled: boolean;
  state: string;
  position: Position;
  children: GameObject[];
  triggers: Trigger[];
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
