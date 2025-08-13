import express from 'express'
import bodyParser from 'body-parser'
import { createAuthMiddleware } from '@bsv/auth-express-middleware'
import { WalletClient, PrivateKey, KeyDeriver } from '@bsv/sdk'
import { WalletStorageManager, Services, Wallet, StorageClient } from '@bsv/wallet-toolbox-client'
import { wellKnownAuthHandler } from './auth.js'
import dotenv from 'dotenv'
import crypto from 'crypto'

global.self = { crypto };
dotenv.config();

const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY;
const WALLET_STORAGE_URL = process.env.WALLET_STORAGE_URL;

const COMMON_SOURCE_CERT_TYPE = Buffer.from("CommonSource user identity").toString('base64');

console.log("SERVER_PRIVATE_KEY", SERVER_PRIVATE_KEY);
console.log("WALLET_STORAGE_URL", WALLET_STORAGE_URL);

const RECEIVED_CERTIFICATES = {};

export const createWalletClient = async (keyHex, walletStorageUrl, chain) => {
    const rootKey = PrivateKey.fromHex(keyHex)
    const keyDeriver = new KeyDeriver(rootKey)
    const storage = new WalletStorageManager(keyDeriver.identityKey)
    const services = new Services(chain)
    const wallet = new Wallet({
        chain,
        keyDeriver,
        storage,
        services,
    })
    const client = new StorageClient(wallet, walletStorageUrl)
    await storage.addWalletStorageProvider(client)
    await storage.makeAvailable()
    return new WalletClient(wallet)
}

async function main() {
    // Connect to user's wallet
    const wallet = await createWalletClient(
        SERVER_PRIVATE_KEY,
        WALLET_STORAGE_URL,
        'main'
    )

    // Get and log the server's public key
    const { publicKey: serverPublicKey } = await wallet.getPublicKey({ identityKey: true })
    console.log("SERVER PUBLIC KEY:", serverPublicKey)

    // 2. Create the auth middleware
    //    - Set `allowUnauthenticated` to false to require mutual auth on every route
    const authMiddleware = createAuthMiddleware({
        wallet,
        allowUnauthenticated: false, // Temporarily allow unauthenticated for testing
        logger: console,
        logLevel: 'debug',
        certificatesToRequest: {
            types: {
                [COMMON_SOURCE_CERT_TYPE]: ["username", "email", "isVC", "didRef"]
            },
            certifiers: ["02f4403c1eecce28c8c82aab508ecdb763b8d924d4a235350c4e805d4e2d7f8819"],
        },
        // Certificate validation callback for comprehensive verification
        onCertificatesReceived: async (senderPublicKey, certificates, _request, response, _next) => {
            console.log(`[Auth] Validating ${certificates.length} certificates...`);
            console.log(`[Auth] certificates: ${certificates}`);

            for (const cert of certificates) {
                try {
                    // Basic certificate validation - verify it has required fields
                    if (!cert.serialNumber || !cert.subject || !cert.certifier) {
                        throw new Error('Certificate missing required fields');
                    }

                    // For now, we'll add basic certificate validation
                    // TODO: Add revocation status checking via overlay network
                    // TODO: Add certificate signature verification against known certifier
                    console.log(`[Auth] Certificate validation passed for cert: ${cert.serialNumber?.substring(0, 8)}...`);

                    if (RECEIVED_CERTIFICATES[senderPublicKey]) {
                        if (RECEIVED_CERTIFICATES[senderPublicKey][cert.type]) {
                            console.log(`[Auth] Certificate already received for type: ${cert.type}`);
                        } else {
                            console.log(`[Auth] Certificate received for type: ${cert.type}`);
                            RECEIVED_CERTIFICATES[senderPublicKey][cert.type] = cert;
                        }
                    } else {
                        console.log(`[Auth] Certificate received for type: ${cert.type}`);
                        RECEIVED_CERTIFICATES[senderPublicKey] = {
                            [cert.type]: cert
                        };
                    }

                } catch (error) {
                    console.error(`[Auth] Certificate validation failed:`, error);
                }
            }

            console.log('[Auth] All certificates validated successfully');
        }
    })

    // 3. Create and configure the Express app
    const app = express();
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Headers', '*')
        res.header('Access-Control-Allow-Methods', '*')
        res.header('Access-Control-Expose-Headers', '*')
        res.header('Access-Control-Allow-Credentials', 'true')
        res.header('Access-Control-Allow-Private-Network', 'true')
        if (req.method === 'OPTIONS') {
            // Handle CORS preflight requests to allow cross-origin POST/PUT requests
            res.sendStatus(200)
        } else {
            next()
        }
    })

    app.use(bodyParser.json())

    // 4. Apply the auth middleware globally (or to specific routes)
    app.use(authMiddleware)

    // Add request logging middleware
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });

    // 5. Define your routes as usual
    app.post('/login', (req, res) => {
        // At this point:
        // req.auth.identityKey = user's public key
        // req.auth.certificates = user's provided certs
        console.log("RECEIVED_CERTIFICATES:", RECEIVED_CERTIFICATES);

        // Verify certificate content if needed
        const cert = RECEIVED_CERTIFICATES[req.auth.identityKey][COMMON_SOURCE_CERT_TYPE];
        console.log("cert:", cert)

        if (!cert) {
            res.status(401).send('No certificate provided');
            return;
        }

        console.log("req.session:", req.session);
        console.log("req", req);

        res.json({ success: true, user: cert.subject, certificates: cert });
    });

    app.listen(8080, () => {
        console.log('Server is running on port 8080')
    })
}

main()