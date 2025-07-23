import { NextResponse } from "next/server";
import { useWalletContext } from "../../context/walletContext";

export async function GET(request) {
    const { fieldsToReveal } = await request.json();
    if (!fieldsToReveal) {
        fieldsToReveal = [
            "username",
            "residence",
            "age",
            "gender",
            "email",
            "work"
        ];
    }
    try {
        const { userWallet, userPubKey } = useWalletContext();
        
        if (!userWallet || !userPubKey) {
            return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
        }

        const certificates = await userWallet.listCertificates({
            certifiers: "02f4403c1eecce28c8c82aab508ecdb763b8d924d4a235350c4e805d4e2d7f8819", // Pubkey from server where the certificate was created
            types: Buffer.from("CommonSource user identity").toString('base64'),
        });

        const certificatesWithData = await userWallet.proveCertificates({
            certificates,
            fieldsToReveal,
            verifier: "02f4403c1eecce28c8c82aab508ecdb763b8d924d4a235350c4e805d4e2d7f8819", // Pubkey from server/app
        });

        return NextResponse.json({ certificatesWithData });
    } catch (error) {
        console.error("Error fetching certificates:", error);
        return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 });
    }
}
