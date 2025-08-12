"use client"

import React, { useEffect, useState } from "react";
import { useAuthContext } from "../context/authContext";
import { useWalletContext } from "../context/walletContext";
import { useDidContext } from "../context/DidContext";
import { MasterCertificate, Utils } from "@bsv/sdk";
import { toast } from "react-hot-toast";

export default function Home() {
    const { userWallet, initializeWallet } = useWalletContext();
    const { certificates, setCertificates, loginWithCertificate } = useAuthContext();
    const { createUserDid, createIdentityVCData, userDid, initializeDidServices } = useDidContext();
    // Removed fieldsToReveal as it's no longer used with proper BSV auth flow
    const [user, setUser] = useState(null);
    const [decryptedFields, setDecryptedFields] = useState([]);
    const [certificateGenerated, setCertificateGenerated] = useState(false);

    // Certificate generation similar to CommonSourceOnboarding
    const handleGenerateCertificate = async () => {
        try {
            if (!userWallet) {
                toast.error('Please connect wallet first');
                return;
            }

            if (!userDid) {
                toast.error('Please create DID first');
                return;
            }

            // Create identity certificate using CommonSourceOnboarding server
            const serverPubKey = process.env.NEXT_PUBLIC_SERVER_PUBLIC_KEY || "024c144093f5a2a5f71ce61dce874d3f1ada840446cebdd283b6a8ccfe9e83d9e4";
            
            console.log('Acquiring certificate from CommonSourceOnboarding server...');
            
            const certResponse = await userWallet.acquireCertificate({
                type: Utils.toBase64(Utils.toArray('CommonSource user identity', 'utf8')),
                fields: {
                    username: 'landing-page-user',
                    email: 'user@landing-page.com',
                    isVC: 'true',
                    didRef: userDid ? userDid.split(':').pop().substring(0, 8) : 'pending'
                },
                acquisitionProtocol: "issuance",
                certifier: serverPubKey,
                certifierUrl: "http://localhost:8080",
            });
            
            console.log('Certificate acquired:', certResponse);
            toast.success('Identity certificate generated successfully');
            setCertificateGenerated(true);

        } catch (error) {
            console.error('Error generating certificate:', error);
            toast.error(`Failed to generate certificate: ${error.message}`);
        }
    };

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

            // No wallet certificate found - user needs to acquire a certificate first
            console.log('No certificate found in wallet - user needs to acquire certificate first');
            toast.error('No certificate found. Please acquire a certificate first.', {
                duration: 5000,
                position: 'top-center',
                id: 'no-certificate-error',
            });
            return;
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

                        {userDid && !certificateGenerated && (
                            <button
                                onClick={handleGenerateCertificate}
                                disabled={!userWallet || !userDid}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Generate Certificate
                            </button>
                        )}

                        <button
                            onClick={() => {
                                localStorage.clear();
                                setCertificates(null);
                                setUser(null);
                                window.location.reload();
                            }}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900 text-sm"
                        >
                            Clear Local Data & Refresh
                        </button>

                        <button
                            onClick={async () => {
                                toast.info('Server connection: Use proper BSV authentication flow instead of test endpoints', { duration: 3000 });
                            }}
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-3 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-slate-900 text-sm"
                        >
                            BSV Auth Info
                        </button>
                        
                        {userDid && (
                            <div className="mt-4 p-3 bg-slate-800 rounded-lg">
                                <p className="text-sm text-slate-400">DID Created:</p>
                                <p className="text-xs text-green-400 break-all">{userDid}</p>
                            </div>
                        )}

                        {certificateGenerated && (
                            <div className="mt-4 p-3 bg-green-900 rounded-lg">
                                <p className="text-sm text-green-400">✅ Certificate Generated Successfully!</p>
                                <p className="text-xs text-slate-400">You can now login with your certificate</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
