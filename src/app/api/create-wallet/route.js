import {
    PrivateKey,
    KeyDeriver,
} from '@bsv/sdk'
import { WalletStorageManager, Services, Wallet, StorageClient, WalletSigner } from '@bsv/wallet-toolbox-client'
import { NextResponse } from 'next/server'

const PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY;
const STORAGE_URL = process.env.SERVER_WALLET_STORAGE;
console.log("PRIVATE_KEY", PRIVATE_KEY)
console.log("STORAGE_URL", STORAGE_URL)

async function makeWallet(chain, storageURL, privateKey) {
    const keyDeriver = new KeyDeriver(new PrivateKey(privateKey, 'hex'));
    const storageManager = new WalletStorageManager(keyDeriver.identityKey);
    const signer = new WalletSigner(chain, keyDeriver, storageManager);
    const services = new Services(chain);
    const wallet = new Wallet(signer, services);
    const client = new StorageClient(
        wallet,
        storageURL
    );
    await client.makeAvailable();
    await storageManager.addWalletStorageProvider(client);
    return wallet;
}

export async function POST(req) {
    const wallet = await makeWallet('main', STORAGE_URL, PRIVATE_KEY);
    if (!wallet) {
        return NextResponse.json({ error: "Failed to create wallet" }, { status: 500 });
    }
    return NextResponse.json({ wallet }, { status: 200 });
}
