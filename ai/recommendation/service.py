import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

try:
    from .predict import predict
except ImportError:
    from predict import predict

MODEL_PATH = os.environ.get("AI_MODEL_PATH", "ai/recommendation/model/recommendation.joblib")
PORT = int(os.environ.get("AI_PORT", "5100"))


class RecommendationHandler(BaseHTTPRequestHandler):
    def send_json(self, status: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self.send_json(200, {"available": os.path.exists(MODEL_PATH), "model_path": MODEL_PATH})
            return
        self.send_json(404, {"message": "AI route not found."})

    def do_POST(self):
        if self.path != "/recommend":
            self.send_json(404, {"message": "AI route not found."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length))
            result = predict(MODEL_PATH, payload.get("candidates", []))
            self.send_json(200, result)
        except FileNotFoundError as error:
            self.send_json(503, {"available": False, "message": str(error)})
        except Exception as error:
            self.send_json(400, {"message": str(error)})


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", PORT), RecommendationHandler).serve_forever()
