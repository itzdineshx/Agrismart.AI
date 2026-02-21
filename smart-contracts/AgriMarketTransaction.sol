// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AgriMarketTransaction {
    struct Transaction {
        uint256 id;
        address buyer;
        address seller;
        uint256 amount;
        string currency;
        string transactionType; // "payment", "escrow", "refund"
        uint256 timestamp;
        bytes32 dataHash; // Hash of transaction data for verification
        bool isCompleted;
    }

    mapping(uint256 => Transaction) public transactions;
    uint256 public transactionCount;

    address public owner;
    address public escrowContract;

    event TransactionRecorded(
        uint256 indexed transactionId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        string currency,
        string transactionType,
        bytes32 dataHash
    );

    event TransactionCompleted(uint256 indexed transactionId);
    event EscrowReleased(uint256 indexed transactionId, address indexed to);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyEscrowContract() {
        require(msg.sender == escrowContract, "Only escrow contract can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setEscrowContract(address _escrowContract) external onlyOwner {
        escrowContract = _escrowContract;
    }

    function recordTransaction(
        address _buyer,
        address _seller,
        uint256 _amount,
        string memory _currency,
        string memory _transactionType,
        bytes32 _dataHash
    ) external returns (uint256) {
        require(_buyer != address(0), "Invalid buyer address");
        require(_seller != address(0), "Invalid seller address");
        require(_amount > 0, "Amount must be greater than 0");

        transactionCount++;
        uint256 transactionId = transactionCount;

        transactions[transactionId] = Transaction({
            id: transactionId,
            buyer: _buyer,
            seller: _seller,
            amount: _amount,
            currency: _currency,
            transactionType: _transactionType,
            timestamp: block.timestamp,
            dataHash: _dataHash,
            isCompleted: false
        });

        emit TransactionRecorded(
            transactionId,
            _buyer,
            _seller,
            _amount,
            _currency,
            _transactionType,
            _dataHash
        );

        return transactionId;
    }

    function completeTransaction(uint256 _transactionId) external {
        Transaction storage transaction = transactions[_transactionId];
        require(transaction.id != 0, "Transaction does not exist");
        require(!transaction.isCompleted, "Transaction already completed");

        // Only buyer, seller, or escrow contract can complete
        require(
            msg.sender == transaction.buyer ||
            msg.sender == transaction.seller ||
            msg.sender == escrowContract,
            "Unauthorized to complete transaction"
        );

        transaction.isCompleted = true;
        emit TransactionCompleted(_transactionId);
    }

    function getTransaction(uint256 _transactionId) external view returns (
        uint256 id,
        address buyer,
        address seller,
        uint256 amount,
        string memory currency,
        string memory transactionType,
        uint256 timestamp,
        bytes32 dataHash,
        bool isCompleted
    ) {
        Transaction memory transaction = transactions[_transactionId];
        require(transaction.id != 0, "Transaction does not exist");

        return (
            transaction.id,
            transaction.buyer,
            transaction.seller,
            transaction.amount,
            transaction.currency,
            transaction.transactionType,
            transaction.timestamp,
            transaction.dataHash,
            transaction.isCompleted
        );
    }

    function verifyTransactionData(
        uint256 _transactionId,
        bytes32 _expectedHash
    ) external view returns (bool) {
        Transaction memory transaction = transactions[_transactionId];
        require(transaction.id != 0, "Transaction does not exist");

        return transaction.dataHash == _expectedHash;
    }

    // Function to get transaction count for a user
    function getUserTransactionCount(address _user) external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i <= transactionCount; i++) {
            if (transactions[i].buyer == _user || transactions[i].seller == _user) {
                count++;
            }
        }
        return count;
    }
}