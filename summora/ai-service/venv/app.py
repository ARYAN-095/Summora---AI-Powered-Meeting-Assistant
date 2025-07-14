import os
import requests
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()  # loads .env in current directory

app = Flask(__name__)

# --- Configuration (from .env) ---
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY")
NGROK_URL          = os.getenv("NGROK_URL")

# Validate config
if not ASSEMBLYAI_API_KEY or not GEMINI_API_KEY or not NGROK_URL:
    raise ValueError("Please set ASSEMBLYAI_API_KEY, GEMINI_API_KEY, and NGROK_URL in your .env file.")

ASSEMBLYAI_API_URL = "https://api.assemblyai.com/v2"
GEMINI_API_URL    = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"gemini-1.5-flash-latest:generateContent?key={GEMINI_API_KEY}"
)

# === ENDPOINTS ===

@app.route('/process-video', methods=['POST'])
def process_video_endpoint():
    if 'recording' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['recording']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        # 1. Upload to AssemblyAI
        headers = {'authorization': ASSEMBLYAI_API_KEY}
        upload_resp = requests.post(
            f"{ASSEMBLYAI_API_URL}/upload",
            headers=headers,
            data=file.read()
        )
        upload_resp.raise_for_status()
        upload_url = upload_resp.json()['upload_url']

        # 2. Submit transcription job with webhook to our ngrok URL
        transcript_payload = {
            "audio_url": upload_url,
            "webhook_url": f"{NGROK_URL}/transcription-complete",
            "speaker_labels": True
        }
        transcript_resp = requests.post(
            f"{ASSEMBLYAI_API_URL}/transcript",
            json=transcript_payload,
            headers=headers
        )
        transcript_resp.raise_for_status()
        transcript_id = transcript_resp.json()['id']

        return jsonify({
            "message": "Submitted for transcription",
            "transcription_id": transcript_id
        }), 200

    except Exception as e:
        print("Error in AI pipeline:", e)
        return jsonify({"error": "Failed to process video"}), 500


@app.route('/transcription-complete', methods=['POST'])
def transcription_complete_webhook():
    data = request.json or {}
    if data.get('status') != 'completed':
        return jsonify({"status": "ignored"}), 200

    transcript_text = data.get('text', '')
    try:
        prompt = f"""
Based on the following meeting transcript, please provide:
1. A concise 3–5 bullet summary of key points.
2. A list of action items with assignees if mentioned.

Transcript:
---
{transcript_text}
---"""

        gemini_payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": { "response_mime_type": "application/json" }
        }
        gemini_resp = requests.post(GEMINI_API_URL, json=gemini_payload)
        gemini_resp.raise_for_status()
        result = gemini_resp.json()
        summary_json = result['candidates'][0]['content']['parts'][0]['text']
        print("Final summary JSON:", summary_json)

    except Exception as e:
        print("Error calling Gemini:", e)

    return jsonify({"status": "processed"}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)
