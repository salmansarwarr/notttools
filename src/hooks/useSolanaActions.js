import {
    Connection,
    clusterApiUrl,
} from '@solana/web3.js';
import { useUnifiedWallet } from './useUnifiedWallet';
import constants from '../constants';

export const useSolanaActions = () => {
    const { publicKey, signTransaction } = useUnifiedWallet();
    const connection = new Connection(constants.network.endpoint, "confirmed");

    if (!publicKey || !signTransaction) {
        return {
            connection: null,
            publicKey: null,
            sendTx: () => { throw new Error("Wallet not connected"); },
            sendVersionedTx: () => { throw new Error("Wallet not connected"); },
        };
    }

    async function sendTx(tx, signers = []) {
        const maxAttempts = 3;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`📤 Transaction attempt ${attempt}/${maxAttempts}`);

                // Get fresh blockhash - use 'confirmed' not 'finalized'
                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

                tx.feePayer = publicKey;
                tx.recentBlockhash = blockhash;

                // Sign with keypairs first
                if (signers.length > 0) {
                    tx.partialSign(...signers);
                }

                // Then sign with wallet
                const signedTx = await signTransaction(tx);
                if (!signedTx) throw new Error("Failed to sign transaction");

                // Send transaction
                const signature = await connection.sendRawTransaction(
                    signedTx.serialize(),
                    {
                        skipPreflight: false,
                        maxRetries: 2,
                        preflightCommitment: 'processed'
                    }
                );

                console.log("Transaction sent:", signature);

                // Wait for confirmation
                const startTime = Date.now();
                const timeoutMs = 60000; // 60 seconds

                while (Date.now() - startTime < timeoutMs) {
                    const { value: statuses } = await connection.getSignatureStatuses([signature]);
                    const status = statuses?.[0];

                    if (status) {
                        // Success
                        if (status.confirmationStatus === 'confirmed' ||
                            status.confirmationStatus === 'finalized') {

                            if (status.err) {
                                throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
                            }

                            console.log("✅ Transaction confirmed:", signature);
                            return signature;
                        }

                        // Error during execution
                        if (status.err) {
                            throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
                        }
                    }

                    // Check block height
                    const currentHeight = await connection.getBlockHeight('confirmed');
                    if (currentHeight > lastValidBlockHeight) {
                        console.warn('Blockhash expired, will retry...');
                        break; // Break to retry with new blockhash
                    }

                    // Wait before next check
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                // If we got here, either timeout or blockhash expired
                if (attempt < maxAttempts) {
                    console.log('⏳ Retrying with fresh blockhash...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                throw new Error('Transaction confirmation timeout');

            } catch (error) {
                console.error(`Attempt ${attempt} error:`, error.message);

                // Don't retry on these errors
                if (error.message?.includes('insufficient funds') ||
                    error.message?.includes('custom program error') ||
                    error.message?.includes('already been processed')) {
                    throw error;
                }

                // Retry on timeout/network errors
                if (attempt < maxAttempts) {
                    console.log(`⏳ Retrying in 2 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }

                throw error;
            }
        }
    }

    async function sendVersionedTx(versionedTx) {
        try {
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

            const signedTx = await signTransaction(versionedTx);
            if (!signedTx) throw new Error("Failed to sign transaction");

            const txid = await connection.sendRawTransaction(signedTx.serialize(), {
                skipPreflight: false,
                maxRetries: 2,
                preflightCommitment: 'confirmed'
            });

            console.log("Versioned transaction sent:", txid);

            // Same confirmation logic
            const startTime = Date.now();
            while (Date.now() - startTime < 60000) {
                const { value: statuses } = await connection.getSignatureStatuses([txid]);
                const status = statuses?.[0];

                if (status?.confirmationStatus === 'confirmed' ||
                    status?.confirmationStatus === 'finalized') {
                    if (status.err) {
                        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
                    }
                    return txid;
                }

                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            throw new Error('Transaction confirmation timeout');

        } catch (error) {
            console.error("Versioned transaction error:", error);
            throw error;
        }
    }

    return { connection, publicKey, sendTx, sendVersionedTx, signTransaction };
};