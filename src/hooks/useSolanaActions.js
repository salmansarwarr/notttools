import { useWallet } from '@solana/wallet-adapter-react';
import {
    Connection,
    clusterApiUrl,
} from '@solana/web3.js';

export const useSolanaActions = () => {
    const { publicKey, signTransaction } = useWallet();
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
        tx.feePayer = publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
        // 🔹 Partially sign with local keypairs (like mintKeypair)
        if (signers.length > 0) {
            tx.partialSign(...signers);
        }
    
        // 🔹 Then request wallet signature (for publicKey)
        const signedTx = await signTransaction?.(tx);
        if (!signedTx) throw new Error("Failed to sign transaction");
    
        const txid = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });
        await connection.confirmTransaction(txid, 'confirmed');
        return txid;
    }
    
    async function sendVersionedTx(versionedTx) {
        const signedTx = await signTransaction?.(versionedTx);
        if (!signedTx) throw new Error("Failed to sign transaction");

        const txid = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });
        await connection.confirmTransaction(txid, 'confirmed');
        return txid;
    }

    return { connection, publicKey, sendTx, sendVersionedTx, signTransaction };
};
