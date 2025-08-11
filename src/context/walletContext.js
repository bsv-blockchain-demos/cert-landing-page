"use client"

import {
    WalletClient,
    AuthFetch,
} from '@bsv/sdk'
import { useContext, createContext, useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";

const WalletContext = createContext();

export const WalletContextProvider = ({ children }) => {
    const [userWallet, setUserWallet] = useState(null);
    const [userPubKey, setUserPubKey] = useState(null);
    const [authFetch, setAuthFetch] = useState(null);

    useEffect(() => {
        if (!userWallet) return;

        const requestedCertificates = {
            certifiers: {
              'identity-certifier-key': {
                certifiers: ["02f4403c1eecce28c8c82aab508ecdb763b8d924d4a235350c4e805d4e2d7f8819"],
                certificateTypes: [Buffer.from("CommonSource user identity").toString('base64')],
              }
            },
            acquisitionProtocol: 'direct'
          }

        const authFetch = new AuthFetch(userWallet, requestedCertificates);
        setAuthFetch(authFetch);
    }, [userWallet]);

    const initializeWallet = useCallback(async () => {
        try {
            const newWallet = new WalletClient('auto', 'localhost:4000');

            const isConnected = await newWallet.isAuthenticated();
            if (!isConnected) {
                console.error('Wallet not authenticated');
                return;
            }

            const identityKey = await newWallet.getPublicKey({ identityKey: true });

            // Only update state once everything is fetched
            setUserWallet(newWallet);
            setUserPubKey(identityKey);
            toast.success('Wallet connected successfully', {
                duration: 5000,
                position: 'top-center',
                id: 'wallet-connect-success',
            });
        } catch (error) {
            console.error('Failed to initialize wallet:', error);
            toast.error('Failed to connect wallet', {
                duration: 5000,
                position: 'top-center',
                id: 'wallet-connect-error',
            });
        }
    }, []);

    useEffect(() => {
        initializeWallet();
    }, []);

    return (
        <WalletContext.Provider value={{ userWallet, userPubKey, initializeWallet, authFetch }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWalletContext = () => useContext(WalletContext);