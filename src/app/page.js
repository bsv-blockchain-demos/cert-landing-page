"use client"

import React, { useEffect, useState } from "react";
import { useAuthContext } from "../context/authContext";
import { useWalletContext } from "../context/walletContext";
import { useDidContext } from "../context/DidContext";
import { MasterCertificate, Utils } from "@bsv/sdk";
import { toast } from "react-hot-toast";

export default function Home() {
    const { userWallet, initializeWallet, authFetch } = useWalletContext();
    const { certificates, setCertificates, loginWithCertificate } = useAuthContext();
    const { createUserDid, createIdentityVCData, userDid, initializeDidServices } = useDidContext();
    const [fieldsToReveal, setFieldsToReveal] = useState([
        "username",
        "residence",
        "age",
        "gender",
        "email",
        "work"
    ]);
    const [user, setUser] = useState(null);
    const [decryptedFields, setDecryptedFields] = useState([]);

    // Enhanced login with DID/VC support
    const handleLogin = async () => {
        if (!userWallet) {
            await initializeWallet();
            return;
        }

        try {
            // Initialize DID services if needed
            initializeDidServices();

            // First try to login with existing certificate in wallet
            const walletLoginSuccess = await loginWithCertificate();
            
            if (walletLoginSuccess) {
                setUser({ loggedIn: true });
                toast.success('Logged in with wallet certificate', {
                    duration: 5000,
                    position: 'top-center',
                    id: 'wallet-login-success',
                });
                return;
            }

            // If no wallet certificate, try server authentication with AuthFetch
            const authResponse = await authFetch.fetch('http://localhost:8080/login', {
                method: 'POST',
                retryCounter: 10,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requestVC: true, // Request VC format if available
                    fieldsToReveal: fieldsToReveal
                })
            });

            console.log(authResponse);
            const data = await authResponse.json();
            console.log("data", data);

            if (!data.success) {
                toast.error(data.error, {
                    duration: 5000,
                    position: 'top-center',
                    id: 'login-error',
                });
                return;
            }

            // Check if certificate is in VC format
            const certificate = data.certificates[0] || data.certificates;
            if (certificate && certificate.fields && certificate.fields['@context']) {
                console.log('Received VC-format certificate from server');
            }

            setCertificates(data.certificates);
            setUser(data.user);
            toast.success('Login successful', {
                duration: 5000,
                position: 'top-center',
                id: 'login-success',
            });
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Login failed', {
                duration: 5000,
                position: 'top-center',
                id: 'login-error',
            });
        }
    };

    // Create DID for new users
    const handleCreateDid = async () => {
        try {
            if (!userWallet) {
                await initializeWallet();
                if (!userWallet) {
                    toast.error('Please connect wallet first');
                    return;
                }
            }

            initializeDidServices();
            
            // Create or retrieve user DID
            const didResult = await createUserDid();
            console.log('DID result:', didResult);
            
            if (didResult.existing) {
                toast.success(`Using existing DID: ${didResult.did.substring(0, 30)}...`, {
                    duration: 5000,
                    position: 'top-center',
                });
            } else {
                toast.success(`DID created: ${didResult.did.substring(0, 30)}...`, {
                    duration: 5000,
                    position: 'top-center',
                });
            }
            
            return didResult;
        } catch (error) {
            console.error('Error creating DID:', error);
            toast.error(`Failed to create DID: ${error.message}`, {
                duration: 5000,
                position: 'top-center',
            });
        }
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

    if (user) {
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
                        
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-slate-900 text-slate-400">Or</span>
                            </div>
                        </div>

                        <button
                            onClick={handleCreateDid}
                            disabled={!userWallet}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create New DID
                        </button>
                        
                        {userDid && (
                            <div className="mt-4 p-3 bg-slate-800 rounded-lg">
                                <p className="text-sm text-slate-400">DID Created:</p>
                                <p className="text-xs text-green-400 break-all">{userDid}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
