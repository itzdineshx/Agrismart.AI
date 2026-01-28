export type BlockchainTransactionType = 'payment' | 'escrow' | 'refund' | 'commission';
export type BlockchainTransactionStatus = 'pending' | 'confirmed' | 'failed';

// Backend API base URL
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

export interface BlockchainTransactionHistoryItem {
  transactionHash: string;
  blockNumber: number;
  fromAddress: string;
  toAddress: string;
  amount: number;
  currency: string;
  transactionType: BlockchainTransactionType;
  status: BlockchainTransactionStatus;
  network: string;
  timestamp: string;
  explorerUrl?: string;
  payment?: {
    amount?: number;
    currency?: string;
    status?: string;
  };
}

export async function getBlockchainTransactions(params?: {
  userId?: string;
  limit?: number;
  transactionType?: BlockchainTransactionType;
  status?: BlockchainTransactionStatus;
}): Promise<{ transactions: BlockchainTransactionHistoryItem[]; total: number; source?: string }> {
  const queryParams = new URLSearchParams();

  if (params?.userId) queryParams.set('userId', params.userId);
  if (params?.limit) queryParams.set('limit', String(params.limit));
  if (params?.transactionType) queryParams.set('transactionType', params.transactionType);
  if (params?.status) queryParams.set('status', params.status);

  const response = await fetch(`${BACKEND_BASE_URL}/api/blockchain/transactions?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Blockchain API error: ${response.statusText}`);
  }

  return response.json();
}
