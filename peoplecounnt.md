AXIS Object Analytics (AOA) のMQTTデータは、「名前空間（Namespaces）」をOFFに設定した状態で受信すると、非常に整理されたJSON形式で届きます。クロス集計とエリア集計では、data 階層の中身（フィールド）が異なります。それぞれの代表的なデータ構造と項目をまとめました。1. クロス集計（ライン横断）のデータ構造ラインを通過した瞬間に1回発行される「イベント型」のデータです。JSON{
  "topic": "axis/AOA/LineCrossing/Scenario1",
  "payload": {
    "message": {
      "source": { "key": "sensor", "value": "0" },
      "data": {
        "lineCrossingDirection": "Direction1", // 通過方向（Dir1 または Dir2）
        "reason": "human",                   // 物体の種類（human, vehicle, bicycleなど）
        "totalHuman": 125,                    // その方向の累計通過人数
        "totalVehicle": 10,                   // その方向の累計通過車両数
        "id": "42"                            // 検知された個体のID（一時的）
      }
    }
  }
}
主な項目解説lineCrossingDirection: カメラ設定画面のライン上で「青い矢印」が向いている方向が Direction1 です。reason: 何を検知したか。人、車（乗用車/トラック等）、自転車を判別します。total...: 設定された方向の「これまでの合計」です。Node-REDで「今回の増加分」だけを知りたい場合は、前回の数値との差分を取る処理が必要です。2. エリア集計（滞留・占有）のデータ構造エリア内の人数に変化があった時、または一定周期で発行される「状態監視型」のデータです。JSON{
  "topic": "axis/AOA/Occupancy/Scenario2",
  "payload": {
    "message": {
      "data": {
        "occupancy": 5,           // 【重要】現在エリア内にいる合計人数
        "highOccupancy": false,   // 閾値を超えているか（混雑フラグ）
        "reason": "human",        // 対象の種類
        "totalHuman": 550,        // そのエリアに入った累計人数（IN数）
        "id": "105"
      }
    }
  }
}
主な項目解説occupancy: これが「今何人いるか」のリアルタイム数値です。群衆管理や混雑モニターにはこの値を使います。highOccupancy: カメラ側で「10人以上でアラート」と設定していれば、10人を超えた瞬間に true になります。Node-REDでパトライトを回したり通知を送るトリガーに最適です。totalHuman: エリアに入ってきた人の「累計」です。3. 両方のデータに含まれる共通項目フィールド名意味timestamp検知した時刻（ISO8601形式など）。topicどのカメラの、どのシナリオからのデータかを示す住所。serialカメラのシリアル番号（設定でONにしている場合）。