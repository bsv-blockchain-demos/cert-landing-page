# BSV certificate age-gate demo

A Next.js application that connects to a BSV wallet, reads an `over18` certificate field and conditionally displays a demonstration whiskey and cigars storefront. It includes experimental DID and credential routes alongside the browser-based age gate.

The active page is [`src/app/page.js`](src/app/page.js), which wraps the storefront in `AgeVerificationGuard`. This is a client-side demonstration, with the implementation limits described below.

## How the current flow works

1. Connect a BRC-100 wallet through `WalletClient`.
2. Check for DID-related certificates, then fall back to certificates of the configured issuer and the legacy `Bvc` type used in the guard.
3. Create a verifier keyring requesting `over18`, decrypt certificate fields through the connected wallet, and read the boolean value.
4. Display the storefront when `over18` is `true`. If no suitable certificate is found, show a link to the configured onboarding application.

The code reads the boolean `over18`, rather than calculating age from a date of birth in the active guard.

## Run locally

Use Node.js 22, npm and a compatible wallet containing a certificate with an `over18` field. The issuing application must use a certificate type and issuer key compatible with this checkout.

```sh
git clone https://github.com/bsv-blockchain-demos/cert-landing-page.git
cd cert-landing-page
npm ci
```

Create `.env.local` manually; no environment template is included:

```dotenv
NEXT_PUBLIC_SERVER_PUBLIC_KEY=your_certifier_public_key
NEXT_PUBLIC_COMMON_SOURCE_URL=https://your-onboarding-host.example
```

`NEXT_PUBLIC_SERVER_PUBLIC_KEY` is the certifier's public identity key. `NEXT_PUBLIC_COMMON_SOURCE_URL` is where the **Get Age Verified** button sends users. The code has defaults for both, but a local issuer should be configured explicitly.

```sh
npm run dev
```

Open [localhost:3000](http://localhost:3000), connect the wallet, and test certificates with `over18` set to true and false, plus a wallet with no matching certificate. Confirm that only the true case displays the storefront.

The related [age-verification](https://github.com/bsv-blockchain-demos/age-verification) and [Over18Certifier](https://github.com/bsv-blockchain-demos/Over18Certifier) repositories demonstrate certificate issuance. Check issuer keys, certificate types and field formats before connecting these projects; sharing an `over18` field does not establish compatibility by itself.

## Implementation limits

- **Field disclosure:** the guard requests an `over18` verifier keyring, but then calls `MasterCertificate.decryptFields` with the original master keyring and the full certificate field map. The current implementation does not enforce an `over18`-only decryption boundary.
- **Certificate checks:** the age gate does not independently verify certificate signatures or revocation status. It should not be described as a complete certificate-verification service.
- **Access control:** rendering the store is controlled in the browser. No protected server-side purchase workflow or authenticated application session is implemented by the guard.
- **DID resolution:** `/api/resolve-did` returns a mock document. It does not resolve an overlay record.
- **Certificate retrieval API:** `/api/get-certificates` is unfinished, including undefined identifiers, a localhost wallet connection and a mismatched response shape. It is not a working integration endpoint.

## API status

| Route | Implemented behaviour |
| --- | --- |
| `POST /api/verify-certificate` | Accepts `{ certificate }`; checks required fields and VC expiry. Returns `{ valid, format, claims }` or an error. Does not verify a cryptographic signature. |
| `POST /api/resolve-did` | Accepts `{ did }`; checks the basic format and returns a mock DID document. |
| `POST /api/get-certificates` | Experimental and incomplete; see the limitations above. |

The separate Express experiment in `server/` is not started by the package scripts. It reads `SERVER_PRIVATE_KEY` and `WALLET_STORAGE_URL`, hardcodes the main network and currently logs its private key at startup. Do not supply a valuable key to that experiment.

## Development and deployment

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create the production and standalone builds |
| `npm start` | Start the production Next.js server |
| `npm run lint` | Run the existing Next.js lint command |

No automated test script is included. The build and lint commands can check the application structure, but they do not exercise wallet interactions or certificate disclosure.

The Dockerfile builds a standalone Next.js server and serves it on port 8080. Public environment variables must be present when `npm run build` runs. The Dockerfile currently has no build arguments for them, so runtime `docker run -e NEXT_PUBLIC_...` flags alone do not configure the browser bundle. Update the build configuration before deploying with your own issuer settings.

## Source map

- [`src/components/AgeVerificationGuard.js`](src/components/AgeVerificationGuard.js): active certificate lookup and age gate
- [`src/components/WhiskeyCigarsStore.js`](src/components/WhiskeyCigarsStore.js): demonstration storefront
- [`src/context/`](src/context/): wallet, DID and authentication state
- [`src/app/api/`](src/app/api/): experimental API routes
- [`src/lib/bsv/`](src/lib/bsv/): DID and credential helpers

## Licence

No licence file or package licence declaration is included in this checkout. The maintainers need to confirm the intended terms.
