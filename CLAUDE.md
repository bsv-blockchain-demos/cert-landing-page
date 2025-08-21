# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

## Plan & Review

### Before starting work
- Always in plan mode to make a plan
- After get the plan, make sure you Write the plan to .claude/tasks/TASK_NAME.md
- The plan should be a detailed implementation plan and the reasoning behind them, as well as tasks broken down.
- If the task requires external knowledge or certain package, also research to get latest knowledge (Use Task tool for research)
- Don't over plan it, always think MVP.
- Once you write the plan, firstly ask me to review it. Do not continue until I approve the plan.

### Development
```bash
npm run dev           # Start Next.js dev server on http://localhost:3000
npm run build         # Build production bundle
npm start            # Start production server
npm run lint         # Run ESLint for code quality checks
```

### Testing
No test commands are currently configured. Consider adding tests for the authentication flows and API endpoints.

## High-Level Architecture

This is a Next.js 15 application demonstrating passwordless authentication using BSV (Bitcoin SV) certificates. The system enables cross-platform authentication where users authenticate via cryptographic certificates instead of passwords.

### Authentication Flow
1. **Wallet Connection**: User connects BSV wallet via `WalletClient` configured for localhost:3000
2. **Certificate Retrieval**: App requests certificates from wallet using certifier public key `02f4403c1eecce28c8c82aab508ecdb763b8d924d4a235350c4e805d4e2d7f8819`
3. **Field Selection**: User selects which personal fields to reveal (username, email, age, etc.)
4. **Verification**: Server creates verifier keyring for selective field disclosure
5. **Decryption**: Client-side decryption using `MasterCertificate.decryptFields()` reveals authorized data

### Context Architecture
The app uses React Context for state management across two domains:
- **WalletContext**: Manages BSV wallet connection, authentication status, and public key retrieval
- **AuthContext**: Stores certificate data and authentication state after successful login

### API Design Pattern
Server-side API routes handle cryptographic operations:
- `/api/get-certificates`: Creates verifier keyrings and retrieves user certificates
- `/api/create-wallet`: Server wallet management (currently commented out)

### BSV SDK Integration
The application leverages `@bsv/sdk` and `@bsv/wallet-toolbox-client` for:
- Certificate creation, verification, and field encryption/decryption
- Wallet connection and identity key management
- Selective field disclosure through verifier keyrings

### Environment Configuration
Required environment variables:
```
SERVER_PRIVATE_KEY                    # Server's BSV private key for certificate operations
SERVER_WALLET_STORAGE                  # Wallet storage service URL
NEXT_PUBLIC_SERVER_PUBLIC_KEY         # Public key for client-side certificate verification
```

### Certificate Field Schema
Supported user data fields for selective disclosure:
- username, residence, age, gender, email, work

Each field can be independently encrypted/decrypted based on user consent during authentication.