# DeFiClaimShield

A privacy-first decentralized insurance claims platform built on Web3/fhEVM, enabling users to submit encrypted claims and supporting evidence. A decentralized claims officer DAO evaluates claims through Fully Homomorphic Encryption (FHE) voting without ever seeing sensitive claim details. Approved claims are automatically paid from a decentralized fund, preserving user privacy and trust.

## Project Background

Traditional insurance systems often face issues of privacy, bias, and inefficiency:

* **Data Exposure:** Users must reveal sensitive personal and financial details during claim submission.
* **Centralized Decision-Making:** Insurers may delay or manipulate claims due to internal biases.
* **Trust Deficit:** Users cannot verify whether claims are handled fairly without revealing private information.
* **Inefficient Processes:** Manual verification and processing lead to slow payouts and operational overhead.

DeFiClaimShield addresses these problems by leveraging FHE and blockchain:

* **Encrypted Claims Submission:** Users encrypt claims and evidence locally before submitting.
* **DAO-Based Evaluation:** A decentralized claims officer DAO votes on claims without accessing sensitive details.
* **Automatic Payouts:** Smart contracts handle approved claims instantly.
* **Privacy-Preserving Transparency:** Aggregated statistics and decisions are verifiable, but individual details remain confidential.

## Features

### Core Functionality

* **Encrypted Claim Submission:** Users submit claims and supporting evidence in encrypted form.
* **Decentralized DAO Voting:** Claims officer DAO evaluates claims through FHE-based voting.
* **Automated Payouts:** Approved claims trigger instant transfers from the decentralized insurance pool.
* **Transparent Aggregation:** Users can see claim statistics and approval rates without revealing private information.
* **Real-Time Dashboard:** Monitor claims, approvals, and pool statistics securely.

### Privacy & Security

* **Client-Side Encryption:** Claims are encrypted before leaving the user's device.
* **FHE Voting:** Claims evaluation is performed on encrypted data, ensuring sensitive information is never revealed.
* **Immutable Records:** All claims and votes are stored on-chain permanently.
* **Anonymity:** No personal identifiers are linked to submitted claims.
* **End-to-End Security:** Both the claim content and evaluation process remain confidential.

## Architecture

### Smart Contracts

`DeFiClaimShield.sol` (deployed on fhEVM)

* Manages encrypted claim submissions and DAO votes.
* Maintains immutable on-chain storage for claims, votes, and payouts.
* Automatically triggers payments for approved claims.
* Provides public visibility of aggregated statistics without compromising privacy.

### Frontend Application

* **React + TypeScript:** Interactive user interface with real-time updates.
* **Ethers.js:** Handles smart contract interactions securely.
* **Dashboard Components:** View claims statistics, DAO votes, and recent payouts.
* **Wallet Integration:** Supports Ethereum wallets for transaction signing.
* **Encrypted Input Forms:** Ensures claims and evidence are encrypted before submission.

## Technology Stack

### Blockchain & Smart Contracts

* **Solidity ^0.8.24:** Smart contract logic development.
* **fhEVM:** Full Homomorphic Encryption-enabled Ethereum Virtual Machine for encrypted computation.
* **Hardhat:** Development, testing, and deployment framework.
* **OpenZeppelin:** Standard secure libraries for smart contract patterns.

### Frontend

* **React 18 + TypeScript:** Modern and maintainable UI framework.
* **Ethers.js:** Blockchain and smart contract interaction.
* **Tailwind CSS:** Styling and responsive layouts.
* **React Icons:** UI iconography.
* **Real-Time Updates:** Fetches encrypted claim status and statistics directly from the blockchain.

## Installation

### Prerequisites

* Node.js 18+
* npm / yarn / pnpm
* Ethereum wallet (MetaMask, WalletConnect, etc.)

### Setup

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```
2. Configure wallet and network for fhEVM deployment.
3. Deploy smart contracts using Hardhat.
4. Run the frontend locally:

   ```bash
   npm start
   ```

## Usage

* **Submit Claim:** Users fill out encrypted claim forms and attach encrypted evidence.
* **Participate as DAO Officer:** Vote on claims without seeing sensitive information.
* **Monitor Statistics:** View aggregated claim approval rates and pool metrics.
* **Automatic Payouts:** Approved claims receive instant transfers from the decentralized fund.

## Security Considerations

* **End-to-End Encryption:** Claims and evidence remain encrypted at all times.
* **FHE Processing:** DAO voting occurs on encrypted data; no decryption is needed.
* **Immutable Ledger:** Smart contracts guarantee tamper-proof claim records.
* **Anonymous Participation:** Users’ identities remain private during submission and evaluation.
* **Auditability:** Aggregated results can be verified by anyone without compromising individual privacy.

## Future Enhancements

* Multi-layer DAO governance for dispute resolution.
* Advanced FHE-based analytics on claims patterns without exposing individual claims.
* Integration with multiple blockchain networks for interoperability.
* Mobile-optimized frontend with secure encrypted storage.
* Threshold alerts for unusual claim patterns or pool depletion.

Built with ❤️ to redefine privacy and trust in decentralized insurance claims.
