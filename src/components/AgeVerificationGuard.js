"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWalletContext } from '../context/walletContext';
import { useDidContext } from '../context/DidContext';
import { MasterCertificate, VerifiableCertificate, Utils } from '@bsv/sdk';
import { verifyAgeFromCertificates } from '../lib/ageVerification';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, ShieldX, ShieldCheck } from 'lucide-react';

const MINIMUM_AGE = 18;
const COMMON_SOURCE_SERVER_KEY = process.env.NEXT_PUBLIC_SERVER_PUBLIC_KEY || "024c144093f5a2a5f71ce61dce874d3f1ada840446cebdd283b6a8ccfe9e83d9e4";
const COMMON_SOURCE_ONBOARDING_URL = process.env.NEXT_PUBLIC_COMMON_SOURCE_URL || "https://common-source-onboarding.vercel.app";

/**
 * Age Verification Guard Component
 * Blocks access to the entire site for users under 18
 * Uses certificates issued by CommonSourceOnboarding app
 */
export default function AgeVerificationGuard({ children }) {
  const { userWallet, initializeWallet } = useWalletContext();
  const { checkWalletForDIDCertificates } = useDidContext();
  const [verificationState, setVerificationState] = useState('checking'); // 'checking', 'verified', 'denied', 'no-certificate', 'error'
  const [verificationResult, setVerificationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Perform age verification using unified approach (certificates + DID documents)
  const performAgeVerification = useCallback(async (wallet) => {
    try {
      console.log('[AgeGuard] Starting unified age verification...');
      setIsLoading(true);

      let ageVerified = false;
      let userAge = null;
      let validCertificate = null;
      let verificationSource = null;

      // STEP 1: Check for DID Document certificates (NEW approach from CommonSourceOnboarding)
      console.log('[AgeGuard] Step 1: Checking for DID Document certificates...');
      try {
        if (checkWalletForDIDCertificates) {
          const didResult = await checkWalletForDIDCertificates();
          if (didResult) {
            console.log('[AgeGuard] Found DID document certificate:', didResult.did);
            
            // Look for corresponding identity certificates that might contain age
            let allCerts = [];
            try {
              const allCertsResult = await wallet.listCertificates();
              
              // Handle different response formats
              if (Array.isArray(allCertsResult)) {
                allCerts = allCertsResult;
              } else if (allCertsResult && Array.isArray(allCertsResult.certificates)) {
                allCerts = allCertsResult.certificates;
              } else if (typeof allCertsResult === 'string') {
                try {
                  const parsed = JSON.parse(allCertsResult);
                  allCerts = parsed.certificates || parsed || [];
                } catch (parseError) {
                  console.warn('[AgeGuard] Failed to parse all certificates response:', parseError);
                  allCerts = [];
                }
              }
            } catch (listAllError) {
              console.warn('[AgeGuard] Failed to list all certificates for DID check:', listAllError);
              
              // Check if it's a JSON parse error (empty response)
              if (listAllError.message && listAllError.message.includes('JSON Parse error')) {
                console.log('[AgeGuard] Wallet appears to have no certificates (empty response)');
                allCerts = [];
              } else {
                throw listAllError;
              }
            }
            
            const identityCerts = allCerts.filter(cert => 
              cert.type === Utils.toBase64(Utils.toArray('Bvc', 'base64')) &&
              cert.certifier === COMMON_SOURCE_SERVER_KEY
            );
            
            console.log('[AgeGuard] Found', identityCerts.length, 'identity certificates to check with DID');
            
            // Process identity certificates that might be linked to this DID
            for (const certificate of identityCerts) {
              const ageResult = await extractAgeFromCertificate(wallet, certificate);
              if (ageResult.age !== null) {
                userAge = ageResult.age;
                validCertificate = null; // No need to store certificate - using selective disclosure
                ageVerified = ageResult.age >= MINIMUM_AGE;
                verificationSource = 'DID + Identity Certificate';
                console.log('[AgeGuard] ✅ Age verified via DID + Identity certificate:', userAge);
                break;
              }
            }
          }
        }
      } catch (didError) {
        console.warn('[AgeGuard] Error checking DID certificates:', didError);
      }

      // STEP 2: Fallback to existing identity certificate approach (OLD approach)
      if (!ageVerified && userAge === null) {
        console.log('[AgeGuard] Step 2: Falling back to identity certificate approach...');
        
        let certificatesResult;
        let certificates = [];

        try {
          // Get certificates from wallet using the existing approach
          console.log('[AgeGuard] Attempting to list identity certificates...');
          
          try {
            certificatesResult = await wallet.listCertificates({
              types: [Utils.toBase64(Utils.toArray('Bvc', 'base64'))],
              certifiers: [COMMON_SOURCE_SERVER_KEY],
              limit: 10
            });
          } catch (listError) {
            console.warn('[AgeGuard] Failed to list certificates (possibly empty wallet):', listError);
            
            // Check if it's a JSON parse error (empty response)
            if (listError.message && listError.message.includes('JSON Parse error')) {
              console.log('[AgeGuard] Wallet appears to have no certificates (empty response)');
              certificates = [];
              // Continue execution with empty array
            } else {
              // Re-throw other errors
              throw listError;
            }
          }
          
          // Handle different response formats if we got a result
          if (certificatesResult) {
            if (typeof certificatesResult === 'string') {
              try {
                certificatesResult = JSON.parse(certificatesResult);
              } catch (parseError) {
                console.error('[AgeGuard] Failed to parse certificate response as JSON:', parseError);
                throw new Error(`Certificate response parsing failed: ${parseError.message}`);
              }
            }
            
            certificates = certificatesResult?.certificates || certificatesResult || [];
            
            // Ensure certificates is an array
            if (!Array.isArray(certificates)) {
              console.warn('[AgeGuard] Certificate response is not an array:', typeof certificates);
              certificates = [];
            }
          }
          
          console.log(`[AgeGuard] Found ${certificates.length} identity certificates in wallet`);
          
        } catch (certError) {
          console.error('[AgeGuard] Error retrieving identity certificates:', certError);
          throw new Error(`Certificate retrieval failed: ${certError.message}`);
        }

        // Process identity certificates
        for (const certificate of certificates) {
          const ageResult = await extractAgeFromCertificate(wallet, certificate);
          if (ageResult.age !== null) {
            userAge = ageResult.age;
            validCertificate = null; // No need to store certificate - using selective disclosure
            ageVerified = ageResult.age >= MINIMUM_AGE;
            verificationSource = 'Identity Certificate';
            console.log('[AgeGuard] ✅ Age verified via identity certificate:', userAge);
            break;
          }
        }
      }

      // If no age found in any certificates, redirect to get verified
      if (userAge === null) {
        console.log('[AgeGuard] No age information found - redirecting to CommonSourceOnboarding');
        setVerificationState('no-certificate');
        setIsLoading(false);
        return;
      }

      // Create verification result
      const result = {
        isVerified: ageVerified,
        age: userAge,
        certificate: validCertificate,
        source: verificationSource,
        reason: userAge !== null
          ? (ageVerified 
            ? `Age verified: ${userAge} years old via ${verificationSource}`
            : `Age verification failed: Must be at least ${MINIMUM_AGE}, found ${userAge}`)
          : 'No age information found in certificates'
      };

      console.log('[AgeGuard] Unified age verification result:', result);
      setVerificationResult(result);

      if (result.isVerified) {
        console.log(`[AgeGuard] Age verification passed: ${result.age} years old via ${result.source}`);
        setVerificationState('verified');
      } else {
        console.log(`[AgeGuard] Age verification failed: ${result.reason}`);
        if (result.age !== null && result.age < MINIMUM_AGE) {
          setVerificationState('denied');
        } else {
          setVerificationState('no-certificate');
        }
      }

    } catch (error) {
      console.error('[AgeGuard] Error during age verification:', error);
      setVerificationResult({ reason: error.message });
      setVerificationState('error');
    } finally {
      setIsLoading(false);
    }
  }, [checkWalletForDIDCertificates]);

  // Helper function to extract age from a certificate using selective disclosure
  const extractAgeFromCertificate = useCallback(async (wallet, certificate) => {
    try {
      console.log(`[AgeGuard] Checking certificate with selective disclosure:`, certificate.serialNumber || 'unknown');
      
      // Validate certificate structure before attempting selective disclosure
      if (!certificate.keyring || !certificate.fields || !certificate.certifier) {
        console.warn(`[AgeGuard] Certificate missing required fields, skipping...`);
        return { age: null, error: 'Missing required certificate fields' };
      }
      
      try {
        // Get wallet public key for verifier keyring
        const { publicKey } = await wallet.getPublicKey({ identityKey: true });
        
        // Create verifier keyring that only reveals age field (selective disclosure)
        const verifierKeyring = await MasterCertificate.createKeyringForVerifier(
          wallet,
          certificate.certifier,
          publicKey,
          certificate.fields,
          ['age'],  // Only reveal age - privacy preserving!
          certificate.keyring,
          certificate.serialNumber
        );
        
        // Create verifiable certificate with selective disclosure
        const verifiableCertificate = VerifiableCertificate.fromCertificate(
          certificate, 
          verifierKeyring
        );
        
        console.log(`[AgeGuard] ✅ Selective disclosure successful - only age field accessible`);
        
        // Privacy-preserving approach: Decrypt only the selectively disclosed age field
        // Use master keyring with selective fields to decrypt only age (maintains privacy)
        try {
          console.log(`[AgeGuard] Attempting privacy-preserving decryption of only age field...`);
          
          const decryptedFields = await MasterCertificate.decryptFields(
            wallet,
            certificate.keyring,  // Master keyring (has decryption power)
            verifiableCertificate.fields,  // Only age field (selective disclosure)
            certificate.certifier
          );
          
          console.log(`[AgeGuard] Successfully decrypted selective fields:`, Object.keys(decryptedFields || {}));
          
          // Access only the age field - other personal data was never included due to selective disclosure
          if (decryptedFields && decryptedFields.age) {
            const age = parseInt(decryptedFields.age);
            if (!isNaN(age) && age > 0 && age < 150) {
              console.log(`[AgeGuard] ✅ Privacy-preserving age verification: ${age} years old`);
              console.log(`[AgeGuard] Only age field decrypted - all other personal data remains private`);
              return { age };
            } else {
              console.warn(`[AgeGuard] Invalid age value after decryption: ${decryptedFields.age}`);
              return { age: null, error: `Invalid age value: ${decryptedFields.age}` };
            }
          } else {
            console.log(`[AgeGuard] No age field found in decrypted selective fields`);
            return { age: null, error: 'No age field found after selective decryption' };
          }
          
        } catch (selectiveDecryptError) {
          console.warn(`[AgeGuard] Privacy-preserving selective decryption failed:`, selectiveDecryptError);
          return { age: null, error: `Selective decryption failed: ${selectiveDecryptError.message}` };
        }
        
      } catch (selectiveDisclosureError) {
        console.warn(`[AgeGuard] Selective disclosure failed:`, selectiveDisclosureError);
        return { age: null, error: 'Selective disclosure failed' };
      }
      
    } catch (error) {
      console.warn(`[AgeGuard] Error processing certificate:`, error);
      return { age: null, error: error.message };
    }
  }, []);

  // Initialize wallet and perform verification
  useEffect(() => {
    const initAndVerify = async () => {
      try {
        let wallet = userWallet;
        
        // Initialize wallet if not already connected
        if (!wallet) {
          console.log('[AgeGuard] Initializing wallet...');
          wallet = await initializeWallet();
        }

        if (wallet) {
          await performAgeVerification(wallet);
        } else {
          console.log('[AgeGuard] Failed to initialize wallet');
          setVerificationState('no-certificate');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[AgeGuard] Error initializing wallet:', error);
        setVerificationState('error');
        setIsLoading(false);
      }
    };

    initAndVerify();
  }, [userWallet, initializeWallet, performAgeVerification]);

  // Show loading state
  if (isLoading || verificationState === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              Age Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Checking your age verification status...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show access denied for under-18 users
  if (verificationState === 'denied') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-red-600">
              <ShieldX className="h-8 w-8" />
              Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription className="text-center">
                You must be at least {MINIMUM_AGE} years old to access this website.
              </AlertDescription>
            </Alert>
            
            {verificationResult?.age && (
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">
                  Your verified age: {verificationResult.age} years old
                </p>
                {verificationResult?.source && (
                  <p className="text-xs text-muted-foreground">
                    Verified via: {verificationResult.source}
                  </p>
                )}
              </div>
            )}

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                This website contains products that are restricted to adults only.
              </p>
              <p className="text-xs text-muted-foreground">
                Please come back when you meet the age requirement.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show no certificate page
  if (verificationState === 'no-certificate') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-8 w-8" />
              Age Verification Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription className="text-center">
                You need an age-verified certificate to access this website.
              </AlertDescription>
            </Alert>

            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                This website requires proof that you are at least {MINIMUM_AGE} years old.
                Please get your age verified through our CommonSource identity system.
              </p>

              <Button 
                onClick={() => window.location.href = `${COMMON_SOURCE_ONBOARDING_URL}?returnUrl=${encodeURIComponent(window.location.href)}`}
                className="w-full"
              >
                Get Age Verified at CommonSource
              </Button>

              <p className="text-xs text-muted-foreground">
                After getting verified, return here to access the store.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (verificationState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Verification Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                There was an error verifying your age. Please try again.
              </AlertDescription>
            </Alert>

            {verificationResult?.reason && (
              <p className="text-sm text-muted-foreground text-center">
                Error: {verificationResult.reason}
              </p>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={() => window.location.reload()}
                className="flex-1"
                variant="outline"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.href = 'http://localhost:3000'}
                className="flex-1"
              >
                Get Verified
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Age verification passed - show the main application
  if (verificationState === 'verified') {
    console.log(`[AgeGuard] Access granted for ${verificationResult?.age} year old user`);
    return children;
  }

  // Fallback - should not reach here
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Loading...</p>
    </div>
  );
}