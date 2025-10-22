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
        
            // 🔹 Send with reduced retry to avoid duplicates
            const txid = await connection.sendRawTransaction(signedTx.serialize(), { 
                skipPreflight: false,
                maxRetries: 1, // Reduced from 3 to prevent duplicate sends
                preflightCommitment: 'confirmed'
            });
            
            console.log("Transaction sent:", txid);
            
            // 🔹 Use block height confirmation instead of just confirmed
            const confirmation = await connection.confirmTransaction({
                signature: txid,
                blockhash,
                lastValidBlockHeight
            }, 'confirmed');

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            console.log("Transaction confirmed:", txid);
            return txid;
        } catch (error) {
            console.error("Transaction error:", error);
            
            // 🔹 Handle specific error cases
            if (error.message?.includes('already been processed')) {
                console.warn("Transaction may have already succeeded");
                
                // Try to extract signature from error message
                const match = error.message.match(/signature[:\s]+([A-Za-z0-9]{87,88})/i);
                if (match && match[1]) {
                    console.log("Found existing signature:", match[1]);
                    return match[1];
                }
                
                // If we can't extract signature, inform user
                throw new Error("Transaction already processed. Please check your wallet history.");
            }
            
            // 🔹 Handle blockhash expiration
            if (error.message?.includes('block height exceeded') || 
                error.message?.includes('BlockhashNotFound')) {
                throw new Error("Transaction expired. Please try again.");
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

            // 🔹 Send with reduced retry to avoid duplicates
            const txid = await connection.sendRawTransaction(signedTx.serialize(), { 
                skipPreflight: false,
                maxRetries: 1, // Reduced from 3 to prevent duplicate sends
                preflightCommitment: 'confirmed'
            });
            
            console.log("Versioned transaction sent:", txid);
            
            const confirmation = await connection.confirmTransaction({
                signature: txid,
                blockhash,
                lastValidBlockHeight
            }, 'confirmed');

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            console.log("Versioned transaction confirmed:", txid);
            return txid;
        } catch (error) {
            console.error("Versioned transaction error:", error);
            
            // 🔹 Handle specific error cases
            if (error.message?.includes('already been processed')) {
                console.warn("Versioned transaction may have already succeeded");
                
                // Try to extract signature from error message
                const match = error.message.match(/signature[:\s]+([A-Za-z0-9]{87,88})/i);
                if (match && match[1]) {
                    console.log("Found existing signature:", match[1]);
                    return match[1];
                }
                
                throw new Error("Transaction already processed. Please check your wallet history.");
            }
            
            // 🔹 Handle blockhash expiration
            if (error.message?.includes('block height exceeded') || 
                error.message?.includes('BlockhashNotFound')) {
                throw new Error("Transaction expired. Please try again.");
            }
            
            throw error;
        }
    }

    return { connection, publicKey, sendTx, sendVersionedTx, signTransaction };
};