import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { did } = await request.json();
        
        if (!did) {
            return NextResponse.json(
                { error: 'DID is required' },
                { status: 400 }
            );
        }

        // TODO: Implement actual DID resolution from database or BSV overlay network
        // For now, return a mock response for testing
        console.log('[API] Resolving DID:', did);
        
        // Parse DID to extract components
        const didParts = did.split(':');
        if (didParts.length !== 4 || didParts[0] !== 'did' || didParts[1] !== 'bsv') {
            return NextResponse.json(
                { error: 'Invalid DID format' },
                { status: 400 }
            );
        }

        // Mock DID document for testing
        const mockDidDocument = {
            '@context': ['https://www.w3.org/ns/did/v1'],
            id: did,
            verificationMethod: [{
                id: `${did}#key-1`,
                type: 'JsonWebKey2020',
                controller: did,
                publicKeyJwk: {
                    kty: 'EC',
                    crv: 'secp256k1',
                    x: 'mock-x-coordinate',
                    y: 'mock-y-coordinate',
                    use: 'sig'
                }
            }],
            authentication: [`${did}#key-1`],
            assertionMethod: [`${did}#key-1`]
        };

        return NextResponse.json({
            didDocument: mockDidDocument,
            resolved: true
        });

    } catch (error) {
        console.error('[API] Error resolving DID:', error);
        return NextResponse.json(
            { error: 'Failed to resolve DID' },
            { status: 500 }
        );
    }
}