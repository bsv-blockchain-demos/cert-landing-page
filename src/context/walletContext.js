"use client"

import {
    WalletClient,
} from '@bsv/sdk'
import { useContext, createContext, useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";

const WalletContext = createContext();

export const WalletContextProvider = ({ children }) => {
    const [userWallet, setUserWallet] = useState(null);
    const [userPubKey, setUserPubKey] = useState(null);
    //const [serverWallet, setServerWallet] = useState(null);

    // useEffect(() => {
    //     const initializeServerWallet = async () => {
    //         try {
    //             const { wallet } = await fetch('/api/create-wallet', {
    //                 method: 'POST',
    //             });
    //             setServerWallet(wallet);
    //         } catch (error) {
    //             console.error('Failed to initialize server wallet:', error);
    //         }
    //     };
    //     initializeServerWallet();
    // }, []);

    const initializeWallet = useCallback(async () => {
        try {
            const newWallet = new WalletClient('auto', 'localhost:3000');

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
        <WalletContext.Provider value={{ userWallet, userPubKey, initializeWallet }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWalletContext = () => useContext(WalletContext);