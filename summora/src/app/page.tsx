'use client';

import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Header from '@/components/Header';
import { Icon } from '@/components/Icons';
import RecordingControls from '@/components/RecordingControls';

// Define a type for the upload status
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function HomePage() {
    // --- Auth State ---
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- Recording & Upload State ---
    const [isRecording, setIsRecording] = useState(false);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [recordingError, setRecordingError] = useState<string | null>(null);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    // --- Auth State Observer ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                await setDoc(doc(db, "users", currentUser.uid), {
                    displayName: currentUser.displayName,
                    email: currentUser.email,
                    photoURL: currentUser.photoURL,
                    lastLogin: new Date()
                }, { merge: true });
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    // --- Cleanup media stream on component unmount ---
    useEffect(() => {
        return () => {
            mediaStream?.getTracks().forEach(track => track.stop());
        }
    }, [mediaStream]);

    // --- Event Handlers ---
    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Authentication failed:", error);
        }
    };

    const handleStartRecording = async () => {
        setRecordingError(null);
        setUploadStatus('idle'); // Reset upload status

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setRecordingError("Your browser does not support media recording.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setMediaStream(stream);
            setIsRecording(true);
            
            recordedChunksRef.current = [];
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                handleUpload(blob); // <-- NEW: Trigger upload on stop
            };

            recorder.start();
        } catch (err: any) {
            console.error("Error starting recording:", err);
            let errorMessage = "An unknown error occurred.";
            if (err.name === "NotAllowedError") {
                errorMessage = "Permission to use camera and microphone was denied. Please check your browser settings.";
            } else if (err.name === "NotFoundError") {
                errorMessage = "No camera or microphone found. Please ensure they are connected and enabled.";
            }
            setRecordingError(errorMessage);
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaStream?.getTracks().forEach(track => track.stop());
            setMediaStream(null);
        }
    };

    // --- NEW: File Upload Handler ---
    const handleUpload = async (blob: Blob) => {
        setUploadStatus('uploading');
        const formData = new FormData();
        formData.append('recording', blob, 'recording.webm');

        try {
            const response = await fetch('http://localhost:3001/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();
            console.log('Upload successful:', result);
            setUploadStatus('success');

        } catch (error) {
            console.error('Error uploading file:', error);
            setUploadStatus('error');
        }
    };

    // --- Render Logic ---
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading Summora...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white font-sans">
            <Header user={user} onLogin={handleLogin} />

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {user ? (
                    <div className="bg-gray-800 p-8 rounded-lg shadow-xl border border-gray-700">
                        <h2 className="text-3xl font-bold mb-4">Ready to Record, {user.displayName}?</h2>
                        <p className="text-gray-400 mb-6">Click "Start Recording" to begin. When you stop, the recording will be sent to our server for processing.</p>
                        
                        {recordingError && (
                            <div className="mb-4 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                                <p className="font-bold">Recording Error</p>
                                <p className="text-sm">{recordingError}</p>
                            </div>
                        )}

                        <RecordingControls 
                            isRecording={isRecording}
                            mediaStream={mediaStream}
                            onStart={handleStartRecording}
                            onStop={handleStopRecording}
                        />

                        {/* NEW: Upload Status Indicator */}
                        {uploadStatus !== 'idle' && (
                            <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                                {uploadStatus === 'uploading' && <p className="text-blue-300 animate-pulse">Uploading recording to server...</p>}
                                {uploadStatus === 'success' && <p className="text-green-400">✅ Recording successfully uploaded and saved!</p>}
                                {uploadStatus === 'error' && <p className="text-red-400">❌ There was an error uploading your recording.</p>}
                            </div>
                        )}
                    </div>
                ) : (
                     <div className="text-center bg-gray-800 p-12 rounded-lg shadow-xl border border-gray-700 mt-10">
                        <h2 className="text-4xl font-extrabold mb-4">Unlock Your Meeting's Potential</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto mb-8">
                            Summora automatically transcribes, summarizes, and extracts action items from your video calls. Login to get started.
                        </p>
                        <button onClick={handleLogin} className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800 transition-transform hover:scale-105">
                            <Icon path="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" className="-ml-1 mr-3 w-5 h-5" />
                            Get Started with Google
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}