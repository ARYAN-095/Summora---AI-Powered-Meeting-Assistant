import React, { useRef, useEffect } from 'react';
import { Icon } from './Icons';

interface RecordingControlsProps {
  isRecording: boolean;
  mediaStream: MediaStream | null;
  onStart: () => void;
  onStop: () => void;
}

export default function RecordingControls({ isRecording, mediaStream, onStart, onStop }: RecordingControlsProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
      console.log("Attaching media stream to video element");
    }
  }, [mediaStream]);

  return (
    <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
      <div className="aspect-video bg-black rounded-md mb-4 relative overflow-hidden">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        {!mediaStream && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <Icon path="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" className="w-16 h-16" />
          </div>
        )}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600/80 text-white px-3 py-1 rounded-full text-sm">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>REC</span>
          </div>
        )}
      </div>
      <div className="flex justify-center space-x-4">
        <button
          onClick={onStart}
          disabled={isRecording}
          className="px-6 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all"
        >
          Start Recording
        </button>
        <button
          onClick={onStop}
          disabled={!isRecording}
          className="px-6 py-3 text-base font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all"
        >
          Stop Recording
        </button>
      </div>
    </div>
  );
}
