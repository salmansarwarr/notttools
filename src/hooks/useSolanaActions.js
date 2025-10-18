import {
    Connection,
    clusterApiUrl,
} from '@solana/web3.js';
import { useUnifiedWallet } from './useUnifiedWallet';

export const useSolanaActions = () => {
    const { publicKey, signTransaction } = useUnifiedWallet();
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    if (!publicKey || !signTransaction) {
        return {
            connection: null,
            publicKey: null,
            sendTx: () => { throw new Error("Wallet not connected"); },
            sendVersionedTx: () => { throw new Error("Wallet not connected"); },
        };
    }

    async function sendTx(tx, signers = []) {
        try {
            // 🔹 ALWAYS fetch a fresh blockhash
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
            
            tx.feePayer = publicKey;
            tx.recentBlockhash = blockhash;
        
            // 🔹 Partially sign with local keypairs (like mintKeypair)
            if (signers.length > 0) {
                tx.partialSign(...signers);
            }
        
            // 🔹 Then request wallet signature (for publicKey)
            const signedTx = await signTransaction?.(tx);
            if (!signedTx) throw new Error("Failed to sign transaction");
        
            // 🔹 Send with retry logic and proper confirmation
            const txid = await connection.sendRawTransaction(signedTx.serialize(), { 
                skipPreflight: false,
                maxRetries: 3,
                preflightCommitment: 'confirmed'
            });
            
            // 🔹 Use block height confirmation instead of just confirmed
            const confirmation = await connection.confirmTransaction({
                signature: txid,
                blockhash,
                lastValidBlockHeight
            }, 'confirmed');

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            return txid;
        } catch (error) {
            console.error("Transaction error:", error);
            
            // Handle specific error cases
            if (error.message?.includes('already been processed')) {
                console.warn("Transaction may have succeeded despite error");
                // You could optionally return the signature from the error if available
            }
            throw error;
        }
    }
    
    async function sendVersionedTx(versionedTx) {
        try {
            // 🔹 Fetch fresh blockhash for versioned transactions
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
            
            const signedTx = await signTransaction?.(versionedTx);
            if (!signedTx) throw new Error("Failed to sign transaction");

            const txid = await connection.sendRawTransaction(signedTx.serialize(), { 
                skipPreflight: false,
                maxRetries: 3,
                preflightCommitment: 'confirmed'
            });
            
            const confirmation = await connection.confirmTransaction({
                signature: txid,
                blockhash,
                lastValidBlockHeight
            }, 'confirmed');

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            return txid;
        } catch (error) {
            console.error("Versioned transaction error:", error);
            throw error;
        }
    }

    return { connection, publicKey, sendTx, sendVersionedTx, signTransaction };
};