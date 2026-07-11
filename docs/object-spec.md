# 脱出ゲーム Object JSON仕様

このドキュメントは `docs/json-spec.md` の Object 定義 (4〜6章) を置き換える。
Stage / Room / Item / Trigger / Condition / Event の全体構造は `docs/json-spec.md` のまま有効。

## 基本方針

オブジェクトは、以下の3種類の情報を持つ。

1. オブジェクト全体に共通する情報
2. Stateごとに変化する情報
3. プレイ中に変化するランタイム情報

JSON上では、`visible` や `enabled` は Object 直下に初期値として定義する。
一方、現在の State、表示・非表示、操作可否など、プレイ中に変更された値はエンジン側のランタイム情報で上書きする。

## Object全体構造

```json
{
  "id": "door",
  "name": "扉",
  "type": "object",
  "position": { "x": 820, "y": 180, "width": 180, "height": 380 },
  "visible": true,
  "enabled": true,
  "defaultState": "closed",
  "states": {
    "closed": { "image": "images/door_closed.png", "children": [], "triggers": [] },
    "open": { "image": "images/door_open.png", "children": [], "triggers": [] }
  }
}
```

* `id` / `name` / `type` / `position` / `visible` / `enabled` / `defaultState` — オブジェクト全体に共通する情報と初期値。`type` は分類ラベルであり、挙動は Trigger/Event が決める（本実装では自由文字列として扱う）。
* `states` — オブジェクトが取り得る状態ごとに `image` / `children` / `triggers` を保持するマップ。`defaultState` は `states` のいずれかのキーを指す。
* `children` は子オブジェクトの ID 参照の配列（インライン定義ではない）。子オブジェクトは同じ Room の `objects` 配列に、通常のトップレベルの Object としてそれぞれ定義する。あるオブジェクトIDがいずれかの State の `children` に一度でも現れると、そのオブジェクトは Room 直下（ズームしていない状態）には表示されなくなり、親オブジェクトがナビゲーションスタックの先頭にあるときにのみ表示される。
* 現在の State そのものはゲーム定義JSONに保持せず、エンジン側のランタイム情報（`objectRuntime`）で管理する。

## ランタイム情報

```json
{
  "objectRuntime": {
    "door": { "state": "open", "visible": true, "enabled": true },
    "small_key": { "state": "default", "visible": false, "enabled": true }
  }
}
```

初期化ルール：

```
state   = object.defaultState
visible = object.visible
enabled = object.enabled
```

値の取得ルールは常にランタイム優先。

## エンジンの処理順

1. Object定義を取得する
2. `objectRuntime` から現在値（state / visible / enabled）を取得する
3. `visible` が false なら描画しない
4. 現在の State (`states[currentState]`) を取得する
5. その State の `image` を描画する
6. その State の `children` を描画する（対象IDを解決して同様に処理する）
7. `enabled` が true の場合のみ Trigger を受け付ける（その State の `triggers` から評価する）

## この実装での差分メモ

* `Condition` はイベントの `targetId` 系命名に合わせて型ごとにフィールドを分けている：
  `hasItem.itemId` / `selectedItem`（キーなし）/ `objectState.targetId` / `globalState.key` / `visible.targetId` / `enabled.targetId` / `inputValue.targetId`。
* `Event.showMessage` は `message` フィールド、`Event.playSound` は `soundId` フィールドを使う（`sounds/${soundId}.mp3` を再生する規約）。
