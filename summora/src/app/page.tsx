'use client';

import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Header from '@/components/Header';
import { Icon } from '@/components/Icons';
import RecordingControls from '@/components/RecordingControls';

export default function HomePage() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isRecording, setIsRecording] = useState(false);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
    const [recordingError, setRecordingError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

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

    useEffect(() => {
        return () => {
            mediaStream?.getTracks().forEach(track => track.stop());
        };
    }, [mediaStream]);

    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Authentication failed:", error);
        }
    };

    const handleStartRecording = async () => {
        setRecordedVideoUrl(null);
        setRecordingError(null);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setRecordingError("Your browser does not support media recording.");
            return;
        }

        try {
            console.log("Requesting user media...");
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            console.log("Got media stream:", stream);
            setMediaStream(stream);
            setIsRecording(true);
            recordedChunksRef.current = [];

            const options = MediaRecorder.isTypeSupported('video/webm')
                ? { mimeType: 'video/webm' }
                : undefined;

            const recorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                console.log("Data available:", event.data.size);
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            recorder.onerror = (e) => {
                console.error("MediaRecorder error:", e);
                setRecordingError("MediaRecorder error occurred. Check console for details.");
            };

            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                console.log("Recording stopped, blob size:", blob.size);
                setRecordedVideoUrl(url);
            };

            recorder.start();
            console.log("Recording started");

        } catch (err: any) {
            console.error("Error starting recording:", err.name, err.message);
            if (err.name === "NotAllowedError") {
                setRecordingError("Camera/Microphone permission denied. Please allow access.");
            } else if (err.name === "NotFoundError") {
                setRecordingError("No input devices found. Please connect a camera/mic.");
            } else {
                setRecordingError("Recording failed: " + err.message);
            }
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current) {
            console.log("Stopping recording...");
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaStream?.getTracks().forEach(track => track.stop());
            setMediaStream(null);
        }
    };

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
                        <h2 className="text-3xl font-bold mb-4">Welcome, {user.displayName}!</h2>
                        <p className="text-gray-400 mb-6">Click "Start Recording" to begin.</p>

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

                        {recordedVideoUrl && (
                            <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                                <h3 className="font-semibold mb-2">Recording Complete!</h3>
                                <p className="text-sm text-gray-400 mb-3">Download your recording below:</p>
                                <a
                                    href={recordedVideoUrl}
                                    download={`summora-recording-${new Date().toISOString()}.webm`}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                                >
                                    <Icon path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" className="w-4 h-4 mr-2" />
                                    Download Recording
                                </a>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center bg-gray-800 p-12 rounded-lg shadow-xl border border-gray-700 mt-10">
                        <h2 className="text-4xl font-extrabold mb-4">Unlock Your Meeting's Potential</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto mb-8">
                            Summora transcribes, summarizes, and extracts action items from your video calls.
                        </p>
                        <button onClick={handleLogin} className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800 transition-transform hover:scale-105">
                            <Icon path="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" className="-ml-1 mr-3 w-5 h-5" />
                            Get Started with Google
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
