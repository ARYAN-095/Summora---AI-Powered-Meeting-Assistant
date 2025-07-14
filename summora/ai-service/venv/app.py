
import os
import requests
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

app = Flask(__name__)

# --- Configuration ---
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# --- IMPORTANT: Configure your ngrok URL ---
# After running 'ngrok http 5000', copy the HTTPS URL here.
YOUR_NGROK_URL = 'https://your-unique-ngrok-url.ngrok-free.app' # <--- PASTE YOUR NGROK URL HERE

ASSEMBLYAI_API_URL = "https://api.assemblyai.com/v2"
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={GEMINI_API_KEY}"

# --- Check for API Keys ---
if not ASSEMBLYAI_API_KEY or not GEMINI_API_KEY:
    raise ValueError("API keys for AssemblyAI or Gemini are not set in the .env file.")
if 'your-unique-ngrok-url' in YOUR_NGROK_URL:
    raise ValueError("Please update the YOUR_NGROK_URL constant in app.py")

# === API ENDPOINTS ===

@app.route('/process-video', methods=['POST'])
def process_video_endpoint():
    """
    Receives a video file from the Node.js gateway and starts the AI pipeline.
    """
    if 'recording' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['recording']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    print("1. File received from Node.js gateway.")

    try:
        # 1. Upload file to AssemblyAI hosting
        print("2. Uploading file to AssemblyAI...")
        headers = {'authorization': ASSEMBLYAI_API_KEY}
        upload_response = requests.post(f"{ASSEMBLYAI_API_URL}/upload", headers=headers, data=file.read())
        upload_url = upload_response.json()['upload_url']
        print(f"3. File successfully hosted at: {upload_url}")

        # 2. Submit the file for transcription
        print("4. Submitting file for transcription...")
        transcript_payload = {
            "audio_url": upload_url,
            "webhook_url": f"{YOUR_NGROK_URL}/transcription-complete",
            "speaker_labels": True
        }
        transcript_response = requests.post(f"{ASSEMBLYAI_API_URL}/transcript", json=transcript_payload, headers=headers)
        transcript_id = transcript_response.json()['id']
        print(f"5. Transcription job created with ID: {transcript_id}")

        return jsonify({"message": "File uploaded and submitted for transcription", "transcription_id": transcript_id}), 200

    except Exception as e:
        print(f"Error in AI pipeline: {e}")
        return jsonify({"error": "Failed to process video"}), 500


@app.route('/transcription-complete', methods=['POST'])
def transcription_complete_webhook():
    """
    Webhook endpoint for AssemblyAI to call when transcription is done.
    """
    response_json = request.json
    if response_json.get('status') != 'completed':
        print(f"Webhook received with status: {response_json.get('status')}. Ignoring.")
        return jsonify({"status": "received"}), 200

    print("6. Webhook received from AssemblyAI. Transcription complete.")
    transcript_text = response_json.get('text')
    print(f"7. Transcript received: {transcript_text[:100]}...") # Log first 100 chars

    # 3. Send transcript to Gemini for summarization
    print("8. Sending transcript to Gemini for summarization...")
    try:
        prompt = f"""
            Based on the following meeting transcript, please provide:
            1. A concise, 3 to 5 bullet point summary of the key discussion points.
            2. A list of all specific action items or tasks mentioned, with who is assigned if possible.

            Format the output as a clean JSON object with two keys: "summary" (an array of strings) and "actionItems" (an array of strings).

            Transcript:
            ---
            {transcript_text}
            ---
        """
        gemini_payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": { "response_mime_type": "application/json" }
        }
        gemini_response = requests.post(GEMINI_API_URL, json=gemini_payload)
        gemini_result = gemini_response.json()

        print("9. Received summary from Gemini!")
        print("--- FINAL RESULT ---")
        # The result is nested, so we access it directly
        final_summary_json = gemini_result['candidates'][0]['content']['parts'][0]['text']
        print(final_summary_json)
        print("--------------------")

        # In the next sprint, we'll save this to a database and notify the frontend.

    except Exception as e:
        print(f"Error calling Gemini API: {e}")

    return jsonify({"status": "processed"}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)
