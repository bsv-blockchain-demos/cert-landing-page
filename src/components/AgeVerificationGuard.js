"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWalletContext } from '../context/walletContext';
import { MasterCertificate, Utils } from '@bsv/sdk';
import { verifyAgeFromCertificates } from '../lib/ageVerification';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, ShieldX, ShieldCheck } from 'lucide-react';

const MINIMUM_AGE = 18;
const COMMON_SOURCE_SERVER_KEY = process.env.NEXT_PUBLIC_SERVER_PUBLIC_KEY || "024c144093f5a2a5f71ce61dce874d3f1ada840446cebdd283b6a8ccfe9e83d9e4";
const COMMON_SOURCE_ONBOARDING_URL = process.env.NEXT_PUBLIC_COMMON_SOURCE_URL || "https://commonsource-onboarding-e48e2juy2.vercel.app";

/**
 * Age Verification Guard Component
 * Blocks access to the entire site for users under 18
 * Uses certificates issued by CommonSourceOnboarding app
 */
export default function AgeVerificationGuard({ children }) {
  const { userWallet, initializeWallet } = useWalletContext();
  const [verificationState, setVerificationState] = useState('checking'); // 'checking', 'verified', 'denied', 'no-certificate', 'error'
  const [verificationResult, setVerificationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Perform age verification using the existing authentication context
  const performAgeVerification = useCallback(async (wallet) => {
    try {
      console.log('[AgeGuard] Starting age verification...');
      setIsLoading(true);

      let certificatesResult;
      let certificates = [];

      try {
        // Get certificates from wallet using the correct API with error handling
        console.log('[AgeGuard] Attempting to list certificates...');
        certificatesResult = await wallet.listCertificates({
          types: [Utils.toBase64(Utils.toArray('CommonSource user identity', 'utf8'))],
          certifiers: [COMMON_SOURCE_SERVER_KEY],
          limit: 10
        });
        
        console.log(`[AgeGuard] Raw certificate query result:`, certificatesResult);
        
        // Handle different response formats
        if (typeof certificatesResult === 'string') {
          try {
            certificatesResult = JSON.parse(certificatesResult);
          } catch (parseError) {
            console.error('[AgeGuard] Failed to parse certificate response as JSON:', parseError);
            throw new Error(`Certificate response parsing failed: ${parseError.message}`);
          }
        }
        
        certificates = certificatesResult?.certificates || [];
        console.log(`[AgeGuard] Found ${certificates.length} certificates in wallet`);
        
      } catch (certError) {
        console.error('[AgeGuard] Error retrieving certificates:', certError);
        throw new Error(`Certificate retrieval failed: ${certError.message}`);
      }

      if (certificatesResult?.totalCertificates === 0 || certificates.length === 0) {
        console.log('[AgeGuard] No certificates found - redirecting to CommonSourceOnboarding');
        setVerificationState('no-certificate');
        setIsLoading(false);
        return;
      }

      // For each certificate, decrypt the fields to extract age information
      let ageVerified = false;
      let userAge = null;
      let validCertificate = null;

      for (const certificate of certificates) {
        try {
          console.log(`[AgeGuard] Checking certificate:`, certificate.serialNumber || 'unknown');
          
          // Validate certificate structure before attempting decryption
          if (!certificate.keyring || !certificate.fields || !certificate.certifier) {
            console.warn(`[AgeGuard] Certificate missing required fields, skipping...`);
            continue;
          }
          
          // Decrypt the certificate fields to access the age
          let decryptedFields;
          try {
            decryptedFields = await MasterCertificate.decryptFields(
              wallet,
              certificate.keyring,
              certificate.fields,
              certificate.certifier
            );
            
            console.log(`[AgeGuard] Decrypted fields:`, decryptedFields);
          } catch (decryptError) {
            console.warn(`[AgeGuard] Certificate decryption failed:`, decryptError);
            continue;
          }
          
          // Check if this certificate contains age information
          if (decryptedFields && decryptedFields.age) {
            const age = parseInt(decryptedFields.age);
            if (!isNaN(age) && age > 0 && age < 150) {
              userAge = age;
              validCertificate = certificate;
              ageVerified = age >= MINIMUM_AGE;
              console.log(`[AgeGuard] Found valid age in certificate: ${age} years old`);
              break;
            } else {
              console.warn(`[AgeGuard] Invalid age value found: ${decryptedFields.age}`);
            }
          } else {
            console.log(`[AgeGuard] No age field found in certificate`);
          }
        } catch (decryptError) {
          console.warn(`[AgeGuard] Error processing certificate:`, decryptError);
          continue;
        }
      }

      const result = {
        isVerified: ageVerified,
        age: userAge,
        certificate: validCertificate,
        reason: userAge !== null
          ? (ageVerified 
            ? `Age verified: ${userAge} years old`
            : `Age verification failed: Must be at least ${MINIMUM_AGE}, found ${userAge}`)
          : 'No age information found in certificates'
      };

      console.log('[AgeGuard] Age verification result:', result);
      setVerificationResult(result);

      if (result.isVerified) {
        console.log(`[AgeGuard] Age verification passed: ${result.age} years old`);
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
              <p className="text-center text-sm text-muted-foreground">
                Your verified age: {verificationResult.age} years old
              </p>
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