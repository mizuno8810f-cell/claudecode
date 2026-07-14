# 画像アセット挿入ガイド

## やり方（挿入の口）

1. 画像の指定先は **各オブジェクトの state の `image` フィールド**（`src/data/game.json`）。
   部屋の背景は各 room の `background`、アイテムのアイコンは各 item の `image`。**すべて設定済み**。
2. PNG を **`public/images/`** に、下記の名前で置くだけ。プレースホルダから実画像に自動で切り替わる。
   （パスは GitHub Pages の base `/claudecode/` 込みで自動解決。ファイルが無ければ従来の名前ラベル表示のまま）
3. state を持つオブジェクトは **state ごとに別画像**（例: カーテンの朝/夜・開/閉、扉の開閉、調理の各段階）。
4. ダイヤル(safe_dial_0〜3)は数字が同じなので **`dial_0.png`〜`dial_9.png` を4つのダイヤルで共有**。

命名規則: 単一stateは `images/<id>.png`、複数stateは `images/<id>__<state>.png`。

---

## 必要ファイル一覧

### 部屋背景 (room.background)
- `images/room_kitchen.png`  （キッチン）
- `images/room_livingroom.png`  （リビングルーム）
- `images/room_workingspace.png`  （ワークスペース）
- `images/room_bedroom.png`  （ベッドルーム）

### アイテムアイコン (item.image)
- `images/hint.png`  （ヒントアイテム）
- `images/key_a.png`  （鍵A）
- `images/recipe.png`  （レシピ）
- `images/egg.png`  （卵）
- `images/ketchup.png`  （ケチャップ）
- `images/rice.png`  （ライス）

### オブジェクト (state ごと)
#### キッチン `room_kitchen`
- `images/kitchen_fridge.png`  （冷蔵庫）
- `images/kitchen_trash_can.png`  （ゴミ箱）
- `images/kitchen_counter.png`  （キッチン）
- `images/kitchen_cupboard.png`  （食器棚）
- `images/kitchen_snack_box__s0.png`  （お菓子の箱 state:s0）
- `images/kitchen_snack_box__s1.png`  （お菓子の箱 state:s1）
- `images/kitchen_snack_box__s2.png`  （お菓子の箱 state:s2）
- `images/ingredient_egg__inactive.png`  （卵 state:inactive）
- `images/ingredient_egg__active.png`  （卵 state:active）
- `images/ingredient_ketchup__inactive.png`  （ケチャップ state:inactive）
- `images/ingredient_ketchup__active.png`  （ケチャップ state:active）
- `images/cooking_station.png`  （調理台）
- `images/omurice_text.png`  （ケチャップの文字（仮））
- `images/ingredient_rice__inactive.png`  （ライス state:inactive）
- `images/ingredient_rice__active.png`  （ライス state:active）
- `images/frying_pan__empty.png`  （フライパン state:empty）
- `images/frying_pan__rice.png`  （フライパン state:rice）
- `images/frying_pan__chicken_rice.png`  （フライパン state:chicken_rice）
- `images/frying_pan__empty2.png`  （フライパン state:empty2）
- `images/frying_pan__egg.png`  （フライパン state:egg）

#### リビングルーム `room_livingroom`
- `images/livingroom_sofa.png`  （グレーのソファ）
- `images/livingroom_sofa_cushion.png`  （クッション）
- `images/livingroom_desk.png`  （机 state:default）
- `images/livingroom_desk.png`  （机 state:omurice）
- `images/livingroom_desk_box.png`  （箱）
- `images/livingroom_desk_tissue.png`  （ティッシュケース）
- `images/livingroom_corner_rack.png`  （コーナーラック）
- `images/livingroom_trash_can.png`  （ゴミ箱）
- `images/livingroom_trash_can_pile.png`  （ゴミ）
- `images/livingroom_side_rack.png`  （サイドラック）
- `images/hint_front_card.png`  （ヒント）
- `images/hint_0713_text.png`  （0713）
- `images/cr_shelf_top.png`  （棚(上)）
- `images/cr_shelf_mid.png`  （棚(中)）
- `images/cr_shelf_bottom.png`  （棚(下)）
- `images/dial_0.png`  （ダイヤル 数字0・4つで共有）
- `images/dial_1.png`  （ダイヤル 数字1・4つで共有）
- `images/dial_2.png`  （ダイヤル 数字2・4つで共有）
- `images/dial_3.png`  （ダイヤル 数字3・4つで共有）
- `images/dial_4.png`  （ダイヤル 数字4・4つで共有）
- `images/dial_5.png`  （ダイヤル 数字5・4つで共有）
- `images/dial_6.png`  （ダイヤル 数字6・4つで共有）
- `images/dial_7.png`  （ダイヤル 数字7・4つで共有）
- `images/dial_8.png`  （ダイヤル 数字8・4つで共有）
- `images/dial_9.png`  （ダイヤル 数字9・4つで共有）
- `images/safe_confirm.png`  （確定）
- `images/safe_key_a.png`  （鍵A）
- `images/cr_figure_1.png`  （フィギュア1）
- `images/cr_figure_2.png`  （フィギュア2）
- `images/cr_figure_3.png`  （フィギュア3）
- `images/omurice_dish__incomplete.png`  （オムライス state:incomplete）
- `images/omurice_dish__complete.png`  （オムライス state:complete）

#### ワークスペース `room_workingspace`
- `images/workingspace_curtain__morningclose.png`  （カーテン state:morningclose）
- `images/workingspace_curtain__morningopen.png`  （カーテン state:morningopen）
- `images/workingspace_curtain__nightclose.png`  （カーテン state:nightclose）
- `images/workingspace_curtain__nightopen.png`  （カーテン state:nightopen）
- `images/workingspace_aircon__cold.png`  （エアコン state:cold）
- `images/workingspace_aircon__hot.png`  （エアコン state:hot）
- `images/workingspace_shelf.png`  （棚）
- `images/workingspace_desk.png`  （仕事机）
- `images/workingspace_door.png`  （扉）
- `images/ws_door_panel__closed.png`  （扉 state:closed）
- `images/ws_door_panel__open.png`  （扉 state:open）
- `images/workspace_pc__inactive.png`  （PC state:inactive）
- `images/workspace_pc__active_morning.png`  （PC state:active_morning）
- `images/workspace_pc__active_night.png`  （PC state:active_night）
- `images/password_char__active_blank.png`  （パスワード1文字目 state:active_blank）
- `images/password_char__inactive_blank.png`  （パスワード1文字目 state:inactive_blank）
- `images/password_char__active_a.png`  （パスワード1文字目 state:active_a）
- `images/password_char__inactive_a.png`  （パスワード1文字目 state:inactive_a）
- `images/password_char__active_ya.png`  （パスワード1文字目 state:active_ya）
- `images/password_char__inactive_ya.png`  （パスワード1文字目 state:inactive_ya）
- `images/password_char__active_n.png`  （パスワード1文字目 state:active_n）
- `images/password_char__inactive_n.png`  （パスワード1文字目 state:inactive_n）
- `images/password_char__active_to.png`  （パスワード1文字目 state:active_to）
- `images/password_char__inactive_to.png`  （パスワード1文字目 state:inactive_to）
- `images/password_char__active_o.png`  （パスワード1文字目 state:active_o）
- `images/password_char__inactive_o.png`  （パスワード1文字目 state:inactive_o）
- `images/password_char__active_ta.png`  （パスワード1文字目 state:active_ta）
- `images/password_char__inactive_ta.png`  （パスワード1文字目 state:inactive_ta）
- `images/password_char__active_ha.png`  （パスワード1文字目 state:active_ha）
- `images/password_char__inactive_ha.png`  （パスワード1文字目 state:inactive_ha）
- `images/password_char__active_smile.png`  （パスワード1文字目 state:active_smile）
- `images/password_char__inactive_smile.png`  （パスワード1文字目 state:inactive_smile）
- `images/password_char__active_skull.png`  （パスワード1文字目 state:active_skull）
- `images/password_char__inactive_skull.png`  （パスワード1文字目 state:inactive_skull）
- `images/password_char__active_apple.png`  （パスワード1文字目 state:active_apple）
- `images/password_char__inactive_apple.png`  （パスワード1文字目 state:inactive_apple）
- `images/password_char__active_blank.png`  （パスワード2文字目 state:active_blank）
- `images/password_char__inactive_blank.png`  （パスワード2文字目 state:inactive_blank）
- `images/password_char__active_a.png`  （パスワード2文字目 state:active_a）
- `images/password_char__inactive_a.png`  （パスワード2文字目 state:inactive_a）
- `images/password_char__active_ya.png`  （パスワード2文字目 state:active_ya）
- `images/password_char__inactive_ya.png`  （パスワード2文字目 state:inactive_ya）
- `images/password_char__active_n.png`  （パスワード2文字目 state:active_n）
- `images/password_char__inactive_n.png`  （パスワード2文字目 state:inactive_n）
- `images/password_char__active_to.png`  （パスワード2文字目 state:active_to）
- `images/password_char__inactive_to.png`  （パスワード2文字目 state:inactive_to）
- `images/password_char__active_o.png`  （パスワード2文字目 state:active_o）
- `images/password_char__inactive_o.png`  （パスワード2文字目 state:inactive_o）
- `images/password_char__active_ta.png`  （パスワード2文字目 state:active_ta）
- `images/password_char__inactive_ta.png`  （パスワード2文字目 state:inactive_ta）
- `images/password_char__active_ha.png`  （パスワード2文字目 state:active_ha）
- `images/password_char__inactive_ha.png`  （パスワード2文字目 state:inactive_ha）
- `images/password_char__active_smile.png`  （パスワード2文字目 state:active_smile）
- `images/password_char__inactive_smile.png`  （パスワード2文字目 state:inactive_smile）
- `images/password_char__active_skull.png`  （パスワード2文字目 state:active_skull）
- `images/password_char__inactive_skull.png`  （パスワード2文字目 state:inactive_skull）
- `images/password_char__active_apple.png`  （パスワード2文字目 state:active_apple）
- `images/password_char__inactive_apple.png`  （パスワード2文字目 state:inactive_apple）
- `images/password_char__active_blank.png`  （パスワード3文字目 state:active_blank）
- `images/password_char__inactive_blank.png`  （パスワード3文字目 state:inactive_blank）
- `images/password_char__active_a.png`  （パスワード3文字目 state:active_a）
- `images/password_char__inactive_a.png`  （パスワード3文字目 state:inactive_a）
- `images/password_char__active_ya.png`  （パスワード3文字目 state:active_ya）
- `images/password_char__inactive_ya.png`  （パスワード3文字目 state:inactive_ya）
- `images/password_char__active_n.png`  （パスワード3文字目 state:active_n）
- `images/password_char__inactive_n.png`  （パスワード3文字目 state:inactive_n）
- `images/password_char__active_to.png`  （パスワード3文字目 state:active_to）
- `images/password_char__inactive_to.png`  （パスワード3文字目 state:inactive_to）
- `images/password_char__active_o.png`  （パスワード3文字目 state:active_o）
- `images/password_char__inactive_o.png`  （パスワード3文字目 state:inactive_o）
- `images/password_char__active_ta.png`  （パスワード3文字目 state:active_ta）
- `images/password_char__inactive_ta.png`  （パスワード3文字目 state:inactive_ta）
- `images/password_char__active_ha.png`  （パスワード3文字目 state:active_ha）
- `images/password_char__inactive_ha.png`  （パスワード3文字目 state:inactive_ha）
- `images/password_char__active_smile.png`  （パスワード3文字目 state:active_smile）
- `images/password_char__inactive_smile.png`  （パスワード3文字目 state:inactive_smile）
- `images/password_char__active_skull.png`  （パスワード3文字目 state:active_skull）
- `images/password_char__inactive_skull.png`  （パスワード3文字目 state:inactive_skull）
- `images/password_char__active_apple.png`  （パスワード3文字目 state:active_apple）
- `images/password_char__inactive_apple.png`  （パスワード3文字目 state:inactive_apple）
- `images/password_char__active_blank.png`  （パスワード4文字目 state:active_blank）
- `images/password_char__inactive_blank.png`  （パスワード4文字目 state:inactive_blank）
- `images/password_char__active_a.png`  （パスワード4文字目 state:active_a）
- `images/password_char__inactive_a.png`  （パスワード4文字目 state:inactive_a）
- `images/password_char__active_ya.png`  （パスワード4文字目 state:active_ya）
- `images/password_char__inactive_ya.png`  （パスワード4文字目 state:inactive_ya）
- `images/password_char__active_n.png`  （パスワード4文字目 state:active_n）
- `images/password_char__inactive_n.png`  （パスワード4文字目 state:inactive_n）
- `images/password_char__active_to.png`  （パスワード4文字目 state:active_to）
- `images/password_char__inactive_to.png`  （パスワード4文字目 state:inactive_to）
- `images/password_char__active_o.png`  （パスワード4文字目 state:active_o）
- `images/password_char__inactive_o.png`  （パスワード4文字目 state:inactive_o）
- `images/password_char__active_ta.png`  （パスワード4文字目 state:active_ta）
- `images/password_char__inactive_ta.png`  （パスワード4文字目 state:inactive_ta）
- `images/password_char__active_ha.png`  （パスワード4文字目 state:active_ha）
- `images/password_char__inactive_ha.png`  （パスワード4文字目 state:inactive_ha）
- `images/password_char__active_smile.png`  （パスワード4文字目 state:active_smile）
- `images/password_char__inactive_smile.png`  （パスワード4文字目 state:inactive_smile）
- `images/password_char__active_skull.png`  （パスワード4文字目 state:active_skull）
- `images/password_char__inactive_skull.png`  （パスワード4文字目 state:inactive_skull）
- `images/password_char__active_apple.png`  （パスワード4文字目 state:active_apple）
- `images/password_char__inactive_apple.png`  （パスワード4文字目 state:inactive_apple）
- `images/workspace_btn_hira.png`  （ひらがな入力ボタン）
- `images/workspace_btn_symbol.png`  （記号入力ボタン）
- `images/workspace_btn_enter.png`  （Enterボタン）

#### ベッドルーム `room_bedroom`
- `images/bedroom_door.png`  （扉）
- `images/bedroom_window.png`  （窓）
- `images/bedroom_bed__default.png`  （ベッド state:default）
- `images/bedroom_bed__sleep.png`  （ベッド state:sleep）
- `images/bedroom_rack.png`  （ラック）
- `images/bedroom_trash_can.png`  （ゴミ箱）
- `images/bedroom_door_panel.png`  （扉）

> 注: `visible:false` のズーム入れ物（hint_inspect / corner_rack_safe / omurice_inspect）は画像不要。
> ソファ等のズーム内の見た目(CSSシーン)は画像ではなくCSSで描画。上記 `image` は主に「部屋内での見た目」に使われる。
