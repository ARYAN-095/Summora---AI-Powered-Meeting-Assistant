import os
import time
import requests
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)

# Config
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY")
NGROK_URL          = os.getenv("NGROK_URL")

if not (ASSEMBLYAI_API_KEY and GEMINI_API_KEY and NGROK_URL):
    raise ValueError("Missing ASSEMBLYAI_API_KEY, GEMINI_API_KEY, or NGROK_URL")

ASSEMBLYAI_API_URL = "https://api.assemblyai.com/v2"
GEMINI_API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"gemini-1.5-flash-latest:generateContent?key={GEMINI_API_KEY}"
)

@app.route('/process-video', methods=['POST'])
def process_video_endpoint():
    if 'recording' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['recording']
    if not file.filename:
        return jsonify({"error": "No selected file"}), 400

    headers = {'authorization': ASSEMBLYAI_API_KEY}

    # 1. Upload to AssemblyAI
    print("\n⏳ Uploading to AssemblyAI...")
    upload_resp = requests.post(f"{ASSEMBLYAI_API_URL}/upload",
                                headers=headers,
                                data=file.read())
    upload_resp.raise_for_status()
    upload_url = upload_resp.json()['upload_url']
    print("✅ Uploaded.")

    # 2. Submit transcription job
    print("⏳ Submitting transcription job...")
    transcript_resp = requests.post(
        f"{ASSEMBLYAI_API_URL}/transcript",
        json={
            "audio_url": upload_url,
            "webhook_url": f"{NGROK_URL}/transcription-complete",
            "speaker_labels": True
        },
        headers=headers
    )
    transcript_resp.raise_for_status()
    transcript_id = transcript_resp.json()['id']
    print(f"✅ Job submitted (ID: {transcript_id}).")

    # 3. Poll for completion
    print("⏳ Polling for transcription (every 2s)...", end='', flush=True)
    start = time.time()
    status = None
    while True:
        time.sleep(2)
        poll = requests.get(f"{ASSEMBLYAI_API_URL}/transcript/{transcript_id}",
                            headers=headers)
        poll.raise_for_status()
        status = poll.json()['status']
        print('.', end='', flush=True)
        if status == 'completed':
            break
        if status == 'error':
            raise RuntimeError("Transcription failed.")

    elapsed = time.time() - start
    print(f"\n✅ Transcription completed in {elapsed:.1f}s.")

    transcript_text = poll.json().get('text', '')

    # 4. Summarize with Gemini
    print("⏳ Generating summary via Gemini...")
    prompt = (
        "Based on the following meeting transcript, please provide:\n"
        "1. A concise 3–5 bullet summary of key points.\n"
        "2. A list of action items with assignees if mentioned.\n\n"
        f"Transcript:\n---\n{transcript_text}\n---"
    )
    gemini_resp = requests.post(
        GEMINI_API_URL,
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"}
        }
    )
    gemini_resp.raise_for_status()
    summary_json = gemini_resp.json()['candidates'][0]['content']['parts'][0]['text']
    print("✅ Summary generated:\n", summary_json)

    return jsonify({
        "message": "Transcription and summary complete",
        "transcription_time_s": round(elapsed, 1),
        "summary": summary_json
    }), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
