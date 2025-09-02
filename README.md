# BSV Certificate Authentication with Age Verification

A Next.js application demonstrating passwordless authentication using BSV (Bitcoin SV) certificates with privacy-preserving age verification through selective disclosure. This project showcases how users can authenticate and prove their age without revealing unnecessary personal information.

## 🎯 Key Features

- **Passwordless Authentication**: Login using BSV certificates instead of passwords
- **Privacy-Preserving Age Verification**: Uses selective disclosure to reveal ONLY age, keeping all other personal data private
- **Age-Gated Content**: Demo whiskey & cigars store requiring 18+ verification
- **Cross-Platform Compatibility**: Certificates work across multiple applications in the same trust circle
- **DID Certificate Support**: W3C-compliant Decentralized Identifiers for identity management
- **CommonSource Integration**: Seamless onboarding flow for certificate issuance
- **Docker Deployment**: Containerized application with GitHub Actions CI/CD

## 🏗️ Architecture Overview

### Authentication Flow

1. **Wallet Connection**: User connects BSV wallet via `WalletClient`
2. **Certificate Retrieval**: App requests certificates using certifier public key
3. **Selective Disclosure**: Only the age field is made accessible through verifier keyring
4. **Privacy-Preserving Decryption**: Uses master keyring with selective fields to decrypt ONLY age
5. **Age Verification**: Validates user meets minimum age requirement (18+)
6. **Access Granted**: User can access age-gated content while maintaining privacy

### Core Components

- **AgeVerificationGuard** (`src/components/AgeVerificationGuard.js`)
  - Implements privacy-preserving age verification
  - Uses selective disclosure to access only age field
  - Redirects to CommonSource Onboarding if no valid certificate

- **WhiskeyCigarsStore** (`src/components/WhiskeyCigarsStore.js`)
  - Demo age-gated content requiring 18+ verification
  - Shows practical application of age verification

- **Wallet Context** (`src/context/walletContext.js`)
  - Manages BSV wallet connection and authentication
  - Handles identity key retrieval

- **DID Context** (`src/context/DidContext.js`)
  - Manages DID certificate checking and validation
  - Handles W3C DID resolution

- **Auth Context** (`src/context/authContext.js`)
  - Stores authentication state and certificate data
  - Manages user session

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- BSV wallet with valid certificates (MetaNet Desktop recommended)
- Access to CommonSource Onboarding for certificate issuance

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/cert-landing-page.git
   cd cert-landing-page
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env.local` file with the following:
   ```env
   # Required - Certificate verification public key
   NEXT_PUBLIC_SERVER_PUBLIC_KEY=024c144093f5a2a5f71ce61dce874d3f1ada840446cebdd283b6a8ccfe9e83d9e4
   
   # Required - CommonSource Onboarding URL for certificate issuance
   NEXT_PUBLIC_COMMON_SOURCE_URL=https://common-source-onboarding.vercel.app
   
   # Optional - Server private key for certificate operations
   SERVER_PRIVATE_KEY=your_private_key_here
   
   # Optional - BSV wallet storage service
   WALLET_STORAGE_URL=https://store-us-1.bsvb.tech/
   
   # Optional - BSV network (main or test)
   CHAIN=main
   ```

   For complete environment variable documentation, see [Environment Variables](#environment-variables) section below.

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint for code quality
```

## 🔐 Privacy & Security

### Selective Disclosure Implementation

This application implements **BRC-29 compliant selective disclosure** for privacy protection:

1. **Traditional Approach (Privacy Risk)**:
   ```javascript
   // ❌ Decrypts ALL certificate fields
   const decryptedFields = await MasterCertificate.decryptFields(
     wallet, certificate.keyring, certificate.fields, certificate.certifier
   );
   // Exposes: username, email, residence, gender, work, age, etc.
   ```

2. **Our Privacy-Preserving Approach**:
   ```javascript
   // ✅ Creates verifier keyring for ONLY age field
   const verifierKeyring = await MasterCertificate.createKeyringForVerifier(
     wallet, certificate.certifier, verifierPublicKey,
     certificate.fields, ['age'], // Only age field!
     certificate.keyring, certificate.serialNumber
   );
   
   // ✅ Decrypts using master keyring + selective fields
   const decryptedFields = await MasterCertificate.decryptFields(
     wallet, certificate.keyring, // Master keyring
     verifiableCertificate.fields, // Only age field from selective disclosure
     certificate.certifier
   );
   // Result: ONLY age is accessible, all other data remains private
   ```

### Security Features

- **Certificate Verification**: All certificates are cryptographically verified
- **Selective Field Access**: Users control which data fields are revealed
- **Encrypted Storage**: Personal data encrypted until authorized decryption
- **No Password Storage**: Eliminates password-related vulnerabilities

## 📋 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SERVER_PUBLIC_KEY` | Public key for certificate verification | `024c144093f5a2a5f71ce61dce874d3f1ada840446cebdd283b6a8ccfe9e83d9e4` |
| `NEXT_PUBLIC_COMMON_SOURCE_URL` | CommonSource Onboarding URL | `https://common-source-onboarding.vercel.app` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVER_PRIVATE_KEY` | Server's BSV private key | - |
| `WALLET_STORAGE_URL` | BSV wallet storage service | `https://store-us-1.bsvb.tech/` |
| `CHAIN` | BSV network (main/test) | `main` |

### DID/VC Configuration (Optional)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SERVER_DID` | Server's DID identifier |
| `DID_TOPIC` | DID topic for resolution |
| `VC_TOPIC` | Verifiable Credential topic |
| `OVERLAY_SERVICE_URL` | Overlay service for DID resolution |
| `CMSRC_PROTOCOL_ID` | Protocol identifier |


## 🔌 API Endpoints

### POST `/api/verify-certificate`
Verifies BSV certificates and validates claims.

**Request:**
```json
{
  "certificate": {...},
  "userIdentityKey": "public_key",
  "verificationLevel": "comprehensive",
  "requireCryptographicProof": false
}
```

**Response:**
```json
{
  "verificationResult": {
    "valid": true,
    "claims": {...},
    "verificationDetails": [...]
  }
}
```

### POST `/api/resolve-did`
Resolves DID to retrieve user data from overlay network.

**Request:**
```json
{
  "did": "did:bsv:example",
  "fields": ["age", "username"]
}
```

### POST `/api/get-certificates`
Retrieves user certificates with selective disclosure.

**Request:**
```json
{
  "fieldsToReveal": ["age"]
}
```

## 🐳 Docker Deployment

### Build and Run with Docker

```bash
# Build the Docker image
docker build -t cert-landing-page .

# Run the container
docker run -p 8080:8080 \
  -e NEXT_PUBLIC_SERVER_PUBLIC_KEY=your_key \
  -e NEXT_PUBLIC_COMMON_SOURCE_URL=https://common-source-onboarding.vercel.app \
  cert-landing-page
```

### GitHub Actions CI/CD

The project includes automated Docker builds via GitHub Actions:

- Triggers on: Tags (`v*`), main branch pushes, and pull requests
- Publishes to GitHub Container Registry (ghcr.io)
- Workflow file: `.github/workflows/docker-publish.yml`

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── verify-certificate/   # Certificate verification
│   │   ├── resolve-did/          # DID resolution
│   │   └── get-certificates/     # Certificate retrieval
│   ├── page.js                   # Main application
│   ├── layout.js                 # App layout
│   └── globals.css               # Global styles
├── components/
│   ├── AgeVerificationGuard.js   # Age verification logic
│   ├── WhiskeyCigarsStore.js     # Demo age-gated content
│   ├── toasts.js                 # Notifications
│   └── ui/                       # UI components
├── context/
│   ├── walletContext.js          # Wallet management
│   ├── DidContext.js             # DID management
│   └── authContext.js            # Auth state
└── lib/
    ├── ageVerification.js         # Age verification utilities
    ├── vcDataResolver.js          # VC data resolution
    └── bsv/
        ├── BsvDidService.js      # DID operations
        └── BsvVcService.js       # VC operations
```

## 🧪 Testing the Application

1. **Initial Visit**: Access the application at http://localhost:3000
2. **Age Gate**: You'll see the age verification screen
3. **No Certificate**: Click "Get Verified" to redirect to CommonSource Onboarding
4. **Complete Onboarding**: Fill in your details (ensure age is 18+)
5. **Return**: After certificate issuance, return to the application
6. **Automatic Verification**: The app will verify your age using selective disclosure
7. **Access Granted**: Browse the demo whiskey & cigars store

## 🤝 Third-Party Integration

Applications can integrate this authentication system by:

1. Using the same certifier public key for verification
2. Implementing selective disclosure for privacy
3. Following BRC-29 standards for certificate handling
4. Maintaining compatible encryption/decryption protocols

## 📚 Technical Standards

- **BRC-42**: BSV Key Derivation Scheme
- **BRC-29**: Selective Disclosure Protocol
- **BRC-103**: Identity Certificates
- **W3C DID**: Decentralized Identifiers v1.0

## 🛠️ Development Guidelines

### Before Starting Work
- Always use plan mode to create implementation plans
- Write plans to `.claude/tasks/TASK_NAME.md`
- Research latest package versions and best practices
- Get plan approval before implementation

### During Development
- Follow existing code conventions
- Use established libraries (check package.json first)
- Maintain privacy-first approach
- Run lint checks before committing

## 📄 License

This project is part of the CommonSource BSV ecosystem. Please refer to the project license for usage terms.

## 🆘 Support

For questions or issues:
- Create an issue in the repository
- Contact the BSV development team
- Check CommonSource documentation

---

**Note**: This is a demonstration application showcasing privacy-preserving age verification. For production use, ensure proper security audits, key management, and compliance with relevant regulations.