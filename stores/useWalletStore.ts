
import { useState } from 'react';
import { User, WalletTransaction, TransactionType } from '../types';
import { MOCK_TRANSACTIONS } from '../constants';

export const useWalletStore = (currentUser: User | null, updateProfile: (updates: Partial<User>) => Promise<void>) => {
    const [transactions, setTransactions] = useState<WalletTransaction[]>(MOCK_TRANSACTIONS);

    const depositFunds = async (amount: number) => {
        if (!currentUser) return { success: false, message: 'Login required' };
        const tx: WalletTransaction = {
            id: `tx_dep_${Date.now()}`,
            userId: currentUser.id,
            amount,
            type: TransactionType.DEPOSIT,
            description: 'Wallet Deposit',
            balanceAfter: currentUser.walletBalance + amount,
            createdAt: new Date()
        };
        setTransactions(prev => [tx, ...prev]);
        await updateProfile({ walletBalance: tx.balanceAfter });
        return { success: true, message: 'Funds deposited' };
    };

    const withdrawFunds = async (amount: number) => {
        if (!currentUser) return { success: false, message: 'Login required' };
        if (currentUser.walletBalance < amount) return { success: false, message: 'Insufficient funds' };
        
        const tx: WalletTransaction = {
            id: `tx_with_${Date.now()}`,
            userId: currentUser.id,
            amount: -amount,
            type: TransactionType.WITHDRAWAL,
            description: 'Withdrawal to Bank',
            balanceAfter: currentUser.walletBalance - amount,
            createdAt: new Date()
        };
        setTransactions(prev => [tx, ...prev]);
        await updateProfile({ walletBalance: tx.balanceAfter });
        return { success: true, message: 'Withdrawal processed' };
    };

    return {
        transactions,
        setTransactions,
        depositFunds,
        withdrawFunds
    };
};
