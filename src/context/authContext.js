"use client"

import { useContext, createContext, useState, useCallback } from "react";
import { useWalletContext } from "./walletContext";
import { useDidContext } from "./DidContext";
import { unifiedAuth } from '../lib/authentication';

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
    const [certificates, setCertificates] = useState(null);
    const { userWallet } = useWalletContext();
    const { verifyCertificateVC, isVCCertificate, bsvDidService, bsvVcService } = useDidContext();

    // Enhanced login with unified authentication and VC verification
    const loginWithCertificate = useCallback(async () => {
        try {
            if (!userWallet) {
                console.log('[AuthContext] No wallet available for login');
                return;
            }

            const { publicKey } = await userWallet.getPublicKey({ identityKey: true });
            console.log('[AuthContext] Starting enhanced login process...');

            // Use unified authentication service for comprehensive verification
            const authResult = await unifiedAuth.authenticateUser(userWallet, publicKey);
            
            if (authResult.success) {
                const certificate = authResult.certificate;
                
                // Enhanced VC verification with DID services
                const vcVerificationResult = await unifiedAuth.verifyVCCertificate(
                    certificate, 
                    bsvDidService,
                    bsvVcService || { verifyCertificateVC, isVCCertificate }
                );
                
                if (vcVerificationResult.valid) {
                    if (vcVerificationResult.format === 'vc') {
                        console.log('[AuthContext] VC certificate verification passed');
                        const claims = unifiedAuth.extractIdentityClaims(certificate);
                        console.log('[AuthContext] Identity claims extracted:', claims);
                    } else {
                        console.log('[AuthContext] Legacy certificate format verified');
                    }
                    
                    setCertificates(certificate);
                    console.log('[AuthContext] Login successful');
                    return true;
                    
                } else {
                    console.warn('[AuthContext] Certificate verification failed:', vcVerificationResult.error);
                    return false;
                }
            } else {
                console.log('[AuthContext] No certificate found for login');
                return false;
            }
            
        } catch (error) {
            console.error('[AuthContext] Error during enhanced login:', error);
            return false;
        }
    }, [userWallet, verifyCertificateVC, isVCCertificate, setCertificates, bsvDidService, bsvVcService]);

    return (
        <AuthContext.Provider value={{ certificates, setCertificates, loginWithCertificate }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => useContext(AuthContext);