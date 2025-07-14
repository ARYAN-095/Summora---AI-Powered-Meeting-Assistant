'use client'; // This is a client component because it uses hooks (useState, useEffect)

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Header from '@/components/Header';
import { Icon } from '@/components/Icons';

export default function HomePage() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- Authentication State Observer ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Save or update user data in Firestore
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
        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    // --- Event Handlers ---
    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Authentication failed:", error);
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
                        <h2 className="text-3xl font-bold mb-4">Welcome back, {user.displayName}!</h2>
                        <p className="text-gray-400 mb-6">This is your meeting dashboard. Upcoming sprints will add recording controls, live transcription, and your meeting archive here.</p>
                        <div className="bg-gray-900/50 p-6 rounded-lg border border-dashed border-gray-600 text-center">
                            <Icon path="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" className="mx-auto w-12 h-12 text-gray-500 mb-4" />
                            <h3 className="text-xl font-semibold">Ready to Record?</h3>
                            <p className="text-gray-500 mt-1">The recording functionality will be enabled in Sprint 2.</p>
                        </div>
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
