import React from "react";
import { useAuthContext } from "../context/authContext";
import { useWalletContext } from "../context/walletContext";

export default function Home() {
    const { certificates, setCertificates } = useAuthContext();
    const { userWallet, initializeWallet } = useWalletContext();

    return (
      <div>
        <button disabled={userWallet} onClick={() => {
            initializeWallet();
        }}>
            Connect Wallet
        </button>
      {certificates.length === 0 ? (
        <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
            <h1>CommonSource</h1>
            <button disabled={!userWallet} onClick={async () => {
                const response = await fetch("/api/get-certificates", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
                const data = await response.json();
                setCertificates(data.certificatesWithData);
            }}>Get certificates</button>
        </div>
      ) : (
        <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
          <h1>CommonSource</h1>
          <ul>
            {certificates.map((certificate, index) => (
              <li key={index}>{certificate}</li>
            ))}
          </ul>
          <h3>Logged in successfully with certificate</h3>
        </div>
      )}
      </div>
    );
}
