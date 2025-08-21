/**
 * Age verification utilities for extracting and validating age from BSV certificates
 * issued by the CommonSourceOnboarding app
 */

/**
 * Extract age from certificate fields
 * @param {Object} certificate - BSV certificate object
 * @returns {number|null} - Age in years or null if cannot be determined
 */
export function extractAgeFromCertificate(certificate) {
  try {
    if (!certificate || !certificate.fields) {
      console.log('[AgeVerification] No certificate or fields found');
      return null;
    }

    // Look for age field in certificate
    if (certificate.fields.age) {
      const age = parseInt(certificate.fields.age);
      if (!isNaN(age) && age > 0 && age < 150) {
        console.log(`[AgeVerification] Found age in certificate: ${age}`);
        return age;
      }
    }

    // If no age field, try to calculate from birthdate if available
    if (certificate.fields.birthdate || certificate.fields.dateOfBirth) {
      const birthdate = certificate.fields.birthdate || certificate.fields.dateOfBirth;
      const age = calculateAgeFromBirthdate(birthdate);
      if (age !== null) {
        console.log(`[AgeVerification] Calculated age from birthdate: ${age}`);
        return age;
      }
    }

    console.log('[AgeVerification] No age information found in certificate fields');
    return null;

  } catch (error) {
    console.error('[AgeVerification] Error extracting age from certificate:', error);
    return null;
  }
}

/**
 * Calculate age from birthdate string
 * @param {string} birthdate - Birthdate in various formats (YYYY-MM-DD, MM/DD/YYYY, etc.)
 * @returns {number|null} - Age in years or null if invalid
 */
function calculateAgeFromBirthdate(birthdate) {
  try {
    const birth = new Date(birthdate);
    if (isNaN(birth.getTime())) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
  } catch (error) {
    console.error('[AgeVerification] Error calculating age from birthdate:', error);
    return null;
  }
}

/**
 * Check if user meets minimum age requirement
 * @param {number} userAge - User's age in years
 * @param {number} minimumAge - Minimum required age (default 18)
 * @returns {boolean} - True if user meets age requirement
 */
export function meetsAgeRequirement(userAge, minimumAge = 18) {
  return userAge !== null && userAge >= minimumAge;
}

/**
 * Validate certificate was issued by CommonSourceOnboarding
 * @param {Object} certificate - BSV certificate object
 * @param {string} trustedIssuer - Expected issuer public key
 * @returns {boolean} - True if certificate is from trusted issuer
 */
export function validateCertificateIssuer(certificate, trustedIssuer) {
  try {
    if (!certificate || !certificate.certifier) {
      return false;
    }

    // Compare the certificate's certifier with the expected CommonSourceOnboarding server public key
    const isValidIssuer = certificate.certifier === trustedIssuer;
    
    if (!isValidIssuer) {
      console.warn('[AgeVerification] Certificate not issued by trusted CommonSourceOnboarding server');
      console.warn(`Expected: ${trustedIssuer}`);
      console.warn(`Found: ${certificate.certifier}`);
    }

    return isValidIssuer;
  } catch (error) {
    console.error('[AgeVerification] Error validating certificate issuer:', error);
    return false;
  }
}

/**
 * Comprehensive age verification from wallet certificates
 * @param {Array} certificates - Array of certificates from user's wallet
 * @param {string} trustedIssuer - CommonSourceOnboarding server public key
 * @param {number} minimumAge - Minimum required age (default 18)
 * @returns {Object} - Verification result object
 */
export function verifyAgeFromCertificates(certificates, trustedIssuer, minimumAge = 18) {
  const result = {
    isVerified: false,
    age: null,
    certificate: null,
    reason: null
  };

  try {
    if (!certificates || certificates.length === 0) {
      result.reason = 'No certificates found in wallet';
      return result;
    }

    // Look for certificates from CommonSourceOnboarding
    const trustedCertificates = certificates.filter(cert => 
      validateCertificateIssuer(cert, trustedIssuer)
    );

    if (trustedCertificates.length === 0) {
      result.reason = 'No certificates found from CommonSourceOnboarding';
      return result;
    }

    // Extract age from the first valid certificate
    for (const certificate of trustedCertificates) {
      const age = extractAgeFromCertificate(certificate);
      
      if (age !== null) {
        result.age = age;
        result.certificate = certificate;
        result.isVerified = meetsAgeRequirement(age, minimumAge);
        result.reason = result.isVerified 
          ? `Age verified: ${age} years old`
          : `Age verification failed: Must be at least ${minimumAge}, found ${age}`;
        return result;
      }
    }

    result.reason = 'No age information found in certificates';
    return result;

  } catch (error) {
    console.error('[AgeVerification] Error verifying age from certificates:', error);
    result.reason = `Error during age verification: ${error.message}`;
    return result;
  }
}