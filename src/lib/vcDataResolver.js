// VC Data Resolver - Gets full user data from DID reference
// Updated to use unified approach: wallet certificates first, then localStorage
import { BsvDidService } from '../services/BsvDidService';
import { BsvVcService } from '../services/BsvVcService';
import { MasterCertificate, Utils } from '@bsv/sdk';

/**
 * Resolves VC data from a certificate's DID reference using unified storage approach
 * Checks wallet certificates first, then falls back to localStorage
 * Since full user data is stored in VC, not certificate fields
 */
export async function resolveVCDataFromCertificate(wallet, certificate, decryptedFields) {
  try {
    console.log('[VCResolver] Starting unified VC data resolution...');
    
    // Check if this is a VC-enabled certificate
    if (!decryptedFields.isVC || decryptedFields.isVC !== 'true') {
      console.log('[VCResolver] Certificate is not VC-enabled');
      return null;
    }

    // Get the DID reference from the certificate
    const didRef = decryptedFields.didRef;
    if (!didRef) {
      console.log('[VCResolver] No DID reference found in certificate');
      return null;
    }

    console.log('[VCResolver] Resolving VC data for DID:', didRef);

    // STEP 1: Check wallet certificates for DID Document containing VC data
    try {
      if (wallet) {
        console.log('[VCResolver] Checking wallet certificates for DID document...');
        const allCertificates = await wallet.listCertificates();
        const didDocumentType = Utils.toBase64(Utils.toArray('Bdid', 'base64'));
        
        // Look for DID Document certificates
        const didCerts = allCertificates.filter(cert => cert.type === didDocumentType);
        
        for (const didCert of didCerts) {
          try {
            // Parse DID document to check if it matches our DID reference
            const didDocument = JSON.parse(didCert.fields.didDocument);
            if (didDocument.id === didRef) {
              console.log('[VCResolver] Found matching DID document certificate');
              
              // Look for associated identity certificates with full VC data
              const identityCerts = allCertificates.filter(cert => 
                cert.type === Utils.toBase64(Utils.toArray('Bvc', 'base64'))
              );
              
              for (const identityCert of identityCerts) {
                try {
                  const identityFields = await MasterCertificate.decryptFields(
                    wallet,
                    identityCert.keyring,
                    identityCert.fields,
                    identityCert.certifier
                  );
                  
                  // If this identity certificate contains full VC data, return it
                  if (identityFields && (identityFields.username || identityFields.email)) {
                    console.log('[VCResolver] ✅ Found VC data in wallet certificate');
                    return {
                      username: identityFields.username || '',
                      email: identityFields.email || '',
                      age: identityFields.age || '',
                      residence: identityFields.residence || '',
                      gender: identityFields.gender || '',
                      work: identityFields.work || ''
                    };
                  }
                } catch (decryptError) {
                  console.warn('[VCResolver] Failed to decrypt identity certificate:', decryptError);
                  continue;
                }
              }
            }
          } catch (parseError) {
            console.warn('[VCResolver] Failed to parse DID document:', parseError);
            continue;
          }
        }
      }
    } catch (walletError) {
      console.warn('[VCResolver] Error checking wallet certificates:', walletError);
    }

    // STEP 2: Fallback to localStorage (legacy storage)
    console.log('[VCResolver] No VC data in wallet certificates, checking localStorage...');
    try {
      const storedVCKey = `vc_data_${didRef}`;
      const storedVC = localStorage.getItem(storedVCKey);
      
      if (storedVC) {
        const vcData = JSON.parse(storedVC);
        console.log('[VCResolver] ✅ Found stored VC data in localStorage');
        
        // Extract credentials from VC structure
        if (vcData.credentialSubject) {
          return vcData.credentialSubject;
        }
      }
    } catch (localStorageError) {
      console.warn('[VCResolver] Error reading from localStorage:', localStorageError);
    }

    // STEP 3: Final fallback - reconstruct from certificate fields
    console.log('[VCResolver] No stored VC data found, using certificate fields as final fallback');
    return {
      username: decryptedFields.username || '',
      email: decryptedFields.email || '',
      age: decryptedFields.age || '',
      residence: decryptedFields.residence || '',
      gender: decryptedFields.gender || '',
      work: decryptedFields.work || ''
    };

  } catch (error) {
    console.error('[VCResolver] Error resolving VC data:', error);
    return null;
  }
}

/**
 * Stores VC data using unified approach
 * Prefers certificate storage but falls back to localStorage for compatibility
 */
export async function storeVCData(wallet, didRef, vcData) {
  try {
    console.log('[VCResolver] Storing VC data for DID:', didRef);
    
    // STEP 1: Try to store in wallet certificates (preferred method)
    if (wallet) {
      try {
        console.log('[VCResolver] Attempting to store VC data in wallet certificates...');
        // Note: Actual certificate creation would need to be implemented
        // This would require creating a new identity certificate with the VC data
        // For now, we log that this is where certificate storage would happen
        console.log('[VCResolver] Certificate storage not yet implemented - using localStorage');
      } catch (certificateError) {
        console.warn('[VCResolver] Failed to store in certificates:', certificateError);
      }
    }
    
    // STEP 2: Store in localStorage (fallback/compatibility)
    try {
      const storedVCKey = `vc_data_${didRef}`;
      localStorage.setItem(storedVCKey, JSON.stringify(vcData));
      console.log('[VCResolver] ✅ Stored VC data in localStorage for DID:', didRef);
    } catch (localStorageError) {
      console.error('[VCResolver] Error storing VC data in localStorage:', localStorageError);
    }
    
  } catch (error) {
    console.error('[VCResolver] Error storing VC data:', error);
  }
}

/**
 * Legacy storage function for backward compatibility
 * @deprecated Use storeVCData(wallet, didRef, vcData) instead
 */
export function storeVCDataLegacy(didRef, vcData) {
  try {
    const storedVCKey = `vc_data_${didRef}`;
    localStorage.setItem(storedVCKey, JSON.stringify(vcData));
    console.log('[VCResolver] Stored VC data for DID (legacy):', didRef);
  } catch (error) {
    console.error('[VCResolver] Error storing VC data (legacy):', error);
  }
}

/**
 * Compatibility helper - cleans up old localStorage entries
 * This helps with migration from localStorage to certificate storage
 */
export function cleanupLegacyVCData() {
  try {
    const keysToRemove = [];
    
    // Find all VC data keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('vc_data_')) {
        keysToRemove.push(key);
      }
    }
    
    if (keysToRemove.length > 0) {
      console.log(`[VCResolver] Found ${keysToRemove.length} legacy VC data entries that could be cleaned up`);
      
      // For now, just log - don't actually remove until we're sure migration is complete
      keysToRemove.forEach(key => {
        console.log(`[VCResolver] Legacy entry: ${key}`);
      });
    }
    
    return keysToRemove.length;
    
  } catch (error) {
    console.error('[VCResolver] Error checking legacy VC data:', error);
    return 0;
  }
}

/**
 * Checks if we have data in both storage systems (for debugging migration)
 */
export async function checkStorageConsistency(wallet, didRef) {
  const results = {
    hasWalletData: false,
    hasLocalStorageData: false,
    consistent: true,
    details: {}
  };
  
  try {
    // Check wallet certificates
    if (wallet) {
      const certificates = await wallet.listCertificates();
      const didDocumentType = Utils.toBase64(Utils.toArray('Bdid', 'base64'));
      const didCerts = certificates.filter(cert => cert.type === didDocumentType);
      
      results.hasWalletData = didCerts.some(cert => {
        try {
          const didDocument = JSON.parse(cert.fields.didDocument);
          return didDocument.id === didRef;
        } catch {
          return false;
        }
      });
    }
    
    // Check localStorage
    const storedVCKey = `vc_data_${didRef}`;
    const storedVC = localStorage.getItem(storedVCKey);
    results.hasLocalStorageData = !!storedVC;
    
    // Log consistency status
    if (results.hasWalletData && results.hasLocalStorageData) {
      console.log(`[VCResolver] DID ${didRef} has data in both storage systems`);
    } else if (results.hasWalletData) {
      console.log(`[VCResolver] DID ${didRef} has data in wallet certificates only`);
    } else if (results.hasLocalStorageData) {
      console.log(`[VCResolver] DID ${didRef} has data in localStorage only`);
    } else {
      console.log(`[VCResolver] DID ${didRef} has no data in either storage system`);
    }
    
    return results;
    
  } catch (error) {
    console.error('[VCResolver] Error checking storage consistency:', error);
    return results;
  }
}