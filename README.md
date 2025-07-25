# BSV Certificate Passwordless Authentication

A Next.js application demonstrating passwordless authentication using BSV (Bitcoin SV) certificates. This project enables users to log in without passwords by leveraging cryptographic certificates that can be verified by third-party applications within the same trust circle.

## Overview

This application showcases a revolutionary approach to user authentication using BSV blockchain technology. Instead of traditional username/password combinations, users authenticate using cryptographic certificates that contain encrypted personal information. These certificates can be shared across multiple applications within a trusted network, enabling seamless single sign-on experiences.

### Key Features

- **Passwordless Authentication**: Users log in using BSV certificates instead of passwords
- **Cross-Platform Compatibility**: Certificates can be used by third-party applications in the same trust circle
- **Privacy-Preserving**: Personal data is encrypted and only revealed to authorized verifiers
- **Selective Disclosure**: Users can choose which fields to reveal during authentication
- **Decentralized Identity**: Built on BSV blockchain for tamper-proof identity verification

## Technology Stack

- **Frontend**: Next.js 15.4.3, React 19.1.0, Tailwind CSS 4
- **BSV Integration**: @bsv/sdk, @bsv/wallet-toolbox-client
- **UI/UX**: react-hot-toast for notifications
- **Environment**: dotenv for configuration

## Architecture

### Core Components

1. **Wallet Context** (`src/context/walletContext.js`)
   - Manages BSV wallet connection and authentication
   - Handles wallet initialization and public key retrieval

2. **Auth Context** (`src/context/authContext.js`)
   - Manages certificate state and authentication status
   - Stores decrypted user data from certificates

3. **Certificate API** (`src/app/api/get-certificates/route.js`)
   - Retrieves user certificates from the BSV wallet
   - Creates verifier keyrings for selective field disclosure
   - Handles certificate verification and data extraction

4. **Wallet Creation API** (`src/app/api/create-wallet/route.js`)
   - Server-side wallet management
   - Handles private key derivation and storage

### Authentication Flow

1. **Wallet Connection**: User connects their BSV wallet to the application
2. **Certificate Request**: Application requests certificates from the user's wallet
3. **Field Selection**: User chooses which personal data fields to reveal
4. **Verification**: Server verifies the certificate and creates a verifier keyring
5. **Data Decryption**: Authorized fields are decrypted and displayed to the user
6. **Session Management**: User remains authenticated with their verified identity

## Getting Started

### Prerequisites

- Node.js 18+ installed
- BSV wallet with certificates (for testing)
- Access to BSV wallet storage service

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd landingpage
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with the following variables:
   ```env
   SERVER_PRIVATE_KEY=your_server_private_key_here
   SERVER_WALLET_STORAGE=your_wallet_storage_url_here
   NEXT_PUBLIC_SERVER_PUBLIC_KEY=your_server_public_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Usage

1. **Connect Wallet**: Click "Connect Wallet" to initialize your BSV wallet connection
2. **Login with Certificate**: Click "Login with Certificate" to authenticate using your BSV certificates
3. **View Profile**: Once authenticated, your decrypted profile information will be displayed

## Certificate Fields

The application supports the following user data fields:
- `username`: User's display name
- `residence`: User's location/address
- `age`: User's age
- `gender`: User's gender
- `email`: User's email address
- `work`: User's occupation/workplace

Users can selectively choose which fields to reveal during authentication.

## API Endpoints

### POST `/api/get-certificates`
Retrieves and verifies user certificates.

**Request Body:**
```json
{
  "fieldsToReveal": ["username", "email", "age"]
}
```

**Response:**
```json
{
  "certificateWithData": {
    "fields": {...},
    "keyring": {...},
    "certifier": "..."
  }
}
```

### POST `/api/create-wallet`
Creates a server-side wallet for certificate operations.

## Security Considerations

- **Private Keys**: Server private keys should be securely stored and never exposed
- **Certificate Verification**: All certificates are cryptographically verified before acceptance
- **Selective Disclosure**: Users maintain control over which data fields are revealed
- **Encrypted Storage**: Personal data is encrypted and only decrypted when authorized

## Third-Party Integration

This authentication system can be integrated into other applications within the same trust circle by:

1. Using the same certifier public key for certificate verification
2. Implementing similar certificate request and verification flows
3. Sharing the trust circle configuration and field schemas
4. Maintaining compatible encryption/decryption protocols

## Development

### Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── get-certificates/
│   │   └── create-wallet/
│   ├── page.js              # Main application component
│   ├── layout.js            # App layout and providers
│   └── globals.css          # Global styles
├── components/
│   └── toasts.js            # Toast notification components
└── context/
    ├── authContext.js       # Authentication state management
    └── walletContext.js     # Wallet connection management
```

### Building for Production

```bash
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add feature description'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## License

This project is part of the CommonSource BSV ecosystem. Please refer to the project license for usage terms.

## Support

For questions, issues, or contributions, please refer to the project maintainers or create an issue in the repository.

---

**Note**: This is a demonstration application. For production use, ensure proper security audits, key management, and compliance with relevant regulations.
