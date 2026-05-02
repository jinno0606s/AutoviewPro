はい、その方針で正しいです。
**結論は、映像と人数データを分離**したほうが安定します。

今の状態は、

* 映像: JPEG
* 人数: AOAが画像に焼き込み済み
* MQTT: 取得テストだけ成功

ですが、これを次の形に変えるのが一番きれいです。

## 目標構成

**1. 映像は HLS か WebSocket で配信**
**2. 人数カウントは MQTT で別取得**
**3. UIで映像の上に人数を重ね表示**
**4. 集計は server 側で保持して API / WS で配信**

つまり、

* **映像ストリーム**
* **人数イベントストリーム**


# 一番よい方針

## 方針A

### 映像 = HLS

### 人数 = MQTT → Nodeで受信 → WebSocketでUIへ配信

これが最も現実的です。

### メリット

* HLS は既存の構成に乗せやすい
* UI実装が簡単
* AOA人数は軽いJSONでリアルタイム更新できる
* 映像に人数を焼き込まなくてよい

### デメリット

* HLSは数秒遅延がある
* 超低遅延ではない

---

## 方針B

### 映像 = WebSocket(MJPEG or fMP4)

### 人数 = 同じくWebSocket

これは低遅延ですが、今の AutoviewPro なら少し複雑です。

### メリット

* 低遅延
* UI上でライブ感が強い

### デメリット

* 実装が重い
* 再接続や安定化が難しい
* Electron + Vue + 複数カメラで保守が大変

---

# いまの段階でのおすすめ

**まずは HLS + MQTT + WebSocket で完成させる**
その後、必要なら WebSocket 映像へ進む。

つまり段階はこうです。

## 第1段階

* MQTTでAOA人数を server で受信
* `peopleCounts` をメモリ保持
* `/api/people/current`
* `/api/people/history`
* `/ws/people`
* UIは HLS映像の上に人数バッジ表示

## 第2段階

* 入退場イベント集計
* 時間帯別集計
* イベント保存
* カメラごとの統計

## 第3段階

* 必要なら低遅延映像を WebSocket 化

---

# 変更の基本思想

今までの `peopleCount.js` は YOLO 前提だったはずです。
これを **AOA入力アダプタ** に変えます。

つまり `peopleCount.js` を

* AI推論をする場所

ではなく

* **AOA/MQTT から人数データを受ける場所**

に変えると整理しやすいです。

---

# 推奨アーキテクチャ

## core/peopleCount.js

役割をこう変更します。

* MQTT購読
* AOAメッセージ解析
* カメラIDへのひも付け
* 現在人数の保持
* 入場/退出/イベント集計
* server に通知できる形にする

---

## server/webApiServer.js

ここで

* REST API
* WebSocket push

を担当

---

## uiapp/src/views/PeopleCountView.vue

ここでは

* HLS再生
* WebSocket受信
* 人数オーバーレイ表示
* 集計表示

を担当

---

# 実装の分け方

## 1. core/peopleCount.js

ここで MQTT を受ける

構造イメージです。

```js
// core/peopleCount.js
const EventEmitter = require("events")
const mqtt = require("mqtt")

class PeopleCountManager extends EventEmitter {
  constructor() {
    super()
    this.counts = {}        // { camId: currentCount }
    this.lastUpdate = {}    // { camId: timestamp }
    this.history = []       // 必要なら簡易履歴
    this.client = null
  }

  start(config = {}) {
    const { brokerUrl, username, password, topics = [] } = config

    this.client = mqtt.connect(brokerUrl, {
      username,
      password
    })

    this.client.on("connect", () => {
      console.log("✅ MQTT connected")
      topics.forEach(t => this.client.subscribe(t))
    })

    this.client.on("message", (topic, payload) => {
      try {
        const msg = JSON.parse(payload.toString())
        const parsed = this.parseAOAMessage(topic, msg)
        if (!parsed) return

        const { camId, count, entered, exited, raw } = parsed
        this.counts[String(camId)] = count
        this.lastUpdate[String(camId)] = Date.now()

        const event = {
          camId: String(camId),
          count,
          entered: entered ?? null,
          exited: exited ?? null,
          ts: Date.now(),
          raw
        }

        this.history.push(event)
        if (this.history.length > 5000) this.history.shift()

        this.emit("update", event)
      } catch (e) {
        console.log("peopleCount mqtt parse error", e)
      }
    })

    this.client.on("error", (e) => {
      console.log("MQTT error", e)
    })
  }

  parseAOAMessage(topic, msg) {
    // ここはAOA実データ形式に合わせて調整
    // 例:
    // {
    //   deviceId: "axis-001",
    //   count: 3,
    //   entered: 10,
    //   exited: 7
    // }

    const camId = this.mapDeviceToCamId(msg.deviceId || msg.serial || msg.cameraId)
    if (!camId) return null

    return {
      camId,
      count: Number(msg.count ?? 0),
      entered: msg.entered != null ? Number(msg.entered) : null,
      exited: msg.exited != null ? Number(msg.exited) : null,
      raw: msg
    }
  }

  mapDeviceToCamId(deviceId) {
    // DBや設定でマッピング
    return deviceId
  }

  getCurrentCounts() {
    return this.counts
  }

  getRecentHistory(camId, limit = 100) {
    return this.history
      .filter(v => !camId || String(v.camId) === String(camId))
      .slice(-limit)
  }
}

module.exports = new PeopleCountManager()
```

---

## 2. server/main.js

起動時に PeopleCountManager を開始

```js
const peopleCount = require("../core/peopleCount")

peopleCount.start({
  brokerUrl: "mqtt://127.0.0.1:1883",
  username: "",
  password: "",
  topics: [
    "axis/aoa/#"
  ]
})
```

---

## 3. server/routes/people.js

REST API を用意

```js
const express = require("express")
const router = express.Router()
const peopleCount = require("../../core/peopleCount")

router.get("/current", (req, res) => {
  res.json({
    ok: true,
    counts: peopleCount.getCurrentCounts()
  })
})

router.get("/history", (req, res) => {
  const camId = req.query.camId
  const limit = Number(req.query.limit || 100)

  res.json({
    ok: true,
    items: peopleCount.getRecentHistory(camId, limit)
  })
})

module.exports = router
```

---

## 4. webApiServer.js で WebSocket 化

リアルタイム更新は polling より WebSocket がよいです。

```js
const WebSocket = require("ws")
const peopleCount = require("../core/peopleCount")

function attachPeopleWs(server) {
  const wss = new WebSocket.Server({ server, path: "/ws/people" })

  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({
      type: "people.init",
      counts: peopleCount.getCurrentCounts()
    }))
  })

  peopleCount.on("update", (event) => {
    const data = JSON.stringify({
      type: "people.update",
      ...event
    })

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    })
  })
}

module.exports = { attachPeopleWs }
```

---

# 映像の方針

## HLSを使うなら

既存の `HLS START` ログがあるので、かなり相性がいいです。
この場合は **PeopleCountView.vue で video.js / hls.js で再生**します。

### UIではこうする

* 背景: HLS映像
* 右上: 現在人数
* 下部: 入場/退出
* 左上: 更新時刻

つまり人数を映像に焼かない。

---

## Vue の表示イメージ

```vue
<template>
  <div class="cam-box">
    <video ref="videoEl" controls autoplay muted playsinline class="video"></video>

    <div class="count-badge" v-if="peopleCounts[String(selectedCamId)] !== undefined">
      👤 {{ peopleCounts[String(selectedCamId)] }}
    </div>

    <div class="count-time">
      更新: {{ lastUpdatedText }}
    </div>
  </div>
</template>
```

```js
import Hls from "hls.js"
import api from "../api/api"

export default {
  data() {
    return {
      selectedCamId: 1,
      peopleCounts: {},
      lastUpdatedAt: null,
      ws: null,
      hls: null
    }
  },
  computed: {
    lastUpdatedText() {
      if (!this.lastUpdatedAt) return "-"
      return new Date(this.lastUpdatedAt).toLocaleString()
    }
  },
  async mounted() {
    await this.loadCurrent()
    this.connectPeopleWs()
    this.startHls()
  },
  beforeUnmount() {
    if (this.ws) this.ws.close()
    if (this.hls) this.hls.destroy()
  },
  methods: {
    async loadCurrent() {
      const r = await api.get("/api/people/current")
      this.peopleCounts = r.data.counts || {}
    },
    connectPeopleWs() {
      const ws = new WebSocket(`ws://${location.host}/ws/people`)
      this.ws = ws

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data)

        if (msg.type === "people.init") {
          this.peopleCounts = msg.counts || {}
        }

        if (msg.type === "people.update") {
          this.peopleCounts = {
            ...this.peopleCounts,
            [String(msg.camId)]: msg.count
          }
          this.lastUpdatedAt = msg.ts
        }
      }
    },
    startHls() {
      const url = `/api/live/hls?cam=${this.selectedCamId}`
      const video = this.$refs.videoEl

      if (Hls.isSupported()) {
        this.hls = new Hls()
        this.hls.loadSource(url)
        this.hls.attachMedia(video)
      } else {
        video.src = url
      }
    }
  }
}
```

---

# 重要ポイント

## AOAの人数は「映像から読む」のではなく「MQTTから受ける」

ここは絶対です。

やってはいけないのは、

* JPEG上の数字をOCRする
* 映像の焼き込み数字をそのまま頼る

です。

AOAはすでに人数データを持っているので、
**人数はMQTTのJSONを真データにする**べきです。

---

# HLS と WebSocket のどちらがいいか

## HLS向き

* 監視画面
* 安定重視
* 複数カメラ
* いまの構成を活かしたい

## WebSocket映像向き

* 超低遅延
* 1台か少数
* 独自実装を増やしてもよい

今の説明を見る限り、**AutoviewPro は HLS が先**です。

---

# DBに持つべきもの

AOAへ切り替えたなら、`cameras` テーブルか別テーブルに最低これがほしいです。

## cameras に追加候補

* `people_count_enabled`
* `people_count_type` = `'axis_aoa'`
* `aoa_device_id`
* `aoa_topic`
* `stream_type` = `'hls'` or `'ws'`
* `hls_path` または `live_path`

例:

```sql
ALTER TABLE cameras ADD COLUMN aoa_device_id TEXT DEFAULT '';
ALTER TABLE cameras ADD COLUMN aoa_topic TEXT DEFAULT '';
ALTER TABLE cameras ADD COLUMN stream_type TEXT DEFAULT 'hls';
```

これで

* どの MQTT topic が
* どの camId に対応するか

を固定できます。

---

# 集計の考え方

AOAには機種によって

* current count
* line crossing
* in / out
* occupancy

のどれかがあります。

なので `peopleCount.js` で内部データを統一します。

```js
{
  camId: "1",
  current: 5,
  enteredToday: 102,
  exitedToday: 97,
  lastUpdateAt: 1234567890
}
```

UIはこの統一データだけを見ればよいです。

---

# まずやる順番

## 1

**AOA MQTT の payload 形式を固定する**

まず実データを1件貼り出して、
Node側で必ず同じ形に変換する。

---

## 2

**core/peopleCount.js を YOLO処理から分離する**

* YOLO推論コードを消すか停止
* MQTT購読マネージャに変更

---

## 3

**/api/people/current を完成させる**

ブラウザで
`http://192.168.1.196:8080/api/people/current`
を開いて人数JSONが返る状態にする

---

## 4

**/ws/people を完成させる**

人数変化が push されるようにする

---

## 5

**PeopleCountView.vue を HLS + オーバーレイ方式に変える**

* `<img src="/api/live/jpeg?...">` をやめる
* `<video>` にする
* count は別描画

---

# 画面設計のおすすめ

PeopleCountView はこうするとよいです。

### 上部

* カメラ選択
* 現在人数
* 本日入場
* 本日退出
* 最終更新時刻

### 中央

* HLS映像

### 下部

* 直近イベント一覧
* 時間別グラフ

これで「映像」と「集計」の責務が分かれます。

---

# いま避けるべきこと

* AOA焼き込みJPEGを本番仕様にする
* YOLOの古いロジックを無理に残す
* Dashboard と PeopleCountView で別々の人数ロジックを持つ
* camId と MQTT topic の対応を曖昧にする

---

# いちばん大事な設計判断

**peopleCount は “映像解析モジュール” ではなく “人数イベント統合モジュール” に変える**

これです。

つまり今後は

* YOLO
* AXIS AOA
* 他のセンサー

が来ても、全部 `peopleCount.js` に統一入力できます。

内部はこういう思想です。

* 入力アダプタ: `axisAoaAdapter`
* 管理本体: `peopleCountManager`
* 出力: REST / WS / DB

この形にするとあとで強いです。

---

# 最終おすすめ

今の AutoviewPro なら、最短で成功するのはこれです。

## 採用案

* **人数取得**: AXIS AOA → MQTT
* **人数配信**: Node の `peopleCount.js` → WebSocket
* **映像配信**: HLS
* **UI表示**: HLS映像の上に人数オーバーレイ
* **集計**: server 側メモリ保持 → 必要ならDB保存

---

必要なら次でそのまま使える形で、

* `core/peopleCount.js`
* `server/routes/people.js`
* `server/webApiServer.js`
* `uiapp/src/views/PeopleCountView.vue`

の**実装コード一式**までまとめます。
いい判断です 👍
ここで設計を一段ちゃんと固めると、あとがかなり楽になります。

---

# ✅ 方針まとめ（確定版）

## ✔ 映像

* HLS（or WS）でクリーン映像
* AOA焼き込みはOFF

## ✔ 人数

* MQTTから取得（AOA）
* peopleCount.jsで統一処理

## ✔ 表示

* UIでオーバーレイ表示

---

# 🔥 重要ポイント（今回の核心）

## AOAは2つのモードがある

### ① line crossing（通過カウント）

* 入場 / 退出が取れる
* 流量分析向き

### ② occupancy（滞在人数）

* 現在人数が取れる
* 混雑監視向き

---

# 🎯 設計の結論

👉 **peopleCount.jsは両方に対応できる構造にする**

これが超重要です。

---

# 🧠 内部データモデル（統一）

AOAの種類に関係なく、内部はこれに統一します👇

```js
{
  camId: "1",
  current: 5,          // 現在人数
  entered: 120,        // 入場累計
  exited: 115,         // 退出累計
  lastUpdateAt: 1234567890
}
```

---

# 🔀 シナリオ別の処理

## 🟦 シナリオ1：line crossing

AOAから来るデータ（例）

```json
{
  "entered": 3,
  "exited": 1
}
```

### 処理

```js
state.current += entered - exited
state.entered += entered
state.exited += exited
```

👉 currentは「計算」で作る

---

## 🟩 シナリオ2：occupancy

AOAから来るデータ（例）

```json
{
  "count": 7
}
```

### 処理

```js
state.current = count
```

👉 entered / exited は不明（または使わない）

---

# 🧱 peopleCount.js 設計（重要）

## カメラごとにモードを持つ

```js
this.config = {
  "1": {
    mode: "line",       // or "occupancy"
    topic: "axis/aoa/1"
  },
  "2": {
    mode: "occupancy",
    topic: "axis/aoa/2"
  }
}
```

---

# 🧩 実装コア（ここがキモ）

```js
handleMessage(camId, msg) {
  const cfg = this.config[camId]
  if (!cfg) return

  if (!this.state[camId]) {
    this.state[camId] = {
      current: 0,
      entered: 0,
      exited: 0,
      lastUpdateAt: 0
    }
  }

  const state = this.state[camId]

  if (cfg.mode === "line") {
    const entered = Number(msg.entered || 0)
    const exited = Number(msg.exited || 0)

    state.current += entered - exited
    state.entered += entered
    state.exited += exited
  }

  if (cfg.mode === "occupancy") {
    const count = Number(msg.count || 0)
    state.current = count
  }

  state.lastUpdateAt = Date.now()

  this.emit("update", {
    camId,
    ...state
  })
}
```

---

# ⚠️ 超重要な注意点

## line crossing の罠

### 問題

再起動すると current がズレる

### 対策（どれか必須）

### ✔ 対策A（おすすめ）

AOAの「現在人数」も取得できるなら併用

---

### ✔ 対策B

初期値をDBからロード

```js
state.current = db.lastKnownCount
```

---

### ✔ 対策C

毎日リセット

```js
if (isMidnight()) {
  state.current = 0
}
```

---

# 🧠 実務的おすすめ

## ✔ 現場で一番安定

👉 **occupancyを優先**

理由：

* ズレない
* 再起動OK
* シンプル
* UIと相性良い

---

## ✔ line crossing は補助

* 入場数ログ
* レポート
* イベント分析

---

# 🎯 ベスト構成

| 用途   | モード           |
| ---- | ------------- |
| 監視画面 | occupancy     |
| レポート | line crossing |

👉 両方取れるなら両方使う

---

# 🔌 MQTT設計のポイント

AOAは機種によってJSONが違うので
**parse層を分離する**

```js
parseAOA(msg) {
  return {
    count: msg.count ?? null,
    entered: msg.entered ?? null,
    exited: msg.exited ?? null
  }
}
```

---

# 🧭 UI側の扱い

## 表示ルール

```vue
👤 {{ current }}

⇧ {{ entered }} / ⇩ {{ exited }}
```

occupancyだけの場合：

```vue
👤 7
```

---

# 🔥 ここまでの完成イメージ

## PeopleCountView

* 映像：HLS
* 右上：現在人数
* 下：入退場
* WSでリアルタイム更新

---

# 🚀 次にやるべきこと

## ① MQTT実データを確定

👉 ここが最優先

例を貼ってほしい👇

```json
{
  "deviceId": "...",
  "count": ...,
  "entered": ...,
  "exited": ...
}
```

---

## ② camerasテーブルに追加

```sql
ALTER TABLE cameras ADD COLUMN aoa_mode TEXT DEFAULT 'occupancy';
ALTER TABLE cameras ADD COLUMN aoa_topic TEXT DEFAULT '';
```



peopleCount.js
MQTT受信
normalize
events配列更新
CSV保存

webApiServer.js
期間集計
時系列集計
export API

PeopleCountView.vue
表示
絞り込み
CSV出力