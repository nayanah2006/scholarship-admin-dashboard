"""Production HTTP wrapper around the pre-trained eligibility pipeline."""
from __future__ import annotations
import json, os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import joblib
import pandas as pd
HERE=Path(__file__).resolve().parent; MODEL=HERE/"eligibility_model"/"scholarship_model.joblib"; META=HERE/"eligibility_model"/"model_metadata.json"
FEATURES=["education_qualification","gender","community","religion","exservice_men","disability","sports","annual_percentage","income","india"]
pipeline=joblib.load(MODEL) if MODEL.exists() else None
class Handler(BaseHTTPRequestHandler):
 def send_json(self,status,value):
  data=json.dumps(value).encode(); self.send_response(status); self.send_header("Content-Type","application/json"); self.send_header("Content-Length",str(len(data))); self.end_headers(); self.wfile.write(data)
 def do_GET(self): self.send_json(200,{"status":"ok" if pipeline else "model_unavailable","model_available":bool(pipeline)}) if self.path=="/health" else self.send_json(404,{"message":"Route not found."})
 def do_POST(self):
  if self.path!="/eligibility": return self.send_json(404,{"message":"Route not found."})
  if not pipeline: return self.send_json(503,{"message":"Model unavailable. Run train_model.py first."})
  try:
   body=json.loads(self.rfile.read(int(self.headers.get("Content-Length",0)))); missing=[x for x in FEATURES if x not in body]
   if missing: raise ValueError("Missing fields: "+", ".join(missing))
   row=pd.DataFrame([{x:body[x] for x in FEATURES}]); predicted=int(pipeline.predict(row)[0]); prob=float(pipeline.predict_proba(row)[0][1]) if hasattr(pipeline,"predict_proba") else None
   self.send_json(200,{"eligible_prediction":bool(predicted),"eligible_probability":prob,"model":json.loads(META.read_text()).get("selected_model") if META.exists() else "unknown"})
  except (ValueError,json.JSONDecodeError) as error: self.send_json(400,{"message":str(error)})
  except Exception: self.send_json(500,{"message":"Prediction failed."})
 def log_message(self,*_): pass
ThreadingHTTPServer((os.getenv("AI_HOST","127.0.0.1"),int(os.getenv("AI_PORT","5100"))),Handler).serve_forever()
