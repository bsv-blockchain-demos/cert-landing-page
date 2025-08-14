# Fix JSON Parse Error in BSV Certificate Retrieval

## Problem Statement

The application is experiencing "JSON Parse error: Unexpected EOF" when calling `wallet.listCertificates()` in the age verification system. While wallet connection succeeds, certificate retrieval fails with malformed JSON responses, blocking users from accessing the site.

## Complete Implementation Plan

### Phase 1: Critical Error Handling (Priority 1)
```
[CRITICAL PATH] Fix JSON Parsing Error
│
├── 1. Enhanced Try-Catch Block
│   ├── Wrap wallet.listCertificates() call
│   ├── Detect JSON-specific errors  
│   └── Implement immediate fallback
│
├── 2. Comprehensive Error Logging
│   ├── Log parameters before wallet call
│   ├── Log raw wallet responses
│   └── Categorize error types
│
└── 3. Graceful Fallback Implementation
    ├── Set 'no-certificate' state on errors
    ├── Preserve error details for debugging
    └── Maintain user experience flow
```

### Phase 2: Response Validation (Priority 2)
```
[DEFENSIVE] Validate Response Structure
│
├── 1. Response Structure Checking
│   ├── Verify certificatesResult exists
│   ├── Check object type validity
│   └── Handle null/undefined responses
│
├── 2. Property Validation
│   ├── Safely extract certificates array
│   ├── Validate totalCertificates count
│   └── Type checking for nested properties
│
└── 3. Edge Case Handling
    ├── Empty response objects
    ├── Missing expected properties
    └── Malformed nested structures
```

### Phase 3: Enhanced Debugging (Priority 3)
```
[SUPPORT] Debugging Infrastructure
│
├── 1. Detailed Parameter Logging
├── 2. Raw Response Logging  
├── 3. Timing Information
└── 4. Error Classification
```

## Specific Code Changes

### File: `/Users/jake/Desktop/cert-landing-page/src/components/AgeVerificationGuard.js`

#### Change 1: Enhanced Error Handling (Lines 33-37)
```javascript
// Replace the current wallet.listCertificates() call with:
let certificatesResult;
try {
  console.log('[AgeGuard] Calling wallet.listCertificates() with params:', {
    types: [Utils.toBase64(Utils.toArray('CommonSource user identity', 'utf8'))],
    certifiers: [COMMON_SOURCE_SERVER_KEY],
    limit: 10
  });
  
  certificatesResult = await wallet.listCertificates({
    types: [Utils.toBase64(Utils.toArray('CommonSource user identity', 'utf8'))],
    certifiers: [COMMON_SOURCE_SERVER_KEY],
    limit: 10
  });
  
  console.log('[AgeGuard] Raw wallet response:', certificatesResult);
} catch (error) {
  console.error('[AgeGuard] Certificate retrieval error:', error);
  if (error.message.includes('JSON') || error.message.includes('Unexpected')) {
    console.error('[AgeGuard] JSON parsing error detected - wallet returned malformed data');
  }
  setVerificationState('no-certificate');
  setVerificationResult({ reason: `Certificate retrieval failed: ${error.message}` });
  setIsLoading(false);
  return;
}
```

#### Change 2: Response Validation (Lines 41-49)
```javascript
// Replace response processing with:
if (!certificatesResult || typeof certificatesResult !== 'object') {
  console.log('[AgeGuard] Invalid response structure - redirecting to CommonSourceOnboarding');
  setVerificationState('no-certificate');
  setIsLoading(false);
  return;
}

const certificates = Array.isArray(certificatesResult.certificates) ? certificatesResult.certificates : [];
const totalCertificates = typeof certificatesResult.totalCertificates === 'number' ? certificatesResult.totalCertificates : 0;

console.log(`[AgeGuard] Found ${certificates.length} certificates in wallet (total: ${totalCertificates})`);
```

## Testing & Validation Strategy

### 1. Immediate Testing
- Verify no JSON parsing errors occur
- Check console logs show detailed debugging information

### 2. Regression Testing  
- Ensure existing age verification still works when certificates exist
- Verify certificate decryption flow remains intact

### 3. Edge Case Testing
- Test with wallet client disconnected
- Test with malformed JSON responses
- Test with empty response objects

### 4. User Experience Testing
- Verify clear error messages are displayed
- Confirm graceful fallback to certificate registration

## Success Metrics

- [ ] Zero "JSON Parse error: Unexpected EOF" messages
- [ ] Graceful fallback to certificate registration when retrieval fails
- [ ] Detailed console logging for debugging wallet communication issues
- [ ] Maintained functionality when certificates are available
- [ ] Clear error messages for users when certificate operations fail

## Implementation Status

- [ ] Phase 1: Critical Error Handling
- [ ] Phase 2: Response Validation  
- [ ] Phase 3: Enhanced Debugging
- [ ] Testing & Validation
- [ ] Production Deployment

## Notes

This plan addresses the root cause (JSON parsing errors) while maintaining existing functionality and improving overall debugging capabilities. The defensive programming approach ensures graceful degradation when wallet communication fails.