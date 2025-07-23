"use client"

import React from "react";
import { useAuthContext } from "../context/authContext";
import { useWalletContext } from "../context/walletContext";

export default function Home() {
    const { certificates, setCertificates } = useAuthContext();
    const { userWallet, initializeWallet } = useWalletContext();

    const handleLogin = async () => {
        if (!userWallet) {
            initializeWallet();
            return;
        }
        
        const response = await fetch("/api/get-certificates", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        const data = await response.json();
        setCertificates(data.certificatesWithData);
    };

    if (certificates.length > 0) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
                <div className="max-w-md w-full space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-8">CommonSource</h1>
                        <div className="bg-slate-800 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-green-400 mb-4">Logged in successfully with certificate</h3>
                            <ul className="space-y-2">
                                {certificates.map((certificate, index) => (
                                    <li key={index} className="text-sm text-slate-300 break-all">{certificate}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white relative">
            <div className="absolute top-4 right-4">
                <button
                    onClick={initializeWallet}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                    Connect Wallet
                </button>
            </div>
            
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="max-w-md w-full space-y-6">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold mb-2">Certify your identity</h2>
                    </div>
                    
                    <div className="space-y-4">            
                        <button
                            onClick={handleLogin}
                            disabled={!userWallet}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Login with Certificate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
