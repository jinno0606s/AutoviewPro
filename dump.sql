PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE cameras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rtsp_url TEXT NOT NULL,
        name TEXT DEFAULT '', address TEXT, lat REAL, lng REAL, timelapse_enabled INTEGER DEFAULT 1, tl_interval INTEGER DEFAULT 600, tl_start_hour INTEGER DEFAULT 0, tl_end_hour INTEGER DEFAULT 24, tl_days TEXT DEFAULT '1,2,3,4,5,6,0', tl_last_run INTEGER DEFAULT 0, tl_last_file_at INTEGER DEFAULT 0, tl_fps INTEGER DEFAULT 12, tl_quality INTEGER DEFAULT 2, people_count_enabled INTEGER DEFAULT 0, people_count_type TEXT DEFAULT 'ai', aoa_enabled INTEGER DEFAULT 0, aoa_topic_flow TEXT DEFAULT '', aoa_topic_occupancy TEXT DEFAULT '', aoa_scenario_flow TEXT DEFAULT 'Scenario 1', aoa_scenario_occupancy TEXT DEFAULT 'Scenario 2', mqtt_serial TEXT DEFAULT '', rtmp_url TEXT DEFAULT '', rtmp_key TEXT DEFAULT '', rtmp_enabled INTEGER DEFAULT 0, enabled INTEGER DEFAULT 1);
INSERT INTO cameras VALUES(1,'rtsp://root:Cw8839629@192.168.1.190/axis-media/media.amp','A m1468 AXIS 177','埼玉県さいたま市浦和区本太２−９−２４',35.6047136376241297,139.700596682909406,1,600,0,24,'1,2,3,4,5,6,0',1777597614160,1777597614160,12,2,1,'ai',1,'','','Scenario 1','Scenario 2','B8A44FD615A4','','',0,1);
INSERT INTO cameras VALUES(2,'rtsp://admin:Cw8839629@219.112.79.101:554/streaming/channels/101','B Hikvision Solar','埼玉県さいたま市浦和区本太2-9-25',35.8663922451569874,139.656723327139843,1,600,0,24,'1,2,3,4,5,6,0',1777597614160,1777597614160,12,2,1,'ai',0,'','','Scenario 1','Scenario 2','','','',0,1);
INSERT INTO cameras VALUES(3,'rtsp://root:Cw8839629@192.168.174/axis-media/media.amp','C T1468 AXIS 174','埼玉県さいたま市浦和区本太2-9-25',NULL,NULL,1,600,0,24,'1,2,3,4,5,6,0',1774930030968,1774930030968,12,2,1,'ai',0,'','','Scenario 1','Scenario 2','','','',0,0);
INSERT INTO cameras VALUES(15,'rtsp://root:Cw8839629@192.168.1.198/axis-media/media.amp','D M1135  AXIS198','埼玉県さいたま市浦和区本太2-9-25',NULL,NULL,1,600,0,24,'1,2,3,4,5,6,0',1777518508495,1777518508495,12,2,1,'ai',0,'','','Scenario 1','Scenario 2','','','',0,0);
INSERT INTO cameras VALUES(16,'rtsp://root:Cw8839629@169.254.95.15/axis-media/media.amp','E M5526   AXIS   ','qqqqq',NULL,NULL,1,600,0,24,'1,2,3,4,5,6,0',0,0,12,2,1,'ai',0,'','','Scenario 1','Scenario 2','','','',0,0);
INSERT INTO cameras VALUES(17,'','B Hikvision ',NULL,NULL,NULL,1,600,0,24,'1,2,3,4,5,6,0',1774919126082,1774919126082,12,2,0,'ai',0,'','','Scenario 1','Scenario 2','','','',0,0);
INSERT INTO cameras VALUES(18,'','','',NULL,NULL,1,600,0,24,'1,2,3,4,5,6,0',0,0,12,2,0,'ai',0,'','','Scenario 1','Scenario 2','','','',0,0);
INSERT INTO cameras VALUES(19,'','','',NULL,NULL,1,600,0,24,'1,2,3,4,5,6,0',0,0,12,2,0,'ai',0,'','','Scenario 1','Scenario 2','','','',0,0);
INSERT INTO cameras VALUES(20,'','','',NULL,NULL,1,600,0,24,'1,2,3,4,5,6,0',0,0,12,2,0,'ai',0,'','','Scenario 1','Scenario 2','','','',0,0);
INSERT INTO cameras VALUES(21,'','','',NULL,NULL,1,600,0,24,'1,2,3,4,5,6,0',0,0,12,2,0,'ai',0,'','','Scenario 1','Scenario 2','','','',0,0);
INSERT INTO cameras VALUES(22,'','','',NULL,NULL,1,600,0,24,'1,2,3,4,5,6,0',0,0,12,2,0,'ai',0,'','','Scenario 1','Scenario 2','','','',0,0);
CREATE TABLE layouts (
        layout_count INTEGER PRIMARY KEY,
        config TEXT NOT NULL
      );
INSERT INTO layouts VALUES(1,'[{"index":0,"cameraId":1}]');
INSERT INTO layouts VALUES(4,'[1,2,3]');
INSERT INTO layouts VALUES(9,'[1,2,3]');
INSERT INTO layouts VALUES(12,'[1,2,3,15,16]');
CREATE TABLE speakers (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  name TEXT,

  rtp_ip TEXT,

  address TEXT,

  lat REAL,

  lng REAL,

  enabled INTEGER DEFAULT 1

, ip TEXT);
INSERT INTO speakers VALUES(1,'C1720','','埼玉県さいたま市浦和区本太2-9-24',35.8636532527432905,139.659282457594258,1,'192.168.1.195');
INSERT INTO speakers VALUES(2,'C1111','rtp://','埼玉県さいたま市浦和区本太2-9-25',NULL,NULL,1,NULL);
INSERT INTO speakers VALUES(3,'C1420','rtp://','埼玉県さいたま市浦和区本太2-9-21',NULL,NULL,1,NULL);
INSERT INTO speakers VALUES(4,'',NULL,'','','',1,NULL);
CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        level TEXT DEFAULT 'info',
        source TEXT DEFAULT 'manual',
        title TEXT NOT NULL,
        message TEXT DEFAULT '',
        lat REAL,
        lng REAL,
        camera_id INTEGER,
        speaker_id INTEGER,
        zone_id INTEGER,
        status TEXT DEFAULT 'open',
        created_at TEXT DEFAULT (datetime('now','localtime')),
        closed_at TEXT,
        operator TEXT
      );
CREATE TABLE rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        event_type TEXT NOT NULL,
        condition_json TEXT DEFAULT '{}',
        action_json TEXT DEFAULT '{}',
        enabled INTEGER DEFAULT 1
      );
CREATE TABLE clips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        speaker_id INTEGER,
        clip_no INTEGER,
        text TEXT DEFAULT '',
        file_path TEXT DEFAULT '',
        enabled INTEGER DEFAULT 1
      );
CREATE TABLE people_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  camera_id INTEGER,
  count INTEGER,
  ts INTEGER
);
CREATE TABLE aoa_live_counts (
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
CREATE TABLE aoa_events (
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
CREATE TABLE aoa_agg_15min (
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
CREATE TABLE aoa_flow_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cam_id INTEGER,
        ts INTEGER,
        flow_human INTEGER,
        flow_car INTEGER
      );
CREATE TABLE aoa_agg_day (
        cam_id INTEGER,
        day TEXT,

        flow_human INTEGER DEFAULT 0,
        flow_car INTEGER DEFAULT 0,

        PRIMARY KEY (cam_id, day)
      );
CREATE TABLE aoa_scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cam_id INTEGER NOT NULL,
  serial TEXT NOT NULL DEFAULT '',
  scenario_key TEXT NOT NULL DEFAULT '',
  scenario_name TEXT NOT NULL DEFAULT '',
  scenario_type TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'line_delta',
  topic TEXT NOT NULL DEFAULT '',
  calc_target TEXT NOT NULL DEFAULT 'human',
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('cameras',22);
INSERT INTO sqlite_sequence VALUES('speakers',4);
CREATE INDEX idx_flow_cam_ts
      ON aoa_flow_events(cam_id, ts)
    ;
CREATE UNIQUE INDEX idx_aoa_scenarios_unique
ON aoa_scenarios(serial, scenario_key);
CREATE INDEX idx_aoa_scenarios_cam_id
ON aoa_scenarios(cam_id);
COMMIT;
