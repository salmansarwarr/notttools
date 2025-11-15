import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { 
    updateV1,
    mplTokenMetadata 
} from '@metaplex-foundation/mpl-token-metadata';
import { 
    publicKey as umiPublicKey,
} from '@metaplex-foundation/umi';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import '@solana/wallet-adapter-react-ui/styles.css';

// Configuration
const PROGRAM_ID = new PublicKey("6hgRdDw7rRrpd7a6UPpomnPCHBMk9siWuvSCigQe2PUn");
const COLLECTION_MINT = "2bYhxz75oHUGS59SJmSPTz2qpv9RwQkHyn8dse6aapHQ";
const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const CLUSTER = "devnet";

function CollectionSetup() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [configPda, setConfigPda] = useState('');
    const [txSignature, setTxSignature] = useState('');

    // Helper: Get Metadata PDA
    const getMetadataPDA = (mint) => {
        return PublicKey.findProgramAddressSync(
            [
                Buffer.from("metadata"),
                METADATA_PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
            ],
            METADATA_PROGRAM_ID
        )[0];
    };

    // Step 1: Set Collection Mint
    const handleSetCollectionMint = async () => {
        if (!wallet.connected || !wallet.publicKey) {
            setStatus('❌ Please connect your wallet first');
            return;
        }

        setLoading(true);
        setStatus('🔄 Setting collection mint in config...');
        setTxSignature('');

        try {
            // Setup provider
            const provider = new anchor.AnchorProvider(
                connection,
                wallet,
                { commitment: "confirmed" }
            );

            // Load IDL (you'll need to import or fetch your IDL)
            // For now, assuming you have it available
            const idl = await fetch('/solana_nft_anchor.json').then(r => r.json());
            const program = new anchor.Program(idl, provider);

            const collectionMint = new PublicKey(COLLECTION_MINT);
            const collectionMetadata = getMetadataPDA(collectionMint);
            
            const [configPdaAddress] = PublicKey.findProgramAddressSync(
                [Buffer.from("config")],
                PROGRAM_ID
            );

            setConfigPda(configPdaAddress.toString());

            // Execute transaction
            const tx = await program.methods
                .setCollectionMint(collectionMint)
                .accounts({
                    admin: wallet.publicKey,
                    config: configPdaAddress,
                    collectionMint: collectionMint,
                    collectionMetadata: collectionMetadata,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            setTxSignature(tx);
            setStatus('✅ Collection mint set successfully!');
            
            console.log('Transaction:', tx);
        } catch (error) {
            console.error('Error:', error);
            setStatus(`❌ Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Update Collection Authority
    const handleUpdateAuthority = async () => {
        if (!wallet.connected || !wallet.publicKey) {
            setStatus('❌ Please connect your wallet first');
            return;
        }

        if (!configPda) {
            setStatus('❌ Please run "Set Collection Mint" first to get Config PDA');
            return;
        }

        setLoading(true);
        setStatus('🔄 Updating collection authority...');
        setTxSignature('');

        try {
            // Initialize UMI
            const endpoint = CLUSTER === "mainnet-beta" 
                ? "https://api.mainnet-beta.solana.com"
                : "https://api.devnet.solana.com";
                
            const umi = createUmi(endpoint)
                .use(mplTokenMetadata())
                .use(walletAdapterIdentity(wallet));

            // Update authority to Config PDA
            const result = await updateV1(umi, {
                mint: umiPublicKey(COLLECTION_MINT),
                authority: umi.identity,
                newUpdateAuthority: umiPublicKey(configPda),
            }).sendAndConfirm(umi);

            const signature = Buffer.from(result.signature).toString('base64');
            setTxSignature(signature);
            setStatus('✅ Authority updated successfully! Config PDA is now the collection authority.');
            
            console.log('Transaction:', signature);
        } catch (error) {
            console.error('Error:', error);
            setStatus(`❌ Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Collection Setup
                    </h1>
                    <p className="text-gray-300">
                        Configure your NFT collection authority
                    </p>
                </div>

                {/* Wallet Connection */}
                <div className="mb-8 flex justify-center">
                    <WalletMultiButton className="!bg-gradient-to-r !from-purple-500 !to-pink-500 hover:!from-purple-600 hover:!to-pink-600 !rounded-lg !px-6 !py-3 !font-semibold !transition-all" />
                </div>

                {/* Info Panel */}
                {wallet.connected && (
                    <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Network:</span>
                                <span className="text-white font-mono">{CLUSTER}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Collection:</span>
                                <span className="text-white font-mono text-xs">
                                    {COLLECTION_MINT.slice(0, 8)}...{COLLECTION_MINT.slice(-8)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Your Wallet:</span>
                                <span className="text-white font-mono text-xs">
                                    {wallet.publicKey.toString().slice(0, 8)}...
                                    {wallet.publicKey.toString().slice(-8)}
                                </span>
                            </div>
                            {configPda && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Config PDA:</span>
                                    <span className="text-green-400 font-mono text-xs">
                                        {configPda.slice(0, 8)}...{configPda.slice(-8)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-4 mb-6">
                    {/* Step 1 */}
                    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-1">
                                    Step 1: Set Collection Mint
                                </h3>
                                <p className="text-gray-400 text-sm">
                                    Store collection mint in program config
                                </p>
                            </div>
                            <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold">
                                1/2
                            </span>
                        </div>
                        <button
                            onClick={handleSetCollectionMint}
                            disabled={!wallet.connected || loading}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:transform-none"
                        >
                            {loading && status.includes('Setting') ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Processing...
                                </span>
                            ) : (
                                'Set Collection Mint'
                            )}
                        </button>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-1">
                                    Step 2: Update Authority
                                </h3>
                                <p className="text-gray-400 text-sm">
                                    Transfer collection authority to Config PDA
                                </p>
                            </div>
                            <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold">
                                2/2
                            </span>
                        </div>
                        <button
                            onClick={handleUpdateAuthority}
                            disabled={!wallet.connected || loading || !configPda}
                            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:transform-none"
                        >
                            {loading && status.includes('Updating') ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Processing...
                                </span>
                            ) : (
                                'Update Collection Authority'
                            )}
                        </button>
                    </div>
                </div>

                {/* Status Display */}
                {status && (
                    <div className={`rounded-lg p-4 mb-4 border ${
                        status.includes('✅') 
                            ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                            : status.includes('❌')
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    }`}>
                        <p className="font-medium">{status}</p>
                        {txSignature && (
                            <a
                                href={`https://solscan.io/tx/${txSignature}${CLUSTER !== 'mainnet-beta' ? '?cluster=devnet' : ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm underline mt-2 block hover:text-white transition-colors"
                            >
                                View on Solscan →
                            </a>
                        )}
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-200 text-sm">
                    <p className="font-semibold mb-2">⚠️ Important Notes:</p>
                    <ul className="space-y-1 list-disc list-inside">
                        <li>Run Step 1 first to initialize the config</li>
                        <li>Step 2 transfers authority permanently</li>
                        <li>Make sure collection metadata is finalized</li>
                        <li>You must be the current collection authority</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default CollectionSetup;