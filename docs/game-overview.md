# 脱出ゲーム 全体概要（設計引き継ぎ用）

JSON駆動の脱出ゲーム。UIはJSON(`src/data/game.json`)を描画するだけで、ゲーム進行ロジックは全て
**オブジェクトの state ごとの Trigger→Condition→Event** で表現する。座標は 0〜400 の仮想座標系。

---

## スキーマ（オーサリングの語彙）

### オブジェクト
```jsonc
{
  "id": "snake_case_id",
  "name": "表示名",
  "type": "object|item|door|input_panel|text|decoration", // 見た目分類。挙動はtrigger次第
  "position": { "x":0, "y":0, "width":100, "height":100 }, // 0〜400
  "visible": true, "enabled": true,
  "defaultState": "default",
  "states": {                       // state ごとに children/triggers/image を切替
    "default": { "image": null, "children": [/* 子ID参照 */], "triggers": [/* ↓ */] }
  }
}
```
- **children はID参照**。子に指定したIDは部屋直下に出ず、親に `pushNavigation` でズームした時だけ表示。
- `visible:false` は非表示だが、ズーム先や `showObject` の対象にできる（ズームの入れ物や隠しアイテム）。

### Trigger（いつ発火）
`touch`（タップ） / `input`（確定=タップ扱い） / `watchState`（条件が false→true で1回） / `onBack`（← 戻る操作）
- 現在 state の triggers のみ評価。条件を満たしたものを上から順に全実行。events は配列順に直列実行。

### Condition（実行条件） operator: equals/notEquals/includes/notIncludes/greaterThan/lessThan
`hasItem(itemId)` / `selectedItem` / `objectState(targetId)` / `globalState(key)` / `visible(targetId)` / `enabled(targetId)` / `inputValue(targetId)`

### Event（アクション）
`setObjectState(targetId,value)`（別部屋も可） / `setGlobalState(key,value)` / `showObject` `hideObject` `enableObject` `disableObject(targetId)` /
`addItem` `removeItem` `selectItem(itemId)` `clearSelectedItem` / `navigateRoom(roomId)` `pushNavigation(targetId)` `popNavigation` /
`showMessage(message)`（上部トースト・数秒で自動消滅） / `showImage(image)` / `playSound(soundId)` / `nextStage(stageId?)` / `clearGame`

### プレイヤー操作→エンジン (`src/engine/GameEngine.ts`)
`touch(objectId)` / `back()`（onBack実行→1階層pop） / `moveRoom('left'|'right')` / `pressInventoryItem(itemId)`（未選択→選択, 選択中に再押下→`<itemId>_inspect`があれば小画面ズーム, 無ければ選択解除） / `dismissToast()`

### UI規約 (`src/components/RoomStage.tsx`)
- ズーム背景シーン `ZOOM_BACKGROUND_SCENES`: id→ `sofa`/`plain`(白)/`cornerRack`(白+中央折れ目線)/`itemInspect`(暗幕+小窓ポップアップ)
- 背景の縦線 `ROOM_BG_VLINES`: 部屋id→x座標配列
- アイテム拡大は `<itemId>_inspect` という id のオブジェクトを小画面表示
- 開発モード（ヘッダの#ボタン）: off→#1(id/座標/サイズ)→#2(id/type/state/enabled)。座標グリッド付き。

---

## 部屋構成

- 初期部屋: `room_livingroom`
- **キッチン** `room_kitchen` — 左:`なし` 右:`room_livingroom`
- **リビングルーム** `room_livingroom` — 左:`room_kitchen` 右:`room_workingspace`
- **ワークスペース** `room_workingspace` — 左:`room_livingroom` 右:`なし`
- **ベッドルーム** `room_bedroom` — 左:`なし` 右:`なし`

横移動: キッチン ↔ リビング ↔ ワークスペース。ベッドルームは矢印なし（ワークスペースの扉からのみ入室、寝室の扉でワークスペースに戻る）。

---

## オブジェクト一覧（部屋ごと・挙動付き）

### キッチン `room_kitchen`

- **冷蔵庫** `kitchen_fridge` — type:object, 100×300 @(100,100), default:`default`
  - `default`: children=[ingredient_rice, ingredient_egg, ingredient_ketchup] / touch → pushNavigation(kitchen_fridge)

- **ゴミ箱** `kitchen_trash_can` — type:object, 100×150 @(0,250), default:`default`
  - `default`: children=[kitchen_snack_box] / touch → pushNavigation(kitchen_trash_can)

- **キッチン** `kitchen_counter` — type:object, 100×200 @(300,200), default:`default`
  - `default`: children=[cooking_station, frying_pan] / touch → pushNavigation(kitchen_counter)

- **食器棚** `kitchen_cupboard` — type:decoration, 100×100 @(0,50), default:`default`

- **お菓子の箱** `kitchen_snack_box` — type:object, 120×120 @(140,140), default:`s0`
  - `s0`: touch → showMessage("👦お菓子食べ過ぎ"), setObjectState(kitchen_snack_box=s1)
  - `s1`: touch → showMessage("👦太っちゃうよ？"), setObjectState(kitchen_snack_box=s2)
  - `s2`: touch → showMessage("👩内緒で食べよ")

- **卵** `ingredient_egg` — type:item, 80×140 @(160,130), default:`inactive`
  - `inactive`: touch → showMessage("まだお腹空いてないな")
  - `active`: touch → addItem(egg), hideObject(ingredient_egg), showMessage("卵を手に入れた")

- **ケチャップ** `ingredient_ketchup` — type:item, 80×140 @(280,130), default:`inactive`
  - `inactive`: touch → showMessage("まだお腹空いてないな")
  - `active`: touch → addItem(ketchup), hideObject(ingredient_ketchup), showMessage("ケチャップを手に入れた")

- **調理台** `cooking_station` — type:decoration, 320×150 @(40,230), default:`default`

- **オムライス(拡大)** `omurice_inspect` — type:object, 0×0 @(0,0), default:`default` ⚠visible:false
  - `default`: children=[omurice_text]

- **ケチャップの文字（仮）** `omurice_text` — type:text, 240×100 @(80,150), default:`default`

- **ライス** `ingredient_rice` — type:item, 80×140 @(40,130), default:`inactive`
  - `inactive`: touch → showMessage("まだお腹空いてないな")
  - `active`: touch → addItem(rice), hideObject(ingredient_rice), showMessage("ライスを手に入れた")

- **フライパン** `frying_pan` — type:object, 140×110 @(130,150), default:`empty`
  - `empty`: touch [selectedItem == "rice"] → setObjectState(frying_pan=rice), removeItem(rice), showMessage("ライスを炒めた") / touch [selectedItem != "rice"] → showMessage("うまくいかない気がする")
  - `rice`: touch [selectedItem == "ketchup"] → setObjectState(frying_pan=chicken_rice), showMessage("ケチャップをかけた"), wait, setObjectState(frying_pan=empty2), showMessage("チキンライスが出来上がった") / touch [selectedItem != "ketchup"] → showMessage("うまくいかない気がする")
  - `empty2`: touch [selectedItem == "egg"] → setObjectState(frying_pan=egg), removeItem(egg), showMessage("破れないように慎重に…"), wait, hideObject(frying_pan), showMessage("ちょっと破けちゃったけど完成！"), setObjectState(livingroom_desk=omurice) / touch [selectedItem != "egg"] → showMessage("うまくいかない気がする")

### リビングルーム `room_livingroom`

- **グレーのソファ** `livingroom_sofa` — type:object, 240×144 @(80,256), default:`default`
  - `default`: children=[livingroom_sofa_hint, livingroom_sofa_cushion] / touch → pushNavigation(livingroom_sofa) / onBack → showObject(livingroom_sofa_cushion), hideObject(livingroom_sofa_hint)

- **ヒントアイテム** `livingroom_sofa_hint` — type:item, 60×40 @(93,203), default:`default` ⚠visible:false
  - `default`: touch → addItem(hint), hideObject(livingroom_sofa_hint), showMessage("ヒントアイテムを手に入れた")

- **クッション** `livingroom_sofa_cushion` — type:decoration, 110×110 @(68,168), default:`default`
  - `default`: touch → hideObject(livingroom_sofa_cushion), showObject(livingroom_sofa_hint)

- **机** `livingroom_desk` — type:object, 200×72 @(100,328), default:`default`
  - `default`: children=[livingroom_desk_box, livingroom_desk_tissue] / touch → pushNavigation(livingroom_desk)
  - `omurice`: children=[livingroom_desk_box, livingroom_desk_tissue, omurice_dish] / touch → pushNavigation(livingroom_desk)

- **箱** `livingroom_desk_box` — type:decoration, 70×110 @(223,120), default:`default`

- **ティッシュケース** `livingroom_desk_tissue` — type:decoration, 50×90 @(308,120), default:`default`
  - `default`: touch → showMessage("使ったら捨てましょう")

- **コーナーラック** `livingroom_corner_rack` — type:object, 55×288 @(0,112), default:`default`
  - `default`: children=[cr_shelf_top, cr_shelf_mid, cr_shelf_bottom] / touch → pushNavigation(livingroom_corner_rack)

- **ゴミ箱** `livingroom_trash_can` — type:object, 50×72 @(20,328), default:`default`
  - `default`: children=[livingroom_trash_can_pile] / touch → pushNavigation(livingroom_trash_can)

- **ゴミ** `livingroom_trash_can_pile` — type:decoration, 360×360 @(20,20), default:`default`
  - `default`: touch → showMessage("こちらが深淵を覗いている時、深淵もまたこちらを覗いているのだ")

- **サイドラック** `livingroom_side_rack` — type:decoration, 55×288 @(333,112), default:`default`

- **ヒント(拡大)** `hint_inspect` — type:object, 0×0 @(0,0), default:`front` ⚠visible:false
  - `front`: children=[hint_front_card] / onBack → setObjectState(hint_inspect=front)
  - `back`: children=[hint_0713_text] / onBack → setObjectState(hint_inspect=front)

- **ヒント** `hint_front_card` — type:object, 200×200 @(100,100), default:`default`
  - `default`: touch → setObjectState(hint_inspect=back)

- **0713** `hint_0713_text` — type:text, 200×100 @(100,150), default:`default`
  - `default`: touch → setObjectState(hint_inspect=front)

- **棚(上)** `cr_shelf_top` — type:decoration, 320×100 @(40,30), default:`default`

- **棚(中)** `cr_shelf_mid` — type:object, 320×100 @(40,150), default:`default`
  - `default`: touch → pushNavigation(corner_rack_safe)

- **棚(下)** `cr_shelf_bottom` — type:object, 320×100 @(40,270), default:`default`
  - `default`: children=[cr_figure_1, cr_figure_2, cr_figure_3] / touch → pushNavigation(cr_shelf_bottom)

- **金庫** `corner_rack_safe` — type:object, 0×0 @(0,0), default:`closed` ⚠visible:false
  - `closed`: children=[safe_dial_0, safe_dial_1, safe_dial_2, safe_dial_3, safe_confirm]
  - `open`: children=[safe_key_a]

- **ダイヤル** `safe_dial_0` — type:object, 60×100 @(60,150), default:`0`
  - `0`: touch → setObjectState(safe_dial_0=1)
  - `1`: touch → setObjectState(safe_dial_0=2)
  - `2`: touch → setObjectState(safe_dial_0=3)
  - `3`: touch → setObjectState(safe_dial_0=4)
  - `4`: touch → setObjectState(safe_dial_0=5)
  - `5`: touch → setObjectState(safe_dial_0=6)
  - `6`: touch → setObjectState(safe_dial_0=7)
  - `7`: touch → setObjectState(safe_dial_0=8)
  - `8`: touch → setObjectState(safe_dial_0=9)
  - `9`: touch → setObjectState(safe_dial_0=0)

- **ダイヤル** `safe_dial_1` — type:object, 60×100 @(140,150), default:`0`
  - `0`: touch → setObjectState(safe_dial_1=1)
  - `1`: touch → setObjectState(safe_dial_1=2)
  - `2`: touch → setObjectState(safe_dial_1=3)
  - `3`: touch → setObjectState(safe_dial_1=4)
  - `4`: touch → setObjectState(safe_dial_1=5)
  - `5`: touch → setObjectState(safe_dial_1=6)
  - `6`: touch → setObjectState(safe_dial_1=7)
  - `7`: touch → setObjectState(safe_dial_1=8)
  - `8`: touch → setObjectState(safe_dial_1=9)
  - `9`: touch → setObjectState(safe_dial_1=0)

- **ダイヤル** `safe_dial_2` — type:object, 60×100 @(220,150), default:`0`
  - `0`: touch → setObjectState(safe_dial_2=1)
  - `1`: touch → setObjectState(safe_dial_2=2)
  - `2`: touch → setObjectState(safe_dial_2=3)
  - `3`: touch → setObjectState(safe_dial_2=4)
  - `4`: touch → setObjectState(safe_dial_2=5)
  - `5`: touch → setObjectState(safe_dial_2=6)
  - `6`: touch → setObjectState(safe_dial_2=7)
  - `7`: touch → setObjectState(safe_dial_2=8)
  - `8`: touch → setObjectState(safe_dial_2=9)
  - `9`: touch → setObjectState(safe_dial_2=0)

- **ダイヤル** `safe_dial_3` — type:object, 60×100 @(300,150), default:`0`
  - `0`: touch → setObjectState(safe_dial_3=1)
  - `1`: touch → setObjectState(safe_dial_3=2)
  - `2`: touch → setObjectState(safe_dial_3=3)
  - `3`: touch → setObjectState(safe_dial_3=4)
  - `4`: touch → setObjectState(safe_dial_3=5)
  - `5`: touch → setObjectState(safe_dial_3=6)
  - `6`: touch → setObjectState(safe_dial_3=7)
  - `7`: touch → setObjectState(safe_dial_3=8)
  - `8`: touch → setObjectState(safe_dial_3=9)
  - `9`: touch → setObjectState(safe_dial_3=0)

- **確定** `safe_confirm` — type:object, 100×50 @(150,280), default:`default`
  - `default`: touch [objectState(safe_dial_0) == "0" & objectState(safe_dial_1) == "7" & objectState(safe_dial_2) == "1" & objectState(safe_dial_3) == "3"] → setObjectState(corner_rack_safe=open), showMessage("金庫が開いた")

- **鍵A** `safe_key_a` — type:item, 100×100 @(150,150), default:`default`
  - `default`: touch → addItem(key_a), hideObject(safe_key_a), showMessage("鍵Aを手に入れた")

- **フィギュア1** `cr_figure_1` — type:object, 80×180 @(50,110), default:`default`
  - `default`: touch → showMessage("フィギュア1のセリフ（仮）")

- **フィギュア2** `cr_figure_2` — type:object, 80×180 @(160,110), default:`default`
  - `default`: touch → showMessage("フィギュア2のセリフ（仮）")

- **フィギュア3** `cr_figure_3` — type:object, 80×180 @(270,110), default:`default`
  - `default`: touch → showMessage("フィギュア3のセリフ（仮）")

- **オムライス** `omurice_dish` — type:object, 130×110 @(60,130), default:`incomplete`
  - `incomplete`: touch [selectedItem == "ketchup"] → removeItem(ketchup), setObjectState(omurice_dish=complete), showMessage("ケチャップで文字を書いた") / touch [selectedItem != "ketchup"] → showMessage("ケチャップをかけたほうがよさそうだ")
  - `complete`: touch → pushNavigation(omurice_inspect)

### ワークスペース `room_workingspace`

- **カーテン** `workingspace_curtain` — type:object, 200×200 @(0,100), default:`morningclose`
  - `morningclose`: touch → setObjectState(workingspace_curtain=morningopen)
  - `morningopen`: touch → setObjectState(workingspace_curtain=morningclose)
  - `nightclose`: touch → setObjectState(workingspace_curtain=nightopen)
  - `nightopen`: touch → setObjectState(workingspace_curtain=nightclose)

- **エアコン** `workingspace_aircon` — type:object, 100×50 @(200,0), default:`cold`
  - `cold`: touch → showMessage("👦寒い"), setObjectState(workingspace_aircon=hot)
  - `hot`: touch → showMessage("👩暑い"), setObjectState(workingspace_aircon=cold)

- **棚** `workingspace_shelf` — type:decoration, 80×250 @(220,150), default:`default`

- **仕事机** `workingspace_desk` — type:decoration, 100×150 @(0,250), default:`default`

- **扉** `workingspace_door` — type:door, 80×350 @(320,50), default:`default`
  - `default`: children=[ws_door_panel] / touch → pushNavigation(workingspace_door)

- **扉** `ws_door_panel` — type:door, 300×350 @(50,50), default:`closed`
  - `closed`: touch [selectedItem == "key_a"] → setObjectState(ws_door_panel=open), clearSelectedItem, showMessage("鍵Aで扉が開いた") / touch [selectedItem != "key_a"] → showMessage("鍵がかかっている")
  - `open`: touch → navigateRoom(room_bedroom)

### ベッドルーム `room_bedroom`

- **扉** `bedroom_door` — type:door, 40×350 @(0,50), default:`default`
  - `default`: children=[bedroom_door_panel] / touch → pushNavigation(bedroom_door)

- **窓** `bedroom_window` — type:decoration, 300×230 @(40,20), default:`default`

- **ベッド** `bedroom_bed` — type:object, 270×100 @(40,300), default:`default`
  - `default`: touch → setObjectState(bedroom_bed=sleep) / touch [objectState(workingspace_curtain) == "morningclose"] → setObjectState(workingspace_curtain=nightclose) / touch [objectState(workingspace_curtain) == "morningopen"] → setObjectState(workingspace_curtain=nightopen)
  - `sleep`: touch → setObjectState(bedroom_bed=default) / touch [objectState(workingspace_curtain) == "nightclose"] → setObjectState(workingspace_curtain=morningclose) / touch [objectState(workingspace_curtain) == "nightopen"] → setObjectState(workingspace_curtain=morningopen)

- **ラック** `bedroom_rack` — type:object, 60×80 @(315,320), default:`default`
  - `default`: touch → showMessage("レシピを見つけた：ライスを炒め→ケチャップ→卵で包む"), setObjectState(ingredient_rice=active), setObjectState(ingredient_egg=active), setObjectState(ingredient_ketchup=active)

- **ゴミ箱** `bedroom_trash_can` — type:object, 30×50 @(320,350), default:`default`
  - `default`: touch → showMessage("なんか臭い…")

- **扉** `bedroom_door_panel` — type:door, 300×350 @(50,50), default:`default`
  - `default`: touch → navigateRoom(room_workingspace)

---

## アイテム
- **ヒントアイテム** `hint` — 何かのヒントが書かれている
- **鍵A** `key_a` — 金庫から出てきた鍵
- **レシピ** `recipe` — オムライスの作り方が書かれたメモ
- **卵** `egg` — 冷蔵庫の卵
- **ケチャップ** `ketchup` — 冷蔵庫のケチャップ
- **ライス** `rice` — 冷蔵庫のライス

---

## 実装済みの謎・ギミック

1. **ヒント入手（リビング/ソファ）**: ソファをタップ→ズーム。座席のクッション(`livingroom_sofa_cushion`)をタップするとクッションが消え、下のヒントアイテム(`livingroom_sofa_hint`)が出現。ヒントをタップで取得(inventory)。ソファの `onBack` でクッション復活・ヒント再非表示（未取得なら再挑戦可）。
2. **ヒント拡大＝小画面（0713の確認）**: インベントリでヒントを選択→もう一度押すと小窓ポップアップ(`hint_inspect`)。表面(`hint_front_card`)をタップで裏面に反転し **0713** を表示。← 戻るボタンは1タップで小画面を閉じ、次回は表面にリセット。
3. **金庫（コーナーラック）**: リビングの `livingroom_corner_rack` をタップ→3段の棚。**真ん中の段**(`cr_shelf_mid`)をタップ→金庫(`corner_rack_safe`)。4つのダイヤルで **0713**（0/7/1/3）を合わせ確定(`safe_confirm`)→金庫が open 状態になり中央に鍵A(`safe_key_a`)が出現。鍵Aをタップで取得。
4. **鍵付き扉→寝室（ワークスペース）**: `workingspace_door` をタップ→扉ズーム(白背景, パネル `ws_door_panel`)。**鍵Aを選択**した状態でパネルをタップ→ open。open のパネルをタップ→ `navigateRoom` で寝室へ。
5. **寝室の扉→ワークスペース**: 寝室左端の `bedroom_door`（ワークスペースの扉ズームと同一見た目の別オブジェクト）をタップ→パネル `bedroom_door_panel` をタップでワークスペースに戻る。
6. **カーテン×ベッド（昼夜）**: ワークスペースのカーテン `workingspace_curtain` はタップで open/close トグル。寝室のベッド `bedroom_bed` は default↔sleep トグルで、**sleep 時=night / 起床時=morning**（open/close は保持）。就寝でカーテンが morning→night、起床で night→morning に切替（別部屋への setObjectState）。

### 未実装/メモ
- キッチンの家具（冷蔵庫/食器棚/キッチン/ゴミ箱）はまだ配置のみで謎なし。
- 各部屋の多くの家具は配置のみ（decoration）。ズーム/謎は上記のみ。
- 画像素材は未実装（プレースホルダのボックス＋名前表示）。`image` にパスを入れれば差し替わる。
- クリア条件(`clearGame`)はまだ未接続。
