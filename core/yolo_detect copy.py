import sys
import json
import os
from ultralytics import YOLO

# ←これが無いのが原因
model = YOLO("yolov8n.pt")

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False}))
        return

    image_path = sys.argv[1]

    try:
        results = model(image_path, verbose=False)

        count = 0

        for r in results:
            if r.boxes is None:
                continue

            for c in r.boxes.cls.tolist():
                if int(c) == 0:
                    count += 1

        print(json.dumps({
            "ok": True,
            "count": count
        }))

    except Exception as e:
        print(json.dumps({
            "ok": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    main()