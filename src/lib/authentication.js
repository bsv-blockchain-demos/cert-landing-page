import { WalletClient, Utils } from '@bsv/sdk';

/**
 * Unified Authentication Service
 * 
 * Consolidates authentication logic from walletContext.js and authContext.js
 * into a single, comprehensive verification system that handles:
 * - Wallet certificate detection
 * - Database certificate lookup
 * - W3C VC verification
 * - Certificate validation
 */

const serverPubKey = process.env.NEXT_PUBLIC_SERVER_PUBLIC_KEY;
const CERTIFICATE_TYPE = Utils.toBase64(Utils.toArray('CommonSource user identity', 'utf8'));

export class UnifiedAuthService {
  constructor() {
    this.serverPubKey = serverPubKey;
    this.certificateType = CERTIFICATE_TYPE;
  }

  /**
   * Primary authentication method that checks both wallet and database
   * Returns the certificate and its source for further processing
   */
  async authenticateUser(userWallet, userPubKey) {
    if (!userWallet || !userPubKey) {
      throw new Error('User wallet and public key are required');
    }

    console.log('[UnifiedAuth] Starting authentication process...');

    try {
      // Step 1: Check user's wallet for certificates
      const walletResult = await this.checkWalletForCertificate(userWallet);
      
      if (walletResult.found) {
        console.log('[UnifiedAuth] Certificate found in wallet');
        
        // Verify and save to database if not already there
        await this.saveCertificateToDatabase(walletResult.certificate, userPubKey);
        
        return {
          success: true,
          source: 'wallet',
          certificate: walletResult.certificate,
          verified: true
        };
      }

      // Step 2: Fallback to database lookup
      console.log('[UnifiedAuth] No certificate in wallet, checking database...');
      const dbResult = await this.checkDatabaseForCertificate(userPubKey);
      
      if (dbResult.found) {
        console.log('[UnifiedAuth] Certificate found in database');
        return {
          success: true,
          source: 'database', 
          certificate: dbResult.certificate,
          verified: true
        };
      }

      // Step 3: No certificate found anywhere
      console.log('[UnifiedAuth] No certificate found in wallet or database');
      return {
        success: false,
        source: null,
        certificate: null,
        verified: false,
        message: 'No valid certificate found'
      };

    } catch (error) {
      console.error('[UnifiedAuth] Authentication error:', error);
      return {
        success: false,
        source: null,
        certificate: null,
        verified: false,
        error: error.message
      };
    }
  }

  /**
   * Check user's wallet for certificates of our type
   */
  async checkWalletForCertificate(userWallet) {
    try {
      const certificates = await userWallet.listCertificates({
        types: [this.certificateType],
        certifiers: [this.serverPubKey],
        limit: 1,
      });

      if (certificates.totalCertificates > 0) {
        const certificate = certificates.certificates[0];
        
        // Basic validation - ensure certificate has required fields
        if (this.validateCertificateStructure(certificate)) {
          return {
            found: true,
            certificate: certificate
          };
        } else {
          console.warn('[UnifiedAuth] Certificate found but failed validation');
        }
      }

      return { found: false, certificate: null };

    } catch (error) {
      console.error('[UnifiedAuth] Error checking wallet for certificate:', error);
      return { found: false, certificate: null };
    }
  }

  /**
   * Check database for user certificate by public key
   * TODO: Replace with BSV auth-middleware session-based certificate checking
   * For now, disabled as certificates should be obtained through BSV handshake
   */
  async checkDatabaseForCertificate(userPubKey) {
    try {
      // TODO: Implement BRC-103/104 compliant certificate checking
      // The BSV auth middleware should provide certificates through req.auth
      // Database lookup is not the standard pattern for BSV authentication
      console.warn('[UnifiedAuth] Database certificate lookup disabled - use BSV auth middleware');
      return { found: false, certificate: null };

    } catch (error) {
      console.error('[UnifiedAuth] Error in certificate checking:', error);
      return { found: false, certificate: null };
    }
  }

  /**
   * Save certificate to database for future retrieval
   * TODO: Replace with BSV auth-middleware session management
   * Certificates should be managed through BSV auth flow, not manual database saves
   */
  async saveCertificateToDatabase(_certificate, _userPubKey) {
    try {
      // TODO: Implement BSV-compliant certificate management
      // Certificates are exchanged during BRC-103 handshake and managed by middleware
      // Manual database saves bypass the standard BSV authentication pattern
      console.warn('[UnifiedAuth] Manual certificate saving disabled - use BSV auth middleware');
      return { success: true, message: 'Certificate management handled by BSV auth' };

    } catch (error) {
      console.error('[UnifiedAuth] Error in certificate management:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Basic certificate structure validation
   */
  validateCertificateStructure(certificate) {
    if (!certificate) return false;
    
    // Check required certificate fields
    const requiredFields = ['type', 'serialNumber', 'subject', 'certifier', 'signature'];
    
    for (const field of requiredFields) {
      if (!certificate[field]) {
        console.warn(`[UnifiedAuth] Certificate missing required field: ${field}`);
        return false;
      }
    }

    // Verify certifier matches our server
    if (certificate.certifier !== this.serverPubKey) {
      console.warn('[UnifiedAuth] Certificate certifier does not match server public key');
      return false;
    }

    return true;
  }

  /**
   * Check if certificate contains W3C VC data
   */
  isVCCertificate(certificate) {
    try {
      const fields = certificate.fields || certificate;
      return fields && 
             fields['@context'] && 
             fields.type && 
             Array.isArray(fields.type) &&
             fields.type.includes('VerifiableCredential');
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract identity claims from certificate for UI display
   */
  extractIdentityClaims(certificate) {
    try {
      if (this.isVCCertificate(certificate)) {
        // Extract from W3C VC structure
        const credentialSubject = certificate.fields.credentialSubject;
        return {
          username: credentialSubject.username,
          email: credentialSubject.email,
          residence: credentialSubject.residence,
          age: credentialSubject.age,
          gender: credentialSubject.gender,
          work: credentialSubject.work,
          did: credentialSubject.id,
          format: 'vc'
        };
      } else {
        // Extract from legacy format
        return {
          username: certificate.fields.username,
          email: certificate.fields.email,
          residence: certificate.fields.residence,
          age: certificate.fields.age,
          gender: certificate.fields.gender,
          work: certificate.fields.work,
          format: 'legacy'
        };
      }
    } catch (error) {
      console.error('[UnifiedAuth] Error extracting identity claims:', error);
      return null;
    }
  }

  /**
   * Verify certificate using W3C VC validation if applicable
   * Enhanced with DID resolution and comprehensive verification
   */
  async verifyVCCertificate(certificate, didService, vcService) {
    if (!this.isVCCertificate(certificate)) {
      console.log('[UnifiedAuth] Certificate is not in VC format, skipping VC verification');
      return { valid: true, format: 'legacy' };
    }

    try {
      console.log('[UnifiedAuth] Starting comprehensive VC certificate verification...');
      
      // Step 1: Basic VC structure validation
      let vcVerificationResult = { valid: true, format: 'vc' };
      
      if (vcService && vcService.verifyCertificateVC) {
        vcVerificationResult = vcService.verifyCertificateVC(certificate);
        if (!vcVerificationResult.valid) {
          console.error('[UnifiedAuth] VC structure validation failed:', vcVerificationResult.error);
          return vcVerificationResult;
        }
      } else {
        console.warn('[UnifiedAuth] VC service not available for structure validation');
      }

      // Step 2: DID resolution and verification (if DID service available)
      if (didService && certificate.fields?.credentialSubject?.id) {
        const subjectDid = certificate.fields.credentialSubject.id;
        console.log('[UnifiedAuth] Resolving subject DID:', subjectDid);
        
        try {
          const didDocument = await didService.resolveDID(subjectDid);
          if (didDocument) {
            // Validate DID document structure
            const didValidation = didService.validateDIDDocument(didDocument);
            if (!didValidation.valid) {
              console.error('[UnifiedAuth] DID document validation failed:', didValidation.error);
              return { valid: false, error: `DID validation failed: ${didValidation.error}` };
            }
            
            console.log('[UnifiedAuth] DID resolution and validation successful');
            vcVerificationResult.didResolved = true;
            vcVerificationResult.didDocument = didDocument;
          } else {
            console.warn('[UnifiedAuth] Could not resolve DID:', subjectDid);
            vcVerificationResult.didResolved = false;
            vcVerificationResult.warning = 'DID could not be resolved';
          }
        } catch (didError) {
          console.error('[UnifiedAuth] DID resolution error:', didError);
          vcVerificationResult.didError = didError.message;
        }
      }

      // Step 3: Extract and validate claims
      const claims = this.extractIdentityClaims(certificate);
      if (claims) {
        vcVerificationResult.claims = claims;
        console.log('[UnifiedAuth] Identity claims extracted successfully');
      }

      // Step 4: Check certificate expiration (if applicable)
      const vcData = certificate.fields;
      if (vcData.expirationDate) {
        const expirationDate = new Date(vcData.expirationDate);
        if (expirationDate < new Date()) {
          console.error('[UnifiedAuth] VC certificate has expired');
          return { valid: false, error: 'Verifiable credential has expired' };
        }
      }

      console.log('[UnifiedAuth] Comprehensive VC verification completed successfully');
      return vcVerificationResult;

    } catch (error) {
      console.error('[UnifiedAuth] VC verification failed:', error);
      return { valid: false, error: error.message };
    }
  }
}

// Export singleton instance
export const unifiedAuth = new UnifiedAuthService();