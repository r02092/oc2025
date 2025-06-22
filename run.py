from selenium import webdriver
import http.server, queue, os, socketserver, subprocess, threading

class WebDirHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
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
	with socketserver.TCPServer(("", PORT), WebDirHTTPRequestHandler) as http_server:
		http_server.serve_forever()

def main():
	global PORT, q
	subprocess.Popen(os.getenv("LOCALAPPDATA") + r"\Programs\VOICEVOX\vv-engine\run")
	threading.Thread(target=start_http_server, daemon=True).start()
	driver = webdriver.Chrome()
	driver.get("http://localhost:" + str(PORT))
	q.get()
	driver.quit()

if __name__ == "__main__":
	PORT = 8000
	q = queue.Queue()
	main()