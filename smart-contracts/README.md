# AgriSmart Blockchain Integration

This directory contains the smart contracts for AgriSmart's blockchain-based transaction tracking system.

## Overview

The blockchain integration provides transparent and immutable transaction tracking for marketplace purchases using smart contracts. This ensures:

- **Transparency**: All transactions are recorded on-chain
- **Immutability**: Transaction records cannot be altered
- **Verification**: Users can verify transaction integrity
- **Decentralization**: No single point of failure

## Smart Contracts

### AgriMarketTransaction.sol

Main contract for recording marketplace transactions including:
- Payment transactions
- Escrow transactions
- Refund transactions
- Transaction verification

#### Key Functions

- `recordTransaction()`: Records a new transaction on-chain
- `completeTransaction()`: Marks a transaction as completed
- `getTransaction()`: Retrieves transaction details
- `verifyTransactionData()`: Verifies transaction integrity using hash functions

## Deployment

### Prerequisites

1. Install Hardhat or Truffle
2. Set up a wallet with testnet funds
3. Configure environment variables

### Environment Variables

```env
BLOCKCHAIN_NETWORK=polygon-testnet
CONTRACT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc454e4438f44e
POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com
BLOCKCHAIN_PRIVATE_KEY=your_private_key_here
```

### Deployment Steps

1. Compile the contracts:
```bash
npx hardhat compile
```

2. Deploy to testnet:
```bash
npx hardhat run scripts/deploy.js --network mumbai
```

3. Update the contract address in your backend environment variables

## Integration

### Backend Integration

The backend uses ethers.js to interact with the smart contract:

- Records transactions when payments are confirmed
- Stores transaction hashes in the database
- Provides API endpoints for transaction history

### Frontend Integration

The frontend displays transaction history with:

- Transaction hashes
- Block explorer links
- Transaction verification
- Real-time status updates

## Testing

### Local Testing

1. Start a local blockchain (e.g., Hardhat Network)
2. Deploy contracts locally
3. Run backend tests

### Testnet Testing

1. Deploy to Polygon Mumbai testnet
2. Use test MATIC for transactions
3. Verify on PolygonScan

## Security Considerations

- Private keys should never be stored in code
- Use environment variables for sensitive data
- Implement proper access controls
- Regular security audits of smart contracts

## API Endpoints

### Get Transaction History
```
GET /api/blockchain/transactions
```

Returns user's blockchain transaction history with hashes and verification data.

## Block Explorer Links

- **Polygon Mainnet**: https://polygonscan.com/tx/{hash}
- **Mumbai Testnet**: https://mumbai.polygonscan.com/tx/{hash}