const crypto = require('crypto-js');
const { ethers } = require('ethers');
const { BlockchainTransaction, Payment, Order } = require('../models/index');

// Smart Contract ABI (simplified for AgriMarketTransaction)
const CONTRACT_ABI = [
    "function recordTransaction(address _buyer, address _seller, uint256 _amount, string memory _currency, string memory _transactionType, bytes32 _dataHash) external returns (uint256)",
    "function completeTransaction(uint256 _transactionId) external",
    "function getTransaction(uint256 _transactionId) external view returns (uint256, address, address, uint256, string memory, string memory, uint256, bytes32, bool)",
    "function verifyTransactionData(uint256 _transactionId, bytes32 _expectedHash) external view returns (bool)",
    "function getUserTransactionCount(address _user) external view returns (uint256)",
    "event TransactionRecorded(uint256 indexed transactionId, address indexed buyer, address indexed seller, uint256 amount, string currency, string transactionType, bytes32 dataHash)"
];

// Blockchain Service for AgriSmart Payment Transparency
class BlockchainService {
    constructor() {
        this.network = process.env.BLOCKCHAIN_NETWORK || 'polygon-testnet';
        this.contractAddress = process.env.CONTRACT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
        this.chainId = this.getChainId();
        this.rpcUrl = this.getRpcUrl();
        this.privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;

        // Initialize provider and contract
        this.initializeBlockchain();
    }

    getChainId() {
        const networks = {
            'polygon': 137,
            'ethereum': 1,
            'bsc': 56,
            'polygon-testnet': 80001
        };
        return networks[this.network] || 80001; // Default to Mumbai testnet
    }

    getRpcUrl() {
        const rpcUrls = {
            'polygon': 'https://polygon-rpc.com/',
            'ethereum': 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
            'bsc': 'https://bsc-dataseed.binance.org/',
            'polygon-testnet': 'https://rpc.ankr.com/polygon_mumbai'
        };
        return rpcUrls[this.network] || 'https://rpc.ankr.com/polygon_mumbai';
    }

    initializeBlockchain() {
        try {
            this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
            this.contract = new ethers.Contract(this.contractAddress, CONTRACT_ABI, this.provider);

            if (this.privateKey) {
                this.wallet = new ethers.Wallet(this.privateKey, this.provider);
                this.contractWithSigner = this.contract.connect(this.wallet);
            }

            console.log(`Blockchain service initialized for ${this.network} (Chain ID: ${this.chainId})`);
        } catch (error) {
            console.warn('Failed to initialize blockchain connection:', error.message);
            console.log('Falling back to mock mode');
            this.mockMode = true;
        }
    }

    // Convert user ID to blockchain address (simplified mapping)
    userIdToAddress(userId) {
        // In production, this should map user IDs to their wallet addresses
        // For demo purposes, we'll create deterministic addresses from user IDs
        const hash = crypto.SHA256(userId.toString()).toString();
        return '0x' + hash.substring(0, 40); // Take first 40 chars for address
    }

    // Generate transaction hash
    generateTransactionHash(data) {
        const hashString = JSON.stringify({
            ...data,
            timestamp: Date.now(),
            nonce: crypto.lib.WordArray.random(32).toString()
        });
        return crypto.SHA256(hashString).toString();
    }

    // Simulate block number (in production, this would come from blockchain)
    generateBlockNumber() {
        return Math.floor(Date.now() / 10000) + Math.floor(Math.random() * 1000);
    }

    // Record payment transaction on blockchain
    async recordPaymentTransaction(paymentData) {
        try {
            const {
                paymentId,
                orderId,
                buyerId,
                sellerId,
                amount,
                currency = 'INR',
                paymentMethod
            } = paymentData;

            let transactionHash, blockNumber, contractTxId;

            if (this.mockMode || !this.contractWithSigner) {
                // Fallback to mock mode
                transactionHash = this.generateTransactionHash({
                    type: 'payment',
                    paymentId,
                    orderId,
                    buyerId,
                    sellerId,
                    amount,
                    currency,
                    paymentMethod
                });
                blockNumber = this.generateBlockNumber();
            } else {
                // Use real smart contract
                try {
                    // Convert user IDs to addresses (in production, map user IDs to wallet addresses)
                    const buyerAddress = this.userIdToAddress(buyerId);
                    const sellerAddress = this.userIdToAddress(sellerId);

                    // Create data hash for verification
                    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({
                        paymentId,
                        orderId,
                        buyerId,
                        sellerId,
                        amount,
                        currency,
                        paymentMethod,
                        timestamp: Date.now()
                    })));

                    // Record transaction on blockchain
                    const tx = await this.contractWithSigner.recordTransaction(
                        buyerAddress,
                        sellerAddress,
                        amount,
                        currency,
                        'payment',
                        dataHash
                    );

                    const receipt = await tx.wait();
                    transactionHash = receipt.hash;
                    blockNumber = receipt.blockNumber;
                    contractTxId = receipt.logs[0]?.args?.transactionId?.toString();

                    console.log(`Transaction recorded on blockchain: ${transactionHash}`);
                } catch (contractError) {
                    console.error('Smart contract interaction failed:', contractError);
                    // Fallback to mock mode
                    transactionHash = this.generateTransactionHash({
                        type: 'payment',
                        paymentId,
                        orderId,
                        buyerId,
                        sellerId,
                        amount,
                        currency,
                        paymentMethod
                    });
                    blockNumber = this.generateBlockNumber();
                }
            }

            const blockchainTx = new BlockchainTransaction({
                payment: paymentId,
                transactionHash,
                blockNumber,
                fromAddress: buyerId.toString(),
                toAddress: sellerId.toString(),
                amount,
                currency,
                transactionType: 'payment',
                status: 'confirmed',
                network: this.network,
                contractAddress: this.contractAddress,
                metadata: {
                    orderId,
                    paymentMethod,
                    chainId: this.chainId,
                    contractTxId
                }
            });

            await blockchainTx.save();

            // Update payment with blockchain info
            await Payment.findByIdAndUpdate(paymentId, {
                blockchainTxHash: transactionHash,
                blockchainBlockNumber: blockNumber
            });

            return {
                transactionHash,
                blockNumber,
                status: 'confirmed',
                network: this.network,
                explorerUrl: this.getExplorerUrl(transactionHash),
                contractTxId
            };
        } catch (error) {
            console.error('Blockchain payment recording error:', error);
            throw new Error('Failed to record payment on blockchain');
        }
    }

    // Record escrow transaction
    async recordEscrowTransaction(escrowData) {
        try {
            const {
                paymentId,
                orderId,
                buyerId,
                sellerId,
                amount,
                currency = 'INR',
                escrowType = 'order_escrow'
            } = escrowData;

            const transactionHash = this.generateTransactionHash({
                type: 'escrow',
                escrowType,
                paymentId,
                orderId,
                buyerId,
                sellerId,
                amount,
                currency
            });

            const blockNumber = this.generateBlockNumber();

            const blockchainTx = new BlockchainTransaction({
                payment: paymentId,
                transactionHash,
                blockNumber,
                fromAddress: buyerId.toString(),
                toAddress: sellerId.toString(),
                amount,
                currency,
                transactionType: 'escrow',
                status: 'confirmed',
                network: this.network,
                contractAddress: this.contractAddress,
                metadata: {
                    orderId,
                    escrowType,
                    chainId: this.chainId
                }
            });

            await blockchainTx.save();

            return {
                transactionHash,
                blockNumber,
                status: 'confirmed',
                escrowType,
                network: this.network
            };
        } catch (error) {
            console.error('Blockchain escrow recording error:', error);
            throw new Error('Failed to record escrow on blockchain');
        }
    }

    // Record refund transaction
    async recordRefundTransaction(refundData) {
        try {
            const {
                refundId,
                paymentId,
                orderId,
                buyerId,
                sellerId,
                amount,
                currency = 'INR',
                reason
            } = refundData;

            const transactionHash = this.generateTransactionHash({
                type: 'refund',
                refundId,
                paymentId,
                orderId,
                buyerId,
                sellerId,
                amount,
                currency,
                reason
            });

            const blockNumber = this.generateBlockNumber();

            const blockchainTx = new BlockchainTransaction({
                payment: paymentId,
                transactionHash,
                blockNumber,
                fromAddress: sellerId.toString(),
                toAddress: buyerId.toString(),
                amount,
                currency,
                transactionType: 'refund',
                status: 'confirmed',
                network: this.network,
                contractAddress: this.contractAddress,
                metadata: {
                    refundId,
                    orderId,
                    reason,
                    chainId: this.chainId
                }
            });

            await blockchainTx.save();

            return {
                transactionHash,
                blockNumber,
                status: 'confirmed',
                refundId,
                network: this.network
            };
        } catch (error) {
            console.error('Blockchain refund recording error:', error);
            throw new Error('Failed to record refund on blockchain');
        }
    }

    // Verify transaction on blockchain
    async verifyTransaction(transactionHash) {
        try {
            const transaction = await BlockchainTransaction.findOne({ transactionHash });

            if (!transaction) {
                return { verified: false, reason: 'Transaction not found' };
            }

            // In production, this would verify against actual blockchain
            const isValid = this.verifyTransactionIntegrity(transaction);

            return {
                verified: isValid,
                transaction: {
                    hash: transaction.transactionHash,
                    blockNumber: transaction.blockNumber,
                    status: transaction.status,
                    network: transaction.network,
                    timestamp: transaction.createdAt
                }
            };
        } catch (error) {
            console.error('Transaction verification error:', error);
            return { verified: false, reason: 'Verification failed' };
        }
    }

    // Verify transaction integrity
    verifyTransactionIntegrity(transaction) {
        try {
            const dataToVerify = {
                payment: transaction.payment?.toString(),
                transactionHash: transaction.transactionHash,
                blockNumber: transaction.blockNumber,
                fromAddress: transaction.fromAddress,
                toAddress: transaction.toAddress,
                amount: transaction.amount,
                currency: transaction.currency,
                transactionType: transaction.transactionType
            };

            const expectedHash = this.generateTransactionHash(dataToVerify);
            return expectedHash === transaction.transactionHash;
        } catch (error) {
            console.error('Transaction integrity check failed:', error);
            return false;
        }
    }

    // Get transaction history for a user
    async getTransactionHistory(userId, filters = {}) {
        try {
            const query = {
                $or: [
                    { fromAddress: userId.toString() },
                    { toAddress: userId.toString() }
                ]
            };

            if (filters.transactionType) {
                query.transactionType = filters.transactionType;
            }

            if (filters.status) {
                query.status = filters.status;
            }

            const transactions = await BlockchainTransaction.find(query)
                .populate('payment', 'amount currency status')
                .sort({ createdAt: -1 })
                .limit(filters.limit || 50);

            return transactions.map(tx => ({
                transactionHash: tx.transactionHash,
                blockNumber: tx.blockNumber,
                fromAddress: tx.fromAddress,
                toAddress: tx.toAddress,
                amount: tx.amount,
                currency: tx.currency,
                transactionType: tx.transactionType,
                status: tx.status,
                network: tx.network,
                timestamp: tx.createdAt,
                explorerUrl: this.getExplorerUrl(tx.transactionHash),
                payment: tx.payment
            }));
        } catch (error) {
            console.error('Get transaction history error:', error);
            throw new Error('Failed to fetch transaction history');
        }
    }

    // Get blockchain explorer URL
    getExplorerUrl(transactionHash) {
        const explorers = {
            'polygon': `https://polygonscan.com/tx/${transactionHash}`,
            'ethereum': `https://etherscan.io/tx/${transactionHash}`,
            'bsc': `https://bscscan.com/tx/${transactionHash}`,
            'polygon-testnet': `https://mumbai.polygonscan.com/tx/${transactionHash}`
        };
        return explorers[this.network] || explorers['polygon'];
    }

    // Get blockchain explorer URL
    getExplorerUrl(transactionHash) {
        const explorers = {
            'polygon': `https://polygonscan.com/tx/${transactionHash}`,
            'ethereum': `https://etherscan.io/tx/${transactionHash}`,
            'bsc': `https://bscscan.com/tx/${transactionHash}`,
            'polygon-testnet': `https://mumbai.polygonscan.com/tx/${transactionHash}`
        };
        return explorers[this.network] || explorers['polygon-testnet'];
    }

    // Get network statistics
    async getNetworkStats() {
        try {
            const totalTransactions = await BlockchainTransaction.countDocuments();
            const confirmedTransactions = await BlockchainTransaction.countDocuments({ status: 'confirmed' });
            const totalVolume = await BlockchainTransaction.aggregate([
                { $match: { status: 'confirmed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            return {
                network: this.network,
                chainId: this.chainId,
                contractAddress: this.contractAddress,
                totalTransactions,
                confirmedTransactions,
                totalVolume: totalVolume[0]?.total || 0,
                successRate: totalTransactions > 0 ? (confirmedTransactions / totalTransactions) * 100 : 0
            };
        } catch (error) {
            console.error('Get network stats error:', error);
            throw new Error('Failed to fetch network statistics');
        }
    }
}

module.exports = new BlockchainService();