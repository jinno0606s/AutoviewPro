# 海岸・港湾向け高度監視ソリューション設計

## システム名

**Autocaster MultiView Coastal Guard**

〜ライブ配信・一斉放送・AI検知を統合した海岸・港湾監視システム〜

---

# 1. 基本コンセプト

既存の **AutoviewPro / Autocaster MultiView** をベースに、以下を統合します。

* 沿岸ライブ監視
* 波浪・高潮・津波警戒
* AI人物・車両・船舶検知
* AXIS IPスピーカーによる警告放送
* 地震・津波API連携
* 住民向けライブ配信
* 管理本部向けマルチビュー監視

---

# 2. 追加する機能

## EVENTメニュー追加

```vue
<template>
  <div>
    <h2>EVENT機能</h2>

    <button @click="$router.push('/event/timelapse')">
      タイムラプス
    </button>

    <button @click="$router.push('/event/people')">
      人数カウント
    </button>

    <button @click="$router.push('/event/coastal')">
      海岸監視
    </button>
  </div>
</template>
```

---

# 3. 追加画面

## 新規ファイル

```text
uiapp/src/views/CoastalMonitorView.vue
```

役割：

* 海岸・港湾カメラのライブ表示
* 波浪・水位情報表示
* AI検知イベント表示
* スピーカー放送操作
* 津波・地震情報表示
* 危険レベル表示

---

# 4. ルーター追加

```js
import CoastalMonitorView from "./views/CoastalMonitorView.vue"

{
  path: "/event/coastal",
  component: CoastalMonitorView
}
```

---

# 5. サーバー側追加構成

```text
AutoviewPro
├ core/
│ ├ coastalMonitor.js      ← 追加
│ ├ speaker.js
│ ├ peopleCount.js
│ ├ pipeline.js
│ └ timelapse.js
│
├ server/
│ ├ webApiServer.js        ← API中枢
│ └ routes/
│   ├ coastal.js           ← 追加
│   ├ cameras.js
│   ├ people.js
│   └ timelapse.js
│
├ data/
│ ├ coastal/
│ │ ├ alerts.csv
│ │ ├ wave_events.csv
│ │ └ broadcast_logs.csv
```

---

# 6. API設計

## 海岸監視サマリー

```text
GET /api/coastal/summary
```

返却例：

```json
{
  "status": "warning",
  "waveLevel": "high",
  "tsunami": false,
  "earthquake": false,
  "activeCameras": 4,
  "activeSpeakers": 3,
  "lastAlert": "高波注意"
}
```

---

## AI検知イベント

```text
GET /api/coastal/events
```

```json
[
  {
    "ts": 1777000000000,
    "camera": "港入口",
    "type": "human",
    "event": "立入禁止区域侵入",
    "level": "warning"
  }
]
```

---

## 警告放送

```text
POST /api/coastal/broadcast
```

```json
{
  "target": "all",
  "message": "高波の危険があります。海岸から離れてください。",
  "sound": "warning"
}
```

---

## 地震・津波情報

```text
GET /api/coastal/disaster-info
```

---

# 7. CoastalMonitorView.vue 画面構成

```text
海岸監視ダッシュボード
├ 状態カード
│ ├ 通常
│ ├ 注意
│ ├ 警戒
│ └ 避難
│
├ ライブ映像マルチビュー
│ ├ 港入口カメラ
│ ├ 防波堤カメラ
│ ├ 海水浴場カメラ
│ └ 河口カメラ
│
├ AI検知イベント
│ ├ 人物侵入
│ ├ 車両侵入
│ ├ 船舶接近
│ └ 長時間滞留
│
├ 警告放送パネル
│ ├ 全拠点放送
│ ├ 個別スピーカー放送
│ ├ サイレン
│ ├ 録音メッセージ
│ └ 肉声放送
│
└ 地震・津波API情報
```

---

# 8. 警戒レベル設計

```js
const coastalLevels = {
  normal: {
    label: "通常",
    color: "green"
  },
  caution: {
    label: "注意",
    color: "yellow"
  },
  warning: {
    label: "警戒",
    color: "orange"
  },
  evacuation: {
    label: "避難",
    color: "red"
  }
}
```

---

# 9. AI検知ルール

## 海岸向け検知

```text
人物検知
├ 立入禁止区域侵入
├ 夜間侵入
├ 長時間滞留
└ 危険区域接近

車両検知
├ 港湾エリア侵入
├ 不法投棄疑い
└ 深夜車両検知

船舶検知
├ 防波堤接近
├ 禁止エリア接近
└ 長時間停泊

災害連動
├ 津波注意報
├ 津波警報
├ 大津波警報
├ 高潮注意
└ 高波警戒
```

---

# 10. 放送パターン

```text
通常放送
├ 観光案内
├ マナー啓発
└ 定時アナウンス

注意放送
├ 高波注意
├ 強風注意
└ 立入注意

警戒放送
├ 海岸から離れてください
├ 防波堤に近づかないでください
└ 港湾区域から退避してください

避難放送
├ 津波警報
├ 大津波警報
└ 直ちに高台へ避難してください
```

---

# 11. システム構成イメージ

```text
[海岸・港湾現場]
  ├ ネットワークカメラ
  ├ HIKVISION ソーラーカメラ
  ├ SIMルーター
  ├ AXIS C1310-E MK2 IPスピーカー
  └ SDカード録画

        ↓ SIM / LTE / 5G

[クラウド / 管理サーバー]
  ├ Autocaster MultiView
  ├ webApiServer.js
  ├ AI検知
  ├ 地震・津波API取得
  ├ イベント記録
  └ 放送制御

        ↓

[管理本部]
  ├ マルチビュー監視
  ├ 警告放送操作
  ├ イベント確認
  └ ライブ配信管理

        ↓

[住民・利用者]
  └ 公開ライブ映像確認
```

---

# 12. 実装優先順位

## 第1段階

* `/event/coastal` 画面追加
* カメラ一覧表示
* 状態カード表示
* 手動放送ボタン

## 第2段階

* AI検知イベント連携
* 人物・車両・船舶検知ログ
* 警戒レベル自動変更

## 第3段階

* 地震・津波API連携
* 自動放送
* 全拠点一斉放送

## 第4段階

* 住民向けライブ配信
* 公開URL生成
* 録画・タイムラプス連携

---

# 13. 結論

既存の構成を活かすなら、追加すべき中心はこの3つです。

```text
uiapp/src/views/CoastalMonitorView.vue
server/routes/coastal.js
core/coastalMonitor.js
```

`PeopleCountView.vue` の考え方を流用して、
**人数カウント → 海岸監視イベント** に拡張する設計が一番安全です。
