import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { certificate } = await request.json();
        
        if (!certificate) {
            return NextResponse.json(
                { error: 'Certificate is required' },
                { status: 400 }
            );
        }

        // Check if certificate is in VC format
        const isVC = certificate.fields && 
                     certificate.fields['@context'] && 
                     certificate.fields.type && 
                     certificate.fields.type.includes('VerifiableCredential');

        if (isVC) {
            console.log('[API] Verifying VC certificate...');
            
            // Basic VC validation
            const requiredFields = ['@context', 'id', 'type', 'issuer', 'issuanceDate', 'credentialSubject'];
            const vcData = certificate.fields;
            
            for (const field of requiredFields) {
                if (!vcData[field]) {
                    return NextResponse.json({
                        valid: false,
                        error: `Missing required field: ${field}`,
                        format: 'vc'
                    });
                }
            }

            // Check expiration
            if (vcData.expirationDate) {
                const expirationDate = new Date(vcData.expirationDate);
                if (expirationDate < new Date()) {
                    return NextResponse.json({
                        valid: false,
                        error: 'Credential has expired',
                        format: 'vc'
                    });
                }
            }

            // Extract claims
            const claims = {
                did: vcData.credentialSubject.id,
                username: vcData.credentialSubject.username,
                email: vcData.credentialSubject.email,
                residence: vcData.credentialSubject.residence,
                age: vcData.credentialSubject.age,
                gender: vcData.credentialSubject.gender,
                work: vcData.credentialSubject.work,
                issuer: vcData.issuer,
                issuanceDate: vcData.issuanceDate,
                expirationDate: vcData.expirationDate
            };

            return NextResponse.json({
                valid: true,
                format: 'vc',
                claims: claims
            });

        } else {
            console.log('[API] Certificate is in legacy format');
            
            // Basic legacy certificate validation
            const requiredFields = ['type', 'serialNumber', 'subject', 'certifier', 'signature'];
            
            for (const field of requiredFields) {
                if (!certificate[field]) {
                    return NextResponse.json({
                        valid: false,
                        error: `Missing required field: ${field}`,
                        format: 'legacy'
                    });
                }
            }

            return NextResponse.json({
                valid: true,
                format: 'legacy',
                claims: certificate.fields || {}
            });
        }

    } catch (error) {
        console.error('[API] Error verifying certificate:', error);
        return NextResponse.json(
            { error: 'Failed to verify certificate' },
            { status: 500 }
        );
    }
}