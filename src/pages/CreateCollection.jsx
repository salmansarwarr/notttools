import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { 
    createNft,
    mplTokenMetadata 
} from '@metaplex-foundation/mpl-token-metadata';
import { 
    generateSigner,
    percentAmount,
} from '@metaplex-foundation/umi';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import '@solana/wallet-adapter-react-ui/styles.css';

// Configuration
const CLUSTER = "mainnet-beta";

function CreateCollection() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [txSignature, setTxSignature] = useState('');
    const [collectionAddress, setCollectionAddress] = useState('');
    
    // Form state
    const [formData, setFormData] = useState({
        name: 'NOOT Genesis Collection',
        symbol: 'NOOT',
        uri: 'https://metadata.noottools.io/metadata/2.json',
        royaltyBasisPoints: 0,
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCreateCollection = async () => {
        if (!wallet.connected || !wallet.publicKey) {
            setStatus('❌ Please connect your wallet first');
            return;
        }

        setLoading(true);
        setStatus('🔄 Creating collection NFT...');
        setTxSignature('');
        setCollectionAddress('');

        try {
            // Initialize UMI
            const endpoint = CLUSTER === "mainnet-beta" 
                ? "https://solana-mainnet.api.syndica.io/api-key/21P91u6oC24BUjduDPBnPEdmPWWz7fmFp3jtMBY52Mgq5j1CE9sjKbUv1TzPZGan2pKeDg289fHqvdP6UK5cAHhyJmuHSLE2qm"
                : "https://api.devnet.solana.com";
                
            const umi = createUmi(endpoint)
                .use(mplTokenMetadata())
                .use(walletAdapterIdentity(wallet));

            // Generate mint address for the collection
            const collectionMint = generateSigner(umi);
            
            console.log("🎨 Creating Collection NFT...");
            console.log("Collection Address:", collectionMint.publicKey);

            // Create collection NFT
            const result = await createNft(umi, {
                mint: collectionMint,
                name: formData.name,
                symbol: formData.symbol,
                uri: formData.uri,
                sellerFeeBasisPoints: percentAmount(parseFloat(formData.royaltyBasisPoints)),
                isCollection: true, // This makes it a collection!
                creators: [
                    {
                        address: umi.identity.publicKey,
                        verified: true,
                        share: 100,
                    },
                ],
            }).sendAndConfirm(umi);

            const signature = Buffer.from(result.signature).toString('base64');
            const collectionAddr = collectionMint.publicKey.toString();
            
            setTxSignature(signature);
            setCollectionAddress(collectionAddr);
            setStatus('✅ Collection NFT created successfully!');
            
            console.log('✅ Collection Created!');
            console.log('   Address:', collectionAddr);
            console.log('   Transaction:', signature);
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
                        🎨 Create Collection NFT
                    </h1>
                    <p className="text-gray-300">
                        Create a new NFT collection on Solana
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
                                <span className="text-gray-400">Your Wallet:</span>
                                <span className="text-white font-mono text-xs">
                                    {wallet.publicKey.toString().slice(0, 8)}...
                                    {wallet.publicKey.toString().slice(-8)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form */}
                {wallet.connected && (
                    <div className="bg-white/5 rounded-lg p-6 border border-white/10 mb-6">
                        <h3 className="text-xl font-semibold text-white mb-4">
                            Collection Details
                        </h3>
                        
                        <div className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-gray-300 text-sm font-semibold mb-2">
                                    Collection Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="My NFT Collection"
                                />
                            </div>

                            {/* Symbol */}
                            <div>
                                <label className="block text-gray-300 text-sm font-semibold mb-2">
                                    Symbol
                                </label>
                                <input
                                    type="text"
                                    name="symbol"
                                    value={formData.symbol}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="NFT"
                                />
                            </div>

                            {/* Metadata URI */}
                            <div>
                                <label className="block text-gray-300 text-sm font-semibold mb-2">
                                    Metadata URI
                                </label>
                                <input
                                    type="text"
                                    name="uri"
                                    value={formData.uri}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="https://..."
                                />
                                <p className="text-gray-400 text-xs mt-1">
                                    Upload your metadata JSON file to a service like Arweave or IPFS
                                </p>
                            </div>

                            {/* Royalty */}
                            <div>
                                <label className="block text-gray-300 text-sm font-semibold mb-2">
                                    Royalty (Basis Points)
                                </label>
                                <input
                                    type="number"
                                    name="royaltyBasisPoints"
                                    value={formData.royaltyBasisPoints}
                                    onChange={handleInputChange}
                                    min="0"
                                    max="10000"
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="500"
                                />
                                <p className="text-gray-400 text-xs mt-1">
                                    100 basis points = 1% (e.g., 500 = 5% royalty)
                                </p>
                            </div>
                        </div>

                        {/* Create Button */}
                        <button
                            onClick={handleCreateCollection}
                            disabled={loading}
                            className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:transform-none"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Creating Collection...
                                </span>
                            ) : (
                                '🎨 Create Collection NFT'
                            )}
                        </button>
                    </div>
                )}

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
                        {collectionAddress && (
                            <div className="mt-3 space-y-2">
                                <div className="bg-black/20 rounded p-2">
                                    <p className="text-xs text-gray-400 mb-1">Collection Address:</p>
                                    <p className="font-mono text-sm break-all">{collectionAddress}</p>
                                </div>
                                <a
                                    href={`https://solscan.io/token/${collectionAddress}${CLUSTER !== 'mainnet-beta' ? '?cluster=devnet' : ''}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm underline block hover:text-white transition-colors"
                                >
                                    View on Solscan →
                                </a>
                            </div>
                        )}
                        {txSignature && !collectionAddress && (
                            <a
                                href={`https://solscan.io/tx/${txSignature}${CLUSTER !== 'mainnet-beta' ? '?cluster=devnet' : ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm underline mt-2 block hover:text-white transition-colors"
                            >
                                View Transaction on Solscan →
                            </a>
                        )}
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-blue-200 text-sm">
                    <p className="font-semibold mb-2">ℹ️ Instructions:</p>
                    <ol className="space-y-1 list-decimal list-inside">
                        <li>Connect your wallet</li>
                        <li>Fill in your collection details</li>
                        <li>Upload metadata JSON to Arweave/IPFS first</li>
                        <li>Click "Create Collection NFT"</li>
                        <li>Use the collection address in your minting program</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}

export default CreateCollection;