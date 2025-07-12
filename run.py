from selenium import webdriver
import base64, cv2, dotenv, ftplib, http.server, io, numpy as np, queue, random, os, serial, socketserver, subprocess, threading, time

class HTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, directory="webui/dist", **kwargs)
	def do_GET(self):
		global q
		if self.path != "/end_speech":
			super().do_GET()
		else:
			self.send_response(200)
			self.end_headers()
			self.wfile.write(b"OK")
			q.put("end_speech")

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
	ret, first_frame = cap.read()
	lut = (np.arange(256) / 255) ** 2.2 * 255
	dotenv.load_dotenv()
	ftp = ftplib.FTP(os.getenv("OC2025_FTP_HOSTNAME"))
	ftp.login(os.getenv("OC2025_FTP_USERNAME"), os.getenv("OC2025_FTP_PASSWORD"))
	ftp.cwd(os.getenv("OC2025_FTP_DIRECTORY"))
	count = 0
	while True:
		ret, frame = cap.read()
		diff = np.abs(frame.astype(np.int16) - first_frame.astype(np.int16))
		if diff.max() - diff.min() > 200:
			count += 1
		else:
			count = 0
		if count > 9:
			break
	imgs = []
	for i in range(4):
		ser.write(str(i).encode())
		time.sleep(.3)
		ret, frame = cap.read()
		imgs.append(cv2.LUT(frame, lut))
	imgs = np.array(imgs)
	imgs = np.clip(imgs[1:] - imgs[0], 0, 255)
	light = np.load("light.npy")
	lightT = light.T
	g = np.tensordot(imgs.transpose(1, 2, 0, 3), (np.linalg.inv(lightT @ light) @ lightT).T, axes=(2, 0))
	img_albedo = np.linalg.norm(g, axis=3)
	g_gray = g[:, :, 0] * .0722 + g[:, :, 1] * .7152 + g[:, :, 2] * .2126
	g_norm = np.linalg.norm(g_gray, axis=2)
	img_normal = np.zeros(imgs.shape[1:4])
	mask = g_norm != 0
	img_normal[mask] = g_gray[mask] / g_norm[mask, None]
	img_normal = ((img_normal * .5 + .5) * 255).astype(np.uint8)
	img_albedo = (img_albedo / np.max(img_albedo) * 255).astype(np.uint8)
	driver.execute_script("document.dispatchEvent(new CustomEvent('predict'))")
	q.get()
	filenames = ftp.nlst(".")
	while True:
		filename = base64.urlsafe_b64encode(random.randrange(0, 2 ** 64).to_bytes(8)).decode("utf-8").rstrip("=") + ".png"
		if filename not in filenames:
			break
	ftp.storbinary("STOR " + filename, io.BytesIO(driver.get_screenshot_as_png()))
	cv2.imshow("Normal", img_normal)
	cv2.imshow("Albedo", img_albedo)
	cv2.waitKey(0)
	driver.quit()

if __name__ == "__main__":
	PORT = 8000
	q = queue.Queue()
	main()