import cv2, numpy as np, serial, time

# 画像内での球の位置を取得
ser = serial.Serial("COM3", 9600)
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 2048)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1536)
imgs = []
for i in range(4):
	ser.write(str(i).encode())
	time.sleep(.5)
	ret, frame = cap.read()
	imgs.append(frame)
img0_inrange = cv2.inRange(cv2.cvtColor(imgs[0], cv2.COLOR_BGR2HSV), (90, 16, 16), (110, 255, 255))
cv2.imshow("InRange", img0_inrange)
cv2.waitKey(0)
(ball_x, ball_y), ball_radius = cv2.minEnclosingCircle(max(cv2.findContours(img0_inrange, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0], key=lambda x: cv2.contourArea(x)))
img0_show = imgs[0].copy()
cv2.circle(img0_show, (int(ball_x), int(ball_y)), int(ball_radius), (0, 255, 0), 2)
cv2.imshow("Ball", img0_show)
cv2.waitKey(0)
mask = cv2.circle(np.zeros(imgs[0].shape[:2], dtype=np.uint8), (int(ball_x), int(ball_y)), int(ball_radius), 255, -1)

# 光源の方向を取得
light = []
for img in imgs[1:]:
	maxloc = cv2.minMaxLoc(cv2.cvtColor(np.clip(img.astype(np.int16) - imgs[0].astype(np.int16), 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY), mask=mask)[3]
	img_show = img.copy()
	cv2.circle(img_show, (maxloc[0], maxloc[1]), 9, (0, 255, 0), 2)
	cv2.imshow("Light", img_show)
	cv2.waitKey(0)
	n_x = maxloc[0] - ball_x
	n_y = maxloc[1] - ball_y
	n = np.array((abs(ball_radius ** 2 - n_x ** 2 - n_y ** 2) ** .5, -n_y, n_x)) * 2
	n /= np.linalg.norm(n)
	v = np.array((1, 0, 0))
	light.append(np.dot(n.T, v) * n * 2 - v)
np.save("light.npy", np.array(light))