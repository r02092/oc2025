from selenium import webdriver
import http.server, os, socketserver, subprocess, threading

PORT = 8000

class WebDirHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, directory="webui/dist", **kwargs)

def start_http_server():
	with socketserver.TCPServer(("", PORT), WebDirHTTPRequestHandler) as http_server:
		http_server.serve_forever()

def main():
	subprocess.Popen(os.getenv("LOCALAPPDATA") + r"\Programs\VOICEVOX\vv-engine\run")
	threading.Thread(target=start_http_server, daemon=True).start()
	driver = webdriver.Chrome()
	driver.get("http://localhost:" + str(PORT))
	driver.quit()

if __name__ == "__main__":
	main()