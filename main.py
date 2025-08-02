from selenium import webdriver
import base64, cv2, dotenv, ftplib, http.server, io, numpy as np, queue, random, re, os, serial, socketserver, subprocess, threading, time

class HTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, directory="webui/dist", **kwargs)
	def do_GET(self):
		global q
		event_match = re.match(r"/event/(.+)", self.path)
		if event_match:
			self.send_response(200)
			self.end_headers()
			self.wfile.write(b"OK")
			q.put(event_match.group(1))
		else:
			super().do_GET()

def start_http_server():
	global PORT
	with socketserver.TCPServer(("", PORT), HTTPRequestHandler) as http_server:
		http_server.serve_forever()

def main():
	global PORT, q
	subprocess.Popen(os.getenv("LOCALAPPDATA") + r"\Programs\VOICEVOX\vv-engine\run")
	threading.Thread(target=start_http_server, daemon=True).start()
	options = webdriver.ChromeOptions()
	options.add_experimental_option("excludeSwitches", ["enable-automation"])
	driver = webdriver.Chrome(options=options)
	driver.get("http://localhost:" + str(PORT))
	driver.fullscreen_window()
	ser = serial.Serial("COM3", 9600)
	cap = cv2.VideoCapture(0)
	cap.set(cv2.CAP_PROP_FRAME_WIDTH, 2048)
	cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1536)
	for _ in range(99):
		cap.read()
	ret, first_frame = cap.read()
	lut = (np.arange(256) / 255) ** 2.2 * 255
	dotenv.load_dotenv()
	failure = False
	driver.execute_script("document.dispatchEvent(new CustomEvent('ready'))")
	while True:
		if failure:
			driver.execute_script("document.dispatchEvent(new CustomEvent('failure'))")
			while q.get() != "press_space":
				pass
			failure = False
		hand = q.get() != "click"
		imgs = []
		for i in range(4):
			ser.write(str(i).encode())
			time.sleep(.3)
			ret, frame = cap.read()
			if i == 0:
				img_nolight = frame
			imgs.append(cv2.LUT(frame, lut))
		ser.write(b"0")
		cv2.imwrite("out/img_nolight.png", img_nolight)
		cv2.imwrite("out/img_nolight_lut.png", imgs[0].astype(np.uint8))
		imgs = np.array(imgs)
		img_mask = np.sum(np.abs(img_nolight.astype(np.int16) - first_frame.astype(np.int16)), axis=2) > 127
		if img_mask.sum() < 100000:
			failure = True
			continue
		imgs = np.clip(imgs[1:] - imgs[0], 0, 255)
		imgs_sum = np.sum(imgs)
		imgs[0] *= imgs_sum / np.sum(imgs[0]) / 3
		imgs[1] *= imgs_sum / np.sum(imgs[1]) / 3
		imgs[2] *= imgs_sum / np.sum(imgs[2]) / 3
		cv2.imwrite("out/imgs0.png", imgs[0].astype(np.uint8))
		light = np.load("light.npy")
		lightT = light.T
		g = np.tensordot(imgs.transpose(1, 2, 0, 3), (np.linalg.inv(lightT @ light) @ lightT).T, axes=(2, 0))
		img_albedo = np.linalg.norm(g, axis=3)
		g_gray = g[:, :, 0] * .0722 + g[:, :, 1] * .7152 + g[:, :, 2] * .2126
		g_norm = np.linalg.norm(g_gray, axis=2)
		img_normal = np.zeros(imgs.shape[1:4])
		mask = g_norm != 0
		img_normal[mask] = g_gray[mask] / g_norm[mask, None]
		img_albedo *= img_mask[:, :, None]
		img_normal *= img_mask[:, :, None]
		y_tilt = np.nan_to_num(img_normal[:, :, 1] / img_normal[:, :, 0], posinf=1, neginf=-1)
		cv2.imwrite("out/y_tilt.png", np.clip(y_tilt * 127.5 + 127.5, 0, 255).astype(np.uint8))
		score = []
		img_show = img_nolight.copy()
		gcx = np.mean(np.where(img_mask)[1])
		img_show = cv2.line(img_show, (int(gcx / 2), 0), (int(gcx / 2), img_show.shape[0] - 1), (255, 0, 0), 1)
		img_show = cv2.line(img_show, (int(gcx * 2 / 3), 0), (int(gcx * 2 / 3), img_show.shape[0] - 1), (0, 255, 0), 1)
		img_show = cv2.line(img_show, (int(gcx), 0), (int(gcx), img_show.shape[0] - 1), (0, 0, 255), 1)
		for i in range(int(gcx / 2), int(gcx * 2 / 3)):
			start = np.where(img_mask[:, i])[0]
			if start.size == 0:
				continue
			start = start[0]
			end = np.where(1 - img_mask[start:, i])[0]
			if end.size == 0 or end[0] < 9:
				continue
			end = end[0] + start
			separate = int((start * 2 + end) / 3) if hand else int((start + end * 2) / 3)
			score.append([np.sum(np.abs(y_tilt[start:separate])), np.sum(np.abs(y_tilt[separate:end]))])
			img_show = cv2.circle(img_show, (i, start), 3, (255, 0, 0), -1)
			img_show = cv2.circle(img_show, (i, separate), 3, (0, 255, 0), -1)
			img_show = cv2.circle(img_show, (i, end), 3, (0, 0, 255), -1)
		if not len(score):
			failure = True
			continue
		score_mean = np.mean(np.array(score), axis=0)
		if hand:
			score_mean = score_mean[::-1]
		img_normal = ((img_normal * .5 + .5) * 255).astype(np.uint8)
		img_albedo = (img_albedo / np.max(img_albedo) * 255).astype(np.uint8)
		webp_albedo = base64.b64encode(cv2.imencode(".webp", img_albedo, (cv2.IMWRITE_WEBP_QUALITY, 100))[1]).decode("ascii")
		webp_normal = base64.b64encode(cv2.imencode(".webp", img_normal, (cv2.IMWRITE_WEBP_QUALITY, 100))[1]).decode("ascii")
		cv2.imwrite("out/img_show.png", img_show)
		driver.execute_script("document.dispatchEvent(new CustomEvent('predict', {detail: {albedo: arguments[0], normal: arguments[1], score: arguments[2]}}))", webp_albedo, webp_normal, score_mean.tolist())
		while q.get() != "end_speech":
			pass
		try:
			ftp = ftplib.FTP(os.getenv("OC2025_FTP_HOSTNAME"))
			ftp.login(os.getenv("OC2025_FTP_USERNAME"), os.getenv("OC2025_FTP_PASSWORD"))
			ftp.cwd(os.getenv("OC2025_FTP_DIRECTORY"))
			filenames = ftp.nlst(".")
			while True:
				filename = base64.urlsafe_b64encode(random.randrange(0, 2 ** 64).to_bytes(8)).decode("utf-8").rstrip("=") + ".png"
				if filename not in filenames:
					break
			ftp.storbinary("STOR " + filename, io.BytesIO(driver.get_screenshot_as_png()))
			ftp.quit()
		except ftplib.all_errors as e:
			print(e)
			filename = "error"
		driver.execute_script("document.dispatchEvent(new CustomEvent('ss', {detail: {fn: arguments[0]}}))", filename)
		while q.get() != "press_space":
			pass

if __name__ == "__main__":
	PORT = 8000
	q = queue.Queue()
	main()