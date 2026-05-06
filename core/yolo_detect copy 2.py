import cv2
import json
import sys

image_path = sys.argv[1]

img = cv2.imread(image_path)

# YOLO結果（例）
results = model(img)[0]

count = 0

for box in results.boxes:
    cls = int(box.cls[0])

    if cls == 0:  # person
        count += 1

        x1,y1,x2,y2 = map(int, box.xyxy[0])

        # 🔥 枠
        cv2.rectangle(img, (x1,y1), (x2,y2), (0,255,0), 2)

# 🔥 人数表示
cv2.putText(
    img,
    f"COUNT: {count}",
    (20, 50),
    cv2.FONT_HERSHEY_SIMPLEX,
    1.5,
    (0,0,255),
    3
)

# 🔥 上書き保存（重要）
cv2.imwrite(image_path, img)

# JSON返す
print(json.dumps({
    "ok": True,
    "count": count
}))