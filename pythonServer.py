import http.server
import socketserver
import json
import os
import re
from urllib.parse import urlparse, parse_qs

PORT = 8000
NOTES_DIR = 'notes'  # Directory for notes files
file_cache = {}  # Cache processed files

def markdown_to_html(markdown_text):
    markdown_text = re.sub(r'^###### (.*)', r'<h6>\1</h6>', markdown_text, flags=re.MULTILINE)
    markdown_text = re.sub(r'^##### (.*)', r'<h5>\1</h5>', markdown_text, flags=re.MULTILINE)
    markdown_text = re.sub(r'^#### (.*)', r'<h4>\1</h4>', markdown_text, flags=re.MULTILINE)
    markdown_text = re.sub(r'^### (.*)', r'<h3>\1</h3>', markdown_text, flags=re.MULTILINE)
    markdown_text = re.sub(r'^## (.*)', r'<h2>\1</h2>', markdown_text, flags=re.MULTILINE)
    markdown_text = re.sub(r'^# (.*)', r'<h1>\1</h1>', markdown_text, flags=re.MULTILINE)
    markdown_text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', markdown_text)
    markdown_text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', markdown_text)
    markdown_text = re.sub(r'(</h[1-6]>)[\r\n\s]+', r'\1', markdown_text)
    return markdown_text

def get_available_files():
    return [f for f in os.listdir(NOTES_DIR) if f.endswith('.txt')]

def load_file_blobs(filename):
    path = os.path.join(NOTES_DIR, filename)
    if not os.path.isfile(path):
        return []
    with open(path, 'r', encoding='utf-8') as f:
        return [markdown_to_html(blob.strip()) for blob in f.read().split('[PAGE]')]

class ServerHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/list-files":
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(get_available_files()).encode('utf-8'))
        elif self.path.startswith("/load-file?"):
            query = parse_qs(urlparse(self.path).query)
            filename = query.get('name', [''])[0]
            if not filename:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Missing 'name' parameter")
                return
            
            filename = self.path.split('=')[-1]
            text_blobs = load_file_blobs(filename)  # always reload fresh
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(text_blobs).encode('utf-8'))
        else:
            return http.server.SimpleHTTPRequestHandler.do_GET(self)

def run(server_class=http.server.HTTPServer, handler_class=ServerHandler):
    os.makedirs(NOTES_DIR, exist_ok=True)
    server_address = ('', PORT)
    httpd = server_class(server_address, handler_class)
    print(f"Starting httpd server on port {PORT}")
    print(f"View at http://localhost:{PORT}")
    httpd.serve_forever()

if __name__ == "__main__":
    run()
