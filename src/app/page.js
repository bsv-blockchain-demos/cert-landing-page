"use client"

import React, { useEffect, useState } from "react";
import { useAuthContext } from "../context/authContext";
import { useWalletContext } from "../context/walletContext";
import { MasterCertificate } from "@bsv/sdk";
import { toast } from "react-hot-toast";

export default function Home() {
    const { userWallet, initializeWallet, userPubKey } = useWalletContext();
    const { certificates, setCertificates } = useAuthContext();
    const [fieldsToReveal, setFieldsToReveal] = useState([
        "username",
        "residence",
        "age",
        "gender",
        "email",
        "work"
    ]);
    const [fields, setFields] = useState([]);
    const [decryptedFields, setDecryptedFields] = useState([]);

    // Get the certificate from the server
    const handleLogin = async () => {
        if (!userWallet) {
            initializeWallet();
            return;
        }
        
        const response = await fetch("/api/get-certificates", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ fieldsToReveal: fieldsToReveal }),
        });

        console.log(response)

        if (!response.ok) {
            const error = await response.json();
            toast.error(error.error, {
                duration: 5000,
                position: 'top-center',
                id: 'certificates-fetch-error',
            });
            return;
        }
        
        const data = await response.json();
        console.log("data", data)
        setCertificates(data.certificateWithData);
        setFields(data.certificateWithData.fields);
        toast.success('Certificates fetched successfully', {
            duration: 5000,
            position: 'top-center',
            id: 'certificates-fetch-success',
        });
    };

    // Decrypt the certificate fields to show on frontend (user data)
    const decryptFields = async () => {
        // TODO Decrypt keyring keys (?)
        console.log("certificates", certificates)
        console.log("fields", certificates.fields)
        console.log("keyring", certificates.keyring)
        console.log(Object.keys(certificates.keyring).length)
        console.log("counterparty", certificates.certifier)

        const decryptedFields = await MasterCertificate.decryptFields(
            userWallet,
            certificates.keyring,
            certificates.fields,
            certificates.certifier,
        );
        console.log("decryptedFields", decryptedFields)
        setDecryptedFields(decryptedFields);
    }

    useEffect(() => {
        if (certificates) {
            decryptFields();
        }
    }, [certificates]);

    if (certificates) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
                <div className="max-w-md w-full space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-8">CommonSource</h1>
                        <div className="bg-slate-800 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-green-400 mb-4">Logged in successfully with certificate</h3>
                            <ul className="space-y-2">
                                {Object.entries(decryptedFields).map(([key, value]) => (
                                    <li key={key}>{key}: {value}</li>
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
                    disabled={userWallet}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {userWallet ? "Wallet Connected" : "Connect Wallet"}
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
                            Login with COMMONSource Certificate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
