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

        const authFetch = new AuthFetch(userWallet);
        setAuthFetch(authFetch);
    }, [userWallet]);

    const initializeWallet = useCallback(async () => {
        try {
            const newWallet = new WalletClient('auto', 'localhost');

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