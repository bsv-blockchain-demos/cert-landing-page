import { NextResponse } from "next/server";
import axios from "axios";
import { WalletClient, VerifiableCertificate, MasterCertificate } from "@bsv/sdk";

export async function POST(req) {
    const body = await req.json();
    let { fieldsToReveal } = body;
    if (!fieldsToReveal) {
        fieldsToReveal = [
            "username",
            "isVC",
            "email",
            "didRef"
        ];
    }
    try {
        const userWallet = new WalletClient('json-api', 'localhost');

        if (!userWallet) {
            return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
        }

        // Lists all certificates in the user wallet from this certifier and type
        const certificates = await userWallet.listCertificates({
            certifiers: [serverPubKey],
            types: [Utils.toBase64(Utils.toArray('Bdid', 'base64')), Utils.toBase64(Utils.toArray('Bvc', 'base64'))],
            limit: 1,
        });

        if (certificates.totalCertificates === 0) {
            return NextResponse.json({ error: "No certificates found" }, { status: 404 });
        }

        const loginCert = certificates.certificates[0];
        console.log("certificates", certificates)

        // Hit new API endpoint from onboarding with loginCert
        // Example API body:
        // const { 
        //     certificate, 
        //     userIdentityKey, 
        //     verificationLevel = 'comprehensive',
        //     requireCryptographicProof = false 
        // } = body;

        const body = {
            certificate: loginCert,
            userIdentityKey: userWallet.getPublicKey({ identityKey: true }).publicKey,
            verificationLevel: 'comprehensive',
            requireCryptographicProof: false
        };

        const response = await axios.post('http://localhost:3000/api/verify-certificate', body);
        console.log("response", response);

        const { claims, verificationDetails, valid } = response.data.verificationResult;

        if (!valid) {
            // Check verificationDetails for what went wrong
            console.log("verificationDetails", verificationDetails);
            let errors = [];
            for (const detail of verificationDetails) {
                if (!detail.valid) {
                    errors.push(`${detail.error}`);
                }
            }

            return NextResponse.json({ error: "Certificate verification failed: " + errors.join(", ") }, { status: 401 });
        }

        // TODO: Resolve DID to actual user data from the Overlay
        // TODO: Actually make an auth session token instead of just relying on certificate state for log in

        return;

        // Use the DID fields returned from the overlay to get user info
        const decryptedFields = await MasterCertificate.decryptFields(
            userWallet,
            loginCert.keyring,
            loginCert.fields,
            loginCert.certifier,
        );
        console.log("decryptedFields", decryptedFields)

        const { publicKey } = await userWallet.getPublicKey({ identityKey: true });

        // Encrypts the keyrings so that only this verifier can decrypt the fields
        const verifierKeyring = await MasterCertificate.createKeyringForVerifier(
            userWallet,
            loginCert.certifier,
            publicKey,
            loginCert.fields,
            fieldsToReveal,
            loginCert.keyring,
            loginCert.serialNumber,
        )

        const verifiableCertificate = VerifiableCertificate.fromCertificate(loginCert, verifierKeyring);

        return NextResponse.json({ certificateWithData: verifiableCertificate });
    } catch (error) {
        console.error("Error fetching certificates:", error);
        return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 });
    }
}
