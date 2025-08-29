"use client";

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useWalletContext } from './walletContext';
import { BsvDidService } from '../lib/bsv/BsvDidService';
import { BsvVcService } from '../lib/bsv/BsvVcService';
import { Utils } from '@bsv/sdk';

const DidContext = createContext();

export const DidContextProvider = ({ children }) => {
  const { userWallet } = useWalletContext();
  const [userDid, setUserDid] = useState(null);
  const [didDocument, setDidDocument] = useState(null);
  const [serverDid, setServerDid] = useState(null);
  const [bsvDidService, setBsvDidService] = useState(null);
  const [bsvVcService, setBsvVcService] = useState(null);

  // Check wallet for existing DID certificates (ported from CommonSourceOnboarding)
  const checkWalletForDIDCertificates = useCallback(async () => {
    if (!userWallet) {
      console.log('[DidContext] No wallet available for DID certificate check');
      return null;
    }
    
    try {
      console.log('[DidContext] Checking wallet for existing DID certificates...');
      
      let certificates;
      try {
        certificates = await userWallet.listCertificates();
      } catch (listError) {
        console.warn('[DidContext] Failed to list certificates (possibly empty wallet):', listError);
        
        // Check if it's a JSON parse error (empty response)
        if (listError.message && listError.message.includes('JSON Parse error')) {
          console.log('[DidContext] Wallet appears to have no certificates (empty response)');
          return null;
        }
        
        // Re-throw other errors
        throw listError;
      }
      
      // Handle different response formats
      let certificateList = certificates;
      if (typeof certificates === 'string') {
        try {
          certificateList = JSON.parse(certificates);
        } catch (parseError) {
          console.warn('[DidContext] Failed to parse certificate response:', parseError);
          return null;
        }
      }
      
      // Ensure we have an array
      if (!Array.isArray(certificateList)) {
        if (certificateList && certificateList.certificates && Array.isArray(certificateList.certificates)) {
          certificateList = certificateList.certificates;
        } else {
          console.log('[DidContext] Certificate response is not an array:', typeof certificateList);
          return null;
        }
      }
      
      console.log('[DidContext] Found', certificateList.length, 'total certificates');
      
      const didDocumentType = Utils.toBase64(Utils.toArray('Bdid', 'base64'));
      const didCerts = certificateList.filter(cert => cert.type === didDocumentType);
      console.log('[DidContext] Found', didCerts.length, 'DID document certificates');
      
      if (didCerts.length > 0) {
        const firstDIDCert = didCerts[0];
        
        try {
          const didDocument = JSON.parse(firstDIDCert.fields.didDocument);
          
          console.log('[DidContext] ✅ Found existing DID certificate:', didDocument.id);
          return {
            did: didDocument.id,
            didDocument: didDocument,
            certificate: firstDIDCert,
            serialNumber: firstDIDCert.serialNumber
          };
        } catch (parseError) {
          console.error('[DidContext] Failed to parse DID document from certificate:', parseError);
          return null;
        }
      }
      
      console.log('[DidContext] No DID certificates found in wallet');
      return null;
      
    } catch (error) {
      console.error('[DidContext] Error checking wallet for DID certificates:', error);
      return null;
    }
  }, [userWallet]);

  // Check localStorage for existing DID (legacy storage)
  const checkLocalStorageDID = useCallback(() => {
    try {
      const storedDid = localStorage.getItem('bsv_user_did');
      
      if (storedDid) {
        console.log('[DidContext] Found existing DID in localStorage:', storedDid);
        return { did: storedDid, existing: true };
      }
      
      return null;
    } catch (error) {
      console.error('[DidContext] Error checking localStorage for DID:', error);
      return null;
    }
  }, []);

  // Unified DID loading - checks certificates first, then localStorage
  const loadExistingDID = useCallback(async () => {
    try {
      console.log('[DidContext] Loading existing DID with unified approach...');
      
      // 1. Check wallet certificates first (primary storage)
      const walletDID = await checkWalletForDIDCertificates();
      if (walletDID) {
        console.log('[DidContext] ✅ Loaded DID from wallet certificate:', walletDID.did);
        setUserDid(walletDID.did);
        setDidDocument(walletDID.didDocument);
        return walletDID;
      }
      
      // 2. Check localStorage (secondary/legacy storage)
      const localStorageDID = checkLocalStorageDID();
      if (localStorageDID) {
        console.log('[DidContext] Found DID in localStorage:', localStorageDID.did);
        setUserDid(localStorageDID.did);
        return localStorageDID;
      }
      
      console.log('[DidContext] No existing DID found in wallet certificates or localStorage');
      return null;
      
    } catch (error) {
      console.error('[DidContext] Error loading existing DID:', error);
      return null;
    }
  }, [checkWalletForDIDCertificates, checkLocalStorageDID]);

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

  // Create or retrieve user DID (unified approach)
  const createUserDid = useCallback(async () => {
    try {
      console.log('[DidContext] Creating user DID with unified approach...');
      
      // First try to load existing DID from certificates or localStorage
      const existingDID = await loadExistingDID();
      if (existingDID) {
        console.log('[DidContext] Using existing DID:', existingDID.did);
        return existingDID;
      }
      
      // No existing DID found, create new one
      console.log('[DidContext] Creating new DID...');
      if (!bsvDidService) {
        initializeDidServices();
      }
      
      const didResult = await bsvDidService.createUserDid();
      setUserDid(didResult.did);
      setDidDocument(didResult.didDocument);
      
      // Store in localStorage for cross-app compatibility
      localStorage.setItem('bsv_user_did', didResult.did);
      console.log('[DidContext] New user DID created and stored:', didResult.did);
      return didResult;

    } catch (error) {
      console.error('[DidContext] Error creating user DID:', error);
      throw error;
    }
  }, [loadExistingDID, bsvDidService, initializeDidServices]);

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

  // Migration helper - moves localStorage data to certificates when possible
  const migrateLocalStorageToWallet = useCallback(async () => {
    if (!userWallet) {
      console.log('[DidContext] No wallet available for migration');
      return false;
    }

    try {
      console.log('[DidContext] Checking for localStorage data that can be migrated...');
      
      // Check if we have DID in localStorage but not in certificates
      const localStorageDID = checkLocalStorageDID();
      if (localStorageDID) {
        const walletDID = await checkWalletForDIDCertificates();
        
        if (!walletDID) {
          console.log('[DidContext] Found DID in localStorage but not in wallet certificates');
          console.log('[DidContext] Migration would require creating new certificates with existing DID');
          // Note: Full migration would require re-creating certificates
          // This is a placeholder for future migration logic
          return false;
        }
      }
      
      // Check for VC data in localStorage that should be migrated
      const vcDataKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('vc_data_')) {
          vcDataKeys.push(key);
        }
      }
      
      if (vcDataKeys.length > 0) {
        console.log(`[DidContext] Found ${vcDataKeys.length} VC data entries in localStorage that could be migrated`);
        // Migration logic would go here
      }
      
      return true;
      
    } catch (error) {
      console.error('[DidContext] Error during migration check:', error);
      return false;
    }
  }, [userWallet, checkLocalStorageDID, checkWalletForDIDCertificates]);

  // Auto-load existing DID when wallet connects (unified approach)
  useEffect(() => {
    if (userWallet && !userDid) {
      console.log('[DidContext] Wallet connected, auto-loading existing DID...');
      
      // First load existing DID
      loadExistingDID()
        .then(() => {
          // Then check for migration opportunities
          return migrateLocalStorageToWallet();
        })
        .then((migrationResult) => {
          if (migrationResult) {
            console.log('[DidContext] Migration check completed');
          }
        })
        .catch(error => {
          console.error('[DidContext] Error auto-loading existing DID or migration:', error);
        });
    }
  }, [userWallet, userDid, loadExistingDID, migrateLocalStorageToWallet]);

  const value = {
    userDid,
    didDocument,
    serverDid,
    bsvDidService,
    bsvVcService,
    createUserDid,
    loadExistingDID,
    checkWalletForDIDCertificates,
    createIdentityVCData,
    verifyCertificateVC,
    isVCCertificate,
    initializeDidServices,
    migrateLocalStorageToWallet
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