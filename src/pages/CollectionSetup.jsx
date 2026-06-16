import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
    updateV1,
    mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import "@solana/wallet-adapter-react-ui/styles.css";
import constants from "../constants";

// Configuration
const PROGRAM_ID = new PublicKey(constants.network.programId);
const COLLECTION_MINT = "BwqA35BKbdEV5miEsJJkQU7373GSHc7qKcyHebtdjPPw";
const METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);
const CLUSTER = constants.network.type;

// Default config values
const DEFAULT_MINTING_FEE = 100000000; // 0.1 SOL in lamports
const DEFAULT_MAX_NFTS = 10;
const DEFAULT_STAKING_MONTHS = 6;

function CollectionSetup() {
    const { t } = useTranslation();
    const { connection } = useConnection();
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [configPda, setConfigPda] = useState("");
    const [txSignature, setTxSignature] = useState("");

    // Config form values
    const [mintingFee, setMintingFee] = useState(DEFAULT_MINTING_FEE);
    const [maxNfts, setMaxNfts] = useState(DEFAULT_MAX_NFTS);
    const [stakingMonths, setStakingMonths] = useState(DEFAULT_STAKING_MONTHS);

    // Helper: Get Metadata PDA
    const getMetadataPDA = (mint) => {
        return PublicKey.findProgramAddressSync(
            [
                Buffer.from("metadata"),
                METADATA_PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
            ],
            METADATA_PROGRAM_ID,
        )[0];
    };

    // Helper: Get Program
    const getProgram = async () => {
        const provider = new anchor.AnchorProvider(connection, wallet, {
            commitment: "confirmed",
        });
        const idl = await fetch("/solana_nft_anchor.json").then((r) =>
            r.json(),
        );
        return new anchor.Program(idl, provider);
    };

    // Update Config Function
    const handleUpdateConfig = async () => {
        if (!wallet.connected || !wallet.publicKey) {
            setStatus(`❌ ${t("status_connect_wallet_first")}`);
            return;
        }

        setLoading(true);
        setStatus(`🔄 ${t("status_updating_config")}`);
        setTxSignature("");

        try {
            const program = await getProgram();

            const [configPdaAddress] = PublicKey.findProgramAddressSync(
                [Buffer.from("config")],
                PROGRAM_ID,
            );

            setConfigPda(configPdaAddress.toString());

            // Execute transaction
            const tx = await program.methods
                .updateConfig(new anchor.BN(mintingFee), maxNfts, stakingMonths)
                .accounts({
                    admin: wallet.publicKey,
                    config: configPdaAddress,
                })
                .rpc();

            setTxSignature(tx);
            setStatus(`✅ ${t("status_config_updated")}`);

            console.log("Transaction:", tx);
        } catch (error) {
            console.error("Error:", error);
            if (error.message.includes("Unauthorized")) {
                setStatus(`❌ ${t("status_only_admin")}`);
            } else {
                setStatus(`❌ ${t("status_error")} ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    // Set Collection Mint
    const handleSetCollectionMint = async () => {
        if (!wallet.connected || !wallet.publicKey) {
            setStatus(`❌ ${t("status_connect_wallet_first")}`);
            return;
        }

        setLoading(true);
        setStatus(`🔄 ${t("status_setting_mint")}`);
        setTxSignature("");

        try {
            const program = await getProgram();

            const collectionMint = new PublicKey(COLLECTION_MINT);
            const collectionMetadata = getMetadataPDA(collectionMint);

            const [configPdaAddress] = PublicKey.findProgramAddressSync(
                [Buffer.from("config")],
                PROGRAM_ID,
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
            setStatus(`✅ ${t("status_mint_set")}`);

            console.log("Transaction:", tx);
        } catch (error) {
            console.error("Error:", error);
            setStatus(`❌ ${t("status_error")} ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Update Collection Authority
    const handleUpdateAuthority = async () => {
        if (!wallet.connected || !wallet.publicKey) {
            setStatus(`❌ ${t("status_connect_wallet_first")}`);
            return;
        }

        setLoading(true);
        setStatus(`🔄 ${t("status_updating_authority")}`);
        setTxSignature("");

        try {
            const [configPdaAddress] = PublicKey.findProgramAddressSync(
                [Buffer.from("config")],
                PROGRAM_ID,
            );

            setConfigPda(configPdaAddress.toString());

            // Initialize UMI
            const endpoint = constants.network.endpoint;

            const umi = createUmi(endpoint)
                .use(mplTokenMetadata())
                .use(walletAdapterIdentity(wallet));

            // Update authority to Config PDA
            const result = await updateV1(umi, {
                mint: umiPublicKey(COLLECTION_MINT),
                authority: umi.identity,
                newUpdateAuthority: umiPublicKey(configPdaAddress.toString()),
            }).sendAndConfirm(umi);

            const signature = Buffer.from(result.signature).toString("base64");
            setTxSignature(signature);
            setStatus(`✅ ${t("status_authority_updated")}`);

            console.log("Transaction:", signature);
        } catch (error) {
            console.error("Error:", error);
            setStatus(`❌ ${t("status_error")} ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
            <div className="max-w-3xl w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">{t("collection_setup_title")}</h1>
                    <p className="text-gray-300">{t("configure_nft_collection")}</p>
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
                                <span className="text-gray-400">{t("network_label")}</span>
                                <span className="text-white font-mono">
                                    {CLUSTER}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">{t("collection_label")}</span>
                                <span className="text-white font-mono text-xs">
                                    {COLLECTION_MINT.slice(0, 8)}...
                                    {COLLECTION_MINT.slice(-8)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">{t("your_wallet_label")}</span>
                                <span className="text-white font-mono text-xs">
                                    {wallet.publicKey.toString().slice(0, 8)}...
                                    {wallet.publicKey.toString().slice(-8)}
                                </span>
                            </div>
                            {configPda && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">{t("config_pda_label")}</span>
                                    <span className="text-green-400 font-mono text-xs">
                                        {configPda.slice(0, 8)}...
                                        {configPda.slice(-8)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-4 mb-6">
                    {/* Update Config Section */}
                    <div className="bg-white/5 rounded-lg p-6 border border-orange-500/30">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-white mb-1">🔧 {t("update_config_admin")}</h3>
                                <p className="text-gray-400 text-sm mb-4">{t("modify_config_params")}</p>

                                <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 mb-4">
                                    <p className="text-orange-300 text-xs">⚠️ {t("admin_wallet_warning")}</p>
                                </div>

                                {/* Config Form */}
                                <div className="space-y-3 bg-white/5 rounded p-4 mb-4">
                                    <div>
                                        <label className="text-gray-300 text-sm block mb-1">{t("new_minting_fee")}</label>
                                        <input
                                            type="number"
                                            value={mintingFee}
                                            onChange={(e) =>
                                                setMintingFee(
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                                            placeholder="100000000"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">{t("default_minting_fee")}</p>
                                    </div>

                                    <div>
                                        <label className="text-gray-300 text-sm block mb-1">{t("new_max_nfts")}</label>
                                        <input
                                            type="number"
                                            value={maxNfts}
                                            onChange={(e) =>
                                                setMaxNfts(
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                                            placeholder="10"
                                            min="1"
                                            max="255"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-gray-300 text-sm block mb-1">{t("new_staking_duration")}</label>
                                        <input
                                            type="number"
                                            value={stakingMonths}
                                            onChange={(e) =>
                                                setStakingMonths(
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                                            placeholder="6"
                                            min="1"
                                            max="255"
                                        />
                                    </div>
                                </div>
                            </div>
                            <span className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-xs font-semibold ml-4">{t("admin_badge")}</span>
                        </div>
                        <button
                            onClick={handleUpdateConfig}
                            disabled={!wallet.connected || loading}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:transform-none"
                        >
                            {loading && status.includes("Updating config") ? (
                                <span className="flex items-center justify-center">
                                    <svg
                                        className="animate-spin h-5 w-5 mr-3"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>{t("processing")}</span>
                            ) : (
                                t("update_config_parameters")
                            )}
                        </button>
                    </div>

                    {/* Step 1 - Set Collection Mint */}
                    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-1">{t("step_1_set_mint")}</h3>
                                <p className="text-gray-400 text-sm">{t("store_collection_mint")}</p>
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
                            {loading && status.includes("Setting") ? (
                                <span className="flex items-center justify-center">
                                    <svg
                                        className="animate-spin h-5 w-5 mr-3"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>{t("processing")}</span>
                            ) : (
                                t("set_collection_mint_btn")
                            )}
                        </button>
                    </div>

                    {/* Step 2 - Update Authority */}
                    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-1">{t("step_2_update_authority")}</h3>
                                <p className="text-gray-400 text-sm">{t("transfer_collection_authority")}</p>
                            </div>
                            <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold">
                                2/2
                            </span>
                        </div>
                        <button
                            onClick={handleUpdateAuthority}
                            disabled={!wallet.connected || loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:transform-none"
                        >
                            {loading && status.includes("Updating") ? (
                                <span className="flex items-center justify-center">
                                    <svg
                                        className="animate-spin h-5 w-5 mr-3"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>{t("processing")}</span>
                            ) : (
                                t("update_collection_authority_btn")
                            )}
                        </button>
                    </div>
                </div>

                {/* Status Display */}
                {status && (
                    <div
                        className={`rounded-lg p-4 mb-4 border ${
                            status.includes("✅")
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : status.includes("❌")
                                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                                  : status.includes("⚠️")
                                    ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                                    : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        }`}
                    >
                        <p className="font-medium">{status}</p>
                        {txSignature && (
                            <a
                                href={constants.getExplorerUrl(txSignature)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm underline mt-2 block hover:text-white transition-colors"
                            >{t("view_on_explorer")}</a>
                        )}
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-200 text-sm">
                    <p className="font-semibold mb-2">⚠️ {t("important_notes")}</p>
                    <ul className="space-y-1 list-disc list-inside">
                        <li>{t("important_note_1")}</li>
                        <li>{t("important_note_2")}</li>
                        <li>{t("important_note_3")}</li>
                        <li>{t("important_note_4")}</li>
                        <li>{t("important_note_5")}</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default CollectionSetup;
