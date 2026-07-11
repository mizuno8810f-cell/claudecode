# 脱出ゲーム JSON仕様書

この仕様に従って、脱出ゲームをJSON駆動で実装すること。
以降、部屋・オブジェクト・イベントを追加する際も、このJSONスキーマを変更しないこと。

---

## 1. 全体構造

```json
{
  "gameId": "escape_game_001",
  "title": "脱出ゲーム",
  "initialStageId": "stage_1",
  "initialRoomId": "room_living",
  "stages": [],
  "items": []
}
```

---

## 2. Stage定義

```json
{
  "id": "stage_1",
  "name": "古い部屋からの脱出",
  "rooms": []
}
```

---

## 3. Room定義

```json
{
  "id": "room_living",
  "name": "リビング",
  "background": "images/room_living.png",
  "leftRoomId": "room_entrance",
  "rightRoomId": "room_study",
  "objects": []
}
```

* leftRoomId：左移動先のroomId
* rightRoomId：右移動先のroomId
* 移動先がない場合は null

---

## 4. Object定義

```json
{
  "id": "bookshelf",
  "name": "本棚",
  "type": "object",
  "image": "images/bookshelf.png",
  "visible": true,
  "enabled": true,
  "state": "default",
  "position": {
    "x": 100,
    "y": 200,
    "width": 160,
    "height": 220
  },
  "children": [],
  "triggers": []
}
```

---

## 5. Objectのtype

| type | 説明 |
| --- | --- |
| object | 通常オブジェクト |
| zoom | 拡大表示用オブジェクト |
| item | 取得可能アイテム |
| door | 扉 |
| inputPanel | 暗証番号入力パネル |
| text | メモ・説明文 |

---

## 6. children

オブジェクトの中に別オブジェクトを持たせる場合に使用する。

例：本棚の中に本を置く

```json
{
  "id": "bookshelf",
  "name": "本棚",
  "children": [
    {
      "id": "book",
      "name": "本",
      "type": "object"
    }
  ]
}
```

---

## 7. Trigger定義

```json
{
  "type": "touch",
  "conditions": [],
  "events": []
}
```

---

## 8. Triggerのtype

| type | 説明 |
| --- | --- |
| touch | タッチ時 |
| input | 入力確定時 |
| watchState | 状態変化監視 |
| onBack | 戻る操作時 |

---

## 9. Condition定義

```json
{
  "type": "hasItem",
  "key": "key",
  "operator": "equals",
  "value": true
}
```

---

## 10. Conditionのtype

| type | 説明 |
| --- | --- |
| hasItem | アイテムを持っているか |
| selectedItem | 選択中アイテムか |
| objectState | オブジェクト状態 |
| globalState | グローバル状態 |
| visible | 表示状態 |
| enabled | 操作可能状態 |
| inputValue | 入力値 |

---

## 11. operator

* equals
* notEquals
* includes
* notIncludes
* greaterThan
* lessThan

---

## 12. Event定義

```json
{
  "type": "setObjectState",
  "targetId": "door",
  "value": "open"
}
```

---

## 13. Eventのtype

| type | 説明 |
| --- | --- |
| setObjectState | オブジェクト状態を変更 |
| setGlobalState | グローバル状態を変更 |
| showObject | オブジェクトを表示 |
| hideObject | オブジェクトを非表示 |
| enableObject | 操作可能にする |
| disableObject | 操作不可にする |
| addItem | アイテムを取得 |
| removeItem | アイテムを削除 |
| selectItem | アイテムを選択 |
| clearSelectedItem | 選択中アイテムを解除 |
| navigateRoom | 部屋移動 |
| pushNavigation | 拡大表示へ遷移 |
| popNavigation | 戻る |
| showMessage | メッセージ表示 |
| showImage | 画像表示 |
| playSound | 音再生 |
| nextStage | 次ステージへ |
| clearGame | ゲームクリア |

---

## 14. Item定義

```json
{
  "id": "key",
  "name": "鍵",
  "image": "images/key.png",
  "description": "古い鍵"
}
```

---

## 15. 例：本棚をタッチすると拡大表示

```json
{
  "id": "bookshelf",
  "name": "本棚",
  "type": "object",
  "image": "images/bookshelf.png",
  "visible": true,
  "enabled": true,
  "state": "default",
  "position": {
    "x": 100,
    "y": 180,
    "width": 180,
    "height": 240
  },
  "children": [],
  "triggers": [
    {
      "type": "touch",
      "conditions": [],
      "events": [
        {
          "type": "pushNavigation",
          "targetId": "bookshelf"
        }
      ]
    }
  ]
}
```

---

## 16. 例：鍵を取得する

```json
{
  "id": "key_on_book",
  "name": "鍵",
  "type": "item",
  "image": "images/key.png",
  "visible": true,
  "enabled": true,
  "state": "default",
  "position": {
    "x": 200,
    "y": 250,
    "width": 80,
    "height": 80
  },
  "children": [],
  "triggers": [
    {
      "type": "touch",
      "conditions": [],
      "events": [
        {
          "type": "addItem",
          "itemId": "key"
        },
        {
          "type": "hideObject",
          "targetId": "key_on_book"
        }
      ]
    }
  ]
}
```

---

## 17. 例：鍵を選択中なら扉を開ける

```json
{
  "id": "door",
  "name": "扉",
  "type": "door",
  "image": "images/door.png",
  "visible": true,
  "enabled": true,
  "state": "closed",
  "position": {
    "x": 300,
    "y": 120,
    "width": 160,
    "height": 300
  },
  "children": [],
  "triggers": [
    {
      "type": "touch",
      "conditions": [
        {
          "type": "selectedItem",
          "key": "selectedItemId",
          "operator": "equals",
          "value": "key"
        }
      ],
      "events": [
        {
          "type": "setObjectState",
          "targetId": "door",
          "value": "open"
        },
        {
          "type": "navigateRoom",
          "roomId": "room_study"
        }
      ]
    }
  ]
}
```

---

## 18. 実装ルール

* JSONスキーマは勝手に変更しない
* 追加・修正は既存スキーマに従う
* オブジェクトIDはスネークケース
* roomIdは room_ から始める
* stageIdは stage_ から始める
* itemIdは短く分かりやすくする
* eventsは必ず配列順に直列実行する
* event実行中は操作をロックする
* UIはJSONを描画するだけにし、ゲーム進行ロジックはエンジン側に寄せる
* Reactコンポーネント内に個別謎解きロジックを直接書かない
* 新しいオブジェクトを追加するときは、原則としてJSON追加のみで対応する
