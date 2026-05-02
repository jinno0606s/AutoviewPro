🟢 シナリオ設計
■ Scenario 1（超重要：メイン
Crossline counting
✔ 用途
通過人数
車両通過
時間集計
✔ MQTTデータ
totalHuman
totalCar
totalTruck
👉 差分で👇
入場数 / 通過数

■ Scenario 2（補助）
Occupancy in area
✔ 用途
今何人いるか（混雑）
✔ MQTTデータ
"totalHuman": 12
リアルタイム人数（瞬間値）

🔥 役割分担（これ重要）
シナリオ	役割
Scenario1	累積（売上・通過）
Scenario2	現在（混雑）
🎯 UI設計
👤 現在人数 → Scenario2
📈 本日の人数 → Scenario1
🚗 車両 → Scenario1
🔥 Node側の処理
✔ Scenario判別
const scenario = data.scenario

DB設計

リアルタイム表示用の「現在値」
時間集計用の「履歴」

cameras に AOA用の設定を追加
ALTER TABLE cameras ADD COLUMN aoa_enabled INTEGER DEFAULT 0;
ALTER TABLE cameras ADD COLUMN aoa_topic_flow TEXT DEFAULT '';
ALTER TABLE cameras ADD COLUMN aoa_topic_occupancy TEXT DEFAULT '';
ALTER TABLE cameras ADD COLUMN aoa_scenario_flow TEXT DEFAULT 'Scenario 1';
ALTER TABLE cameras ADD COLUMN aoa_scenario_occupancy TEXT DEFAULT 'Scenario 2';
ALTER TABLE cameras ADD COLUMN mqtt_serial TEXT DEFAULT '';
# mqtt_serial は B8A44FD615A4 のようなカメラ識別子。

現在値テーブル
CREATE TABLE IF NOT EXISTS aoa_live_counts (
  cam_id INTEGER PRIMARY KEY,
  ts INTEGER NOT NULL,
  current_human INTEGER DEFAULT 0,
  current_car INTEGER DEFAULT 0,
  flow_human_total INTEGER DEFAULT 0,
  flow_car_total INTEGER DEFAULT 0,
  flow_truck_total INTEGER DEFAULT 0,
  flow_bus_total INTEGER DEFAULT 0,
  flow_bike_total INTEGER DEFAULT 0,
  flow_other_vehicle_total INTEGER DEFAULT 0
);

MQTTイベント履歴
CREATE TABLE IF NOT EXISTS aoa_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cam_id INTEGER NOT NULL,
  mqtt_serial TEXT NOT NULL,
  topic TEXT NOT NULL,
  scenario TEXT,
  scenario_type TEXT,
  reason TEXT,
  trigger_time TEXT,
  reset_time TEXT,
  total_human INTEGER DEFAULT 0,
  total_car INTEGER DEFAULT 0,
  total_truck INTEGER DEFAULT 0,
  total_bus INTEGER DEFAULT 0,
  total_bike INTEGER DEFAULT 0,
  total_other_vehicle INTEGER DEFAULT 0,
  total_all INTEGER DEFAULT 0,
  raw_json TEXT,
  created_at INTEGER NOT NULL
);

これはデバッグと後追い確認用。
最初は保存しておく方が絶対いい。

4. 時間集計テーブル

15分単位が相性いい。

CREATE TABLE IF NOT EXISTS aoa_agg_15min (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cam_id INTEGER NOT NULL,
  bucket_start INTEGER NOT NULL,
  bucket_end INTEGER NOT NULL,
  flow_human INTEGER DEFAULT 0,
  flow_car INTEGER DEFAULT 0,
  flow_truck INTEGER DEFAULT 0,
  flow_bus INTEGER DEFAULT 0,
  flow_bike INTEGER DEFAULT 0,
  flow_other_vehicle INTEGER DEFAULT 0,
  occupancy_human_max INTEGER DEFAULT 0,
  occupancy_human_avg REAL DEFAULT 0,
  occupancy_car_max INTEGER DEFAULT 0,
  occupancy_car_avg REAL DEFAULT 0,
  samples INTEGER DEFAULT 0,
  UNIQUE(cam_id, bucket_start)
);

これで

通過人数
車両通過数
最大混雑
平均混雑

サーバ側の集計ロジック
MQTT受信時の考え方
Scenario 1 = CrosslineCounting
totalHuman などの累積値の差分を使う
Scenario 2 = OccupancyInArea
totalHuman を現在人数として使う
メモリ状態
const aoaLastTotals = {};   // serialごとの前回累積
const aoaLive = {};         // cam_idごとの現在表示値