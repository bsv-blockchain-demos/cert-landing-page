// VC Data Resolver - Gets full user data from DID reference
import { BsvDidService } from '../services/BsvDidService';
import { BsvVcService } from '../services/BsvVcService';

/**
 * Resolves VC data from a certificate's DID reference
 * Since full user data is stored in VC, not certificate fields
 */
export async function resolveVCDataFromCertificate(certificate, decryptedFields) {
  try {
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

    // Initialize services
    const didService = new BsvDidService();
    const vcService = new BsvVcService();

    // Try to get stored VC data from localStorage (temporary solution)
    // In production, this should query the overlay network
    const storedVCKey = `vc_data_${didRef}`;
    const storedVC = localStorage.getItem(storedVCKey);
    
    if (storedVC) {
      const vcData = JSON.parse(storedVC);
      console.log('[VCResolver] Found stored VC data:', vcData);
      
      // Extract credentials from VC structure
      if (vcData.credentialSubject) {
        return vcData.credentialSubject;
      }
    }

    // If no stored VC, try to reconstruct from certificate fields
    // This is a fallback for older certificates
    console.log('[VCResolver] No stored VC data, using certificate fields as fallback');
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
 * Stores VC data locally (temporary solution until overlay is implemented)
 */
export function storeVCData(didRef, vcData) {
  try {
    const storedVCKey = `vc_data_${didRef}`;
    localStorage.setItem(storedVCKey, JSON.stringify(vcData));
    console.log('[VCResolver] Stored VC data for DID:', didRef);
  } catch (error) {
    console.error('[VCResolver] Error storing VC data:', error);
  }
}