'use client'; // This component uses client-side hooks for auth state

import React from 'react';
import { User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Icon } from './Icons';

interface HeaderProps {
    user: User | null;
    onLogin: () => void;
}

export default function Header({ user, onLogin }: HeaderProps) {
    const handleLogout = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Sign out failed:", error);
        }
    };

    return (
        <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-3">
                        <Icon path="M12 18.354a6 6 0 000-12.708v12.708zM12 18.354a6 6 0 010-12.708V5.646a6 6 0 010 12.708v-2.708z" className="w-8 h-8 text-blue-500" />
                        <h1 className="text-2xl font-bold tracking-tight text-white">Summora</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <img src={user.photoURL || ''} alt="User" className="w-8 h-8 rounded-full" />
                                <span className="hidden sm:inline text-sm text-white">{user.displayName}</span>
                                <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-800 transition-colors">
                                    Logout
                                </button>
                            </>
                        ) : (
                            <button onClick={onLogin} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800 transition-colors">
                                Login with Google
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
