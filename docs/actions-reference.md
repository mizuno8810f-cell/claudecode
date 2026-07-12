# アクション早見表（指示用リファレンス）

ゲームは JSON（`src/data/game.json`）の **Trigger → Condition → Event** で動きます。
指示を出すときは、この語彙で「どのオブジェクトが」「いつ」「何を満たしたら」「何をする」を
指定していただくと、そのまま実装できます。座標は 0〜400 の仮想座標系（開発用「#」グリッド参照）。

---

## 1. Trigger（いつ発火するか）

オブジェクトの **各 state** ごとに `triggers` を持てます。現在の state のトリガーだけが評価されます。

| type | 発火タイミング |
| --- | --- |
| `touch` | そのオブジェクトをタッチしたとき |
| `input` | 入力確定時（touch と同じくタップで発火。確定ボタン等の意味付け用） |
| `watchState` | 状態変化の監視。条件が false→true になった瞬間に一度だけ発火 |
| `onBack` | 「← 戻る」操作時（そのオブジェクトにズーム中のとき） |

- 1つの state に複数トリガーを置け、**条件を満たしたものが上から順に全て実行**されます。
- トリガー構造: `{ "type": ..., "conditions": [ ... ], "events": [ ... ] }`
- `conditions` が空なら常に発火。全条件を満たしたときのみ `events` 実行。
- `events` は配列順に直列実行。実行中は操作ロック。

---

## 2. Condition（実行条件）

`operator`: `equals` / `notEquals` / `includes` / `notIncludes` / `greaterThan` / `lessThan`

| type | フィールド | 意味 |
| --- | --- | --- |
| `hasItem` | `itemId`, `operator`, `value` | アイテム所持しているか（value は通常 true/false） |
| `selectedItem` | `operator`, `value` | 選択中アイテムID（例 value:"key_a"） |
| `objectState` | `targetId`, `operator`, `value` | 対象オブジェクトの state |
| `globalState` | `key`, `operator`, `value` | グローバル変数 |
| `visible` | `targetId`, `operator`, `value` | 表示状態（true/false） |
| `enabled` | `targetId`, `operator`, `value` | 操作可否（true/false） |
| `inputValue` | `targetId`, `operator`, `value` | 入力値（現状は state と同義） |

例: 「鍵Aを選択中なら」→ `{ "type":"selectedItem", "operator":"equals", "value":"key_a" }`

---

## 3. Event（実際のアクション）

| type | フィールド | 動作 |
| --- | --- | --- |
| `setObjectState` | `targetId`, `value` | オブジェクトの state を変更（別部屋のオブジェクトも可） |
| `setGlobalState` | `key`, `value` | グローバル変数を設定 |
| `showObject` | `targetId` | 表示にする |
| `hideObject` | `targetId` | 非表示にする |
| `enableObject` | `targetId` | 操作可能にする |
| `disableObject` | `targetId` | 操作不可にする |
| `addItem` | `itemId` | アイテムボックスに追加（重複は無視） |
| `removeItem` | `itemId` | アイテムを削除 |
| `selectItem` | `itemId` | アイテムを選択状態にする |
| `clearSelectedItem` | （なし） | 選択解除 |
| `navigateRoom` | `roomId` | 部屋移動（ズームは解除される） |
| `pushNavigation` | `targetId` | 対象オブジェクトにズーム（子オブジェクトを表示） |
| `popNavigation` | （なし） | 1階層戻る |
| `showMessage` | `message` | 画面上部にトースト表示（約2.5秒で自動で消える） |
| `showImage` | `image` | 画像オーバーレイ表示（未使用） |
| `playSound` | `soundId` | `sounds/<soundId>.mp3` を再生 |
| `nextStage` | `stageId?`（省略で次） | 次ステージへ |
| `clearGame` | （なし） | ゲームクリア |

---

## 4. オブジェクト定義のポイント

```jsonc
{
  "id": "example_id",              // スネークケース
  "name": "表示名",
  "type": "object",                // object/item/door/decoration/text 等（見た目の分類。挙動は trigger 次第）
  "position": { "x":0,"y":0,"width":100,"height":100 },  // 0〜400 座標系
  "visible": true,                 // 初期表示
  "enabled": true,                 // 初期操作可否
  "defaultState": "default",       // 初期 state
  "states": {
    "default": { "image": null, "children": [], "triggers": [] }
  }
}
```

- **children はID参照**。子に指定したIDは「部屋直下には表示されず」、親に `pushNavigation` でズームしたときだけ表示。
- state ごとに `children`・`triggers`・`image` を切り替えられる。
- `visible:false` のオブジェクトは表示されないが、`pushNavigation` のズーム先や `showObject` の対象にできる。

---

## 5. プレイヤー操作 → エンジンのメソッド（`src/engine/GameEngine.ts`）

UIはこれらを呼ぶだけ。ロジックは全て JSON 側で表現します。

| 操作 | メソッド | 引数 | 挙動 |
| --- | --- | --- | --- |
| オブジェクトをタッチ | `touch(objectId)` | id | 現在 state の `touch`/`input` トリガーを実行 |
| 「← 戻る」 | `back()` | — | ズーム先の `onBack` を実行 → 1階層 pop |
| 部屋移動 | `moveRoom(dir)` | "left"/"right" | leftRoomId/rightRoomId へ移動（ズーム中は不可） |
| インベントリのアイテム押下 | `pressInventoryItem(itemId)` | id | 未選択→選択。選択中に再押下→ `<itemId>_inspect` オブジェクトがあれば小画面ズーム、無ければ選択解除 |
| トーストを消す | `dismissToast()` | — | トーストを即消し |

---

## 6. UI 側の設定（`src/components/RoomStage.tsx`）

コード少量で「部屋やズームの見た目」を制御しているマップ。指示で「このズームは○○風に」と言われたらここを調整します。

- `ZOOM_BACKGROUND_SCENES`: オブジェクトID → ズーム時の背景シーン
  - `"sofa"`（ソファ専用）/ `"plain"`（白背景）/ `"cornerRack"`（白＋中央の折れ目線）/ `"itemInspect"`（暗幕＋小窓ポップアップ）
- `ROOM_BG_VLINES`: 部屋ID → 背景の縦線を引くx座標の配列
- **アイテム拡大表示の規約**: `pressInventoryItem` は `<itemId>_inspect` という id のオブジェクトを小画面ズームします（例: item `hint` → object `hint_inspect`）。

---

## 7. 指示テンプレート例

- 「`workingspace_shelf` をタッチしたら `pushNavigation` で拡大。子に `xxx` を置く」
- 「`safe_confirm` をタッチ、条件 `dial_0..3` が `0/7/1/3` なら `corner_rack_safe` を `open` に、`showMessage`で通知」
- 「`door` をタッチ、`selectedItem == key_a` なら state を `open`、`clearSelectedItem`」
- 「アイテム `memo` を拡大したい → object `memo_inspect`（front/back 状態）を用意して」
