from selenium import webdriver
import base64, dotenv, ftplib, http.server, io, queue, random, os, socketserver, subprocess, threading

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
	dotenv.load_dotenv()
	ftp = ftplib.FTP(os.getenv("OC2025_FTP_HOSTNAME"))
	ftp.login(os.getenv("OC2025_FTP_USERNAME"), os.getenv("OC2025_FTP_PASSWORD"))
	ftp.cwd(os.getenv("OC2025_FTP_DIRECTORY"))
	q.get()
	filenames = ftp.nlst(".")
	while True:
		filename = base64.urlsafe_b64encode(random.randrange(0, 2**64).to_bytes(8)).decode("utf-8").rstrip("=") + ".png"
		if filename not in filenames:
			break
	ftp.storbinary("STOR " + filename, io.BytesIO(driver.get_screenshot_as_png()))
	driver.quit()

if __name__ == "__main__":
	PORT = 8000
	q = queue.Queue()
	main()