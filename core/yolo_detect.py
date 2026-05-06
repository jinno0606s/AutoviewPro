import cv2
import json
import sys
from ultralytics import YOLO

model = YOLO("yolov8n.pt")

image_path = sys.argv[1]

img = cv2.imread(image_path)

# 🔥 ログ消す
results = model(img, verbose=False)[0]

count = 0
 
# for box in results.boxes:
    # if int(box.cls[0]) == 0:
        # count += 1

for box in results.boxes:
    if int(box.cls[0]) == 0:
        x1,y1,x2,y2 = map(int, box.xyxy[0])
        cv2.rectangle(img, (x1,y1), (x2,y2), (0,255,0), 2)

# 表示
cv2.putText(
    img,
    f"COUNT: {count}",
    (20, 50),
    cv2.FONT_HERSHEY_SIMPLEX,
    1.5,
    (0,0,255),
    3
)

cv2.imwrite(image_path, img)

# JSONはこれだけ
print(json.dumps({
    "ok": True,
    "count": count
}))