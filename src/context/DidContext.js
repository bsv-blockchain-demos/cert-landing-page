"use client";

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useWalletContext } from './walletContext';
import { BsvDidService } from '../lib/bsv/BsvDidService';
import { BsvVcService } from '../lib/bsv/BsvVcService';

const DidContext = createContext();

export const DidContextProvider = ({ children }) => {
  const { userWallet } = useWalletContext();
  const [userDid, setUserDid] = useState(null);
  const [serverDid, setServerDid] = useState(null);
  const [bsvDidService, setBsvDidService] = useState(null);
  const [bsvVcService, setBsvVcService] = useState(null);

  // Initialize DID services when wallet is available
  const initializeDidServices = useCallback(() => {
    if (userWallet && !bsvDidService) {
      const didService = new BsvDidService(userWallet);
      const vcService = new BsvVcService(didService);
      setBsvDidService(didService);
      setBsvVcService(vcService);
      console.log('[DidContext] DID services initialized');
    }
  }, [userWallet, bsvDidService]);

  // Create user DID
  const createUserDid = useCallback(async () => {
    try {
      if (!bsvDidService) {
        initializeDidServices();
      }
      
      const didResult = await bsvDidService.createUserDid();
      setUserDid(didResult.did);
      console.log('[DidContext] User DID created:', didResult.did);
      return didResult;
    } catch (error) {
      console.error('[DidContext] Error creating user DID:', error);
      throw error;
    }
  }, [bsvDidService, initializeDidServices]);

  // Create identity VC data
  const createIdentityVCData = useCallback((userData) => {
    if (!bsvVcService) {
      throw new Error('VC service not initialized');
    }

    const issuerDid = serverDid || `did:bsv:tm:${process.env.NEXT_PUBLIC_SERVER_PUBLIC_KEY}`;
    const subjectDid = userDid || 'did:bsv:tm:pending';

    return bsvVcService.createIdentityCredentialData({
      issuerDid,
      subjectDid,
      ...userData
    });
  }, [bsvVcService, serverDid, userDid]);

  // Verify certificate VC
  const verifyCertificateVC = useCallback((certificate) => {
    if (!bsvVcService) {
      console.warn('[DidContext] VC service not initialized');
      return { valid: false, error: 'VC service not initialized' };
    }
    return bsvVcService.verifyCertificateVC(certificate);
  }, [bsvVcService]);

  // Check if certificate is VC format
  const isVCCertificate = useCallback((certificate) => {
    if (!bsvVcService) {
      return false;
    }
    return bsvVcService.isVCCertificate(certificate);
  }, [bsvVcService]);

  // Initialize services when wallet becomes available
  useEffect(() => {
    if (userWallet && !bsvDidService) {
      initializeDidServices();
    }
  }, [userWallet, bsvDidService, initializeDidServices]);

  const value = {
    userDid,
    serverDid,
    bsvDidService,
    bsvVcService,
    createUserDid,
    createIdentityVCData,
    verifyCertificateVC,
    isVCCertificate,
    initializeDidServices
  };

  return (
    <DidContext.Provider value={value}>
      {children}
    </DidContext.Provider>
  );
};

export const useDidContext = () => {
  const context = useContext(DidContext);
  if (!context) {
    throw new Error('useDidContext must be used within a DidContextProvider');
  }
  return context;
};