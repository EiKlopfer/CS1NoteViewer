import http.server
import socketserver
import json  # Import the json module
import re  # Import the regex module for Markdown processing

PORT = 8000
text_file_path = 'CS1Notes.txt'

def markdown_to_html(markdown_text):
    # Convert Markdown headings (levels 1-6)
    markdown_text = re.sub(r'^###### (.*)', r'<h6>\1</h6>', markdown_text, flags=re.MULTILINE)
    markdown_text = re.sub(r'^##### (.*)', r'<h5>\1</h5>', markdown_text, flags=re.MULTILINE)
    markdown_text = re.sub(r'^#### (.*)', r'<h4>\1</h4>', markdown_text, flags=re.MULTILINE)
    markdown_text = re.sub(r'^### (.*)', r'<h3>\1</h3>', markdown_text, flags=re.MULTILINE)
    markdown_text = re.sub(r'^## (.*)', r'<h2>\1</h2>', markdown_text, flags=re.MULTILINE)
    markdown_text = re.sub(r'^# (.*)', r'<h1>\1</h1>', markdown_text, flags=re.MULTILINE)
    # Convert bold
    markdown_text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', markdown_text)
    # Convert italics
    markdown_text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', markdown_text)
    # Remove newlines immediately following headings
    markdown_text = re.sub(r'(</h[1-6]>)[\r\n\s]+', r'\1', markdown_text)
    return markdown_text

# Read and process the file once at server start
with open(text_file_path, 'r', encoding='utf-8') as file:
    # Apply markdown_to_html to each blob
    text_blobs = [markdown_to_html(blob.strip()) for blob in file.read().split('[PAGE]')]

class ServerHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path
        if path == "/all-blobs":  # New endpoint to serve all text blobs
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(text_blobs).encode('utf-8'))  # Send all text blobs as JSON
        else:
            return http.server.SimpleHTTPRequestHandler.do_GET(self)

def run(server_class=http.server.HTTPServer, handler_class=ServerHandler):
    server_address = ('', PORT)
    httpd = server_class(server_address, handler_class)
    print(f"Starting httpd server on port {PORT}")
    print(f"View at http://localhost:{PORT}")
    httpd.serve_forever()

if __name__ == "__main__":
    run()
