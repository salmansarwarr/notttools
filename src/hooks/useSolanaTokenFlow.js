import { useUnifiedWallet } from "../hooks/useUnifiedWallet";
import { useSolanaActions } from "./useSolanaActions";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import {
    PublicKey,
    SystemProgram,
    Transaction,
    SYSVAR_RENT_PUBKEY,
    Keypair,
    Connection,
} from "@solana/web3.js";
import {
    TOKEN_2022_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountIdempotentInstruction,
    createMintToInstruction,
    createSetAuthorityInstruction,
    AuthorityType,
    getMintLen,
    ExtensionType,
    createInitializeTransferFeeConfigInstruction,
    createInitializeMintInstruction,
    getMint,
    TOKEN_PROGRAM_ID,
    createTransferCheckedInstruction,
} from "@solana/spl-token";
import bondingCurveIDL from './bonding_curve.json';
import lpLockIDL from './lp_escrow.json';
import {
    Raydium,
    TxVersion,
    DEVNET_PROGRAM_ID,
    getCpmmPdaAmmConfigId
} from "@raydium-io/raydium-sdk-v2";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplTokenMetadata, createV1, TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { createSignerFromKeypair } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import bs58 from 'bs58'

// Constants
const BONDING_CURVE_PROGRAM_ID = new PublicKey("C1yuYbMvQ69dtx4EfZafFKdi34H3YdYWEX9QzXfNDFxb");
const LP_LOCK_PROGRAM_ID = new PublicKey("GJBWK2HdEyyQaxNvbjw3TXWEXZXbNz6oYhNKUtj7SvBD");
const PLATFORM_AUTHORITY = new PublicKey("35Bk7MrW3c17QWioRuABBEMFwNk4NitXRFBvkzYAupfF");
const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const RPC_URL = "https://api.devnet.solana.com";

// ⚡ MIGRATION BOT KEYPAIR - Store this securely in production (use env vars)
const MIGRATION_BOT_PRIVATE_KEY = import.meta.env.VITE_MIGRATION_BOT_PRIVATE_KEY ||
    "YOUR_BASE58_PRIVATE_KEY_HERE"; // Replace with actual private key

const BONDING_CURVE_CONFIG = {
    TOTAL_SUPPLY: 1_000_000_000,
    DECIMALS: 9,
    VIRTUAL_SOL_RESERVES: 30, // 30 SOL virtual liquidity
    VIRTUAL_TOKEN_RESERVES: 1_073_000_000, // ~1.073B tokens (creates initial price)
    MIGRATION_THRESHOLD: 1, // 🔥 Changed to 1 SOL for testing
    INITIAL_REAL_TOKENS: 800_000_000, // 800M tokens available for trading (80%)
};

// Transaction deduplication helper
const pendingTransactions = new Set();

function withDeduplication(key, fn) {
    return async (...args) => {
        if (pendingTransactions.has(key)) {
            throw new Error("Transaction already in progress");
        }

        pendingTransactions.add(key);
        try {
            const result = await fn(...args);
            return result;
        } finally {
            // Remove after a delay to prevent immediate resubmission
            setTimeout(() => pendingTransactions.delete(key), 5000);
        }
    };
}

function explorerUrl(tx) {
    return `https://explorer.solana.com/tx/${tx}?cluster=devnet`;
}

export const useBondingCurveFlow = () => {
    const { connection, publicKey, sendTx, signTransaction } = useSolanaActions();
    const wallet = useUnifiedWallet();

    const umi = createUmi(RPC_URL)
        .use(mplTokenMetadata())
        .use(mplToolbox())
        .use(walletAdapterIdentity(wallet));

    // ============================================
    // MIGRATION BOT HELPER
    // ============================================
    function getMigrationBotWallet() {
        try {
            return Keypair.fromSecretKey(bs58.decode(MIGRATION_BOT_PRIVATE_KEY));
        } catch (error) {
            console.error("Failed to load migration bot keypair:", error);
            throw new Error("Migration bot configuration invalid");
        }
    }

    // Helper function to send transaction with proper confirmation
    async function sendAndConfirmTransactionWithRetry(connection, transaction, signers, options = {}) {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

        transaction.recentBlockhash = blockhash;
        transaction.feePayer = signers[0].publicKey;
        transaction.sign(...signers);

        const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            maxRetries: 3,
            preflightCommitment: 'confirmed',
            ...options
        });

        await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
        }, options.commitment || 'confirmed');

        return signature;
    }

    // ============================================
    // CHECK AND AUTO-MIGRATE
    // ============================================
    async function checkAndAutoMigrate(mint) {
        const checkKey = `check-migrate-${mint.toString()}`;

        return withDeduplication(checkKey, async () => {
            try {
                const botWallet = getMigrationBotWallet();
                const botConnection = new Connection(RPC_URL, 'confirmed');
                const provider = new AnchorProvider(botConnection, {
                    publicKey: botWallet.publicKey,
                    signTransaction: async (tx) => {
                        tx.sign(botWallet);
                        return tx;
                    },
                    signAllTransactions: async (txs) => {
                        txs.forEach(tx => tx.sign(botWallet));
                        return txs;
                    }
                }, {
                    commitment: 'confirmed',
                    preflightCommitment: 'confirmed'
                });
                const program = new Program(bondingCurveIDL, provider);

                const [bondingCurve] = PublicKey.findProgramAddressSync(
                    [Buffer.from("bonding_curve"), mint.toBuffer()],
                    BONDING_CURVE_PROGRAM_ID
                );

                const curveData = await program.account.bondingCurve.fetch(bondingCurve);

                console.log("📊 Checking migration eligibility...");
                console.log(`   Real SOL Reserves: ${curveData.realSolReserves.toNumber() / 1e9} SOL`);
                console.log(`   Migration Threshold: ${curveData.migrationThreshold.toNumber() / 1e9} SOL`);
                console.log(`   Is Migrated: ${curveData.isMigrated}`);

                // Check if migration threshold reached and not already migrated
                if (curveData.realSolReserves.gte(curveData.migrationThreshold) && !curveData.isMigrated) {
                    console.log("🚀 MIGRATION THRESHOLD REACHED! Starting automatic migration...");
                    await autoMigrateToRaydium(mint, botWallet, botConnection);
                    return true;
                } else {
                    console.log("⏳ Migration threshold not yet reached");
                    return false;
                }
            } catch (error) {
                console.error("Error checking migration status:", error);
                return false;
            }
        })();
    }

    // ============================================
    // AUTO-MIGRATE TO RAYDIUM (BOT CONTROLLED)
    // ============================================
    async function autoMigrateToRaydium(mint, botWallet, botConnection) {
        const migrateKey = `migrate-${mint.toString()}`;

        return withDeduplication(migrateKey, async () => {
            try {
                const provider = new AnchorProvider(botConnection, {
                    publicKey: botWallet.publicKey,
                    signTransaction: async (tx) => {
                        tx.sign(botWallet);
                        return tx;
                    },
                    signAllTransactions: async (txs) => {
                        txs.forEach(tx => tx.sign(botWallet));
                        return txs;
                    }
                }, {
                    commitment: 'confirmed',
                    preflightCommitment: 'confirmed'
                });
                const program = new Program(bondingCurveIDL, provider);

                const [bondingCurve] = PublicKey.findProgramAddressSync(
                    [Buffer.from("bonding_curve"), mint.toBuffer()],
                    BONDING_CURVE_PROGRAM_ID
                );

                const [solVault] = PublicKey.findProgramAddressSync(
                    [Buffer.from("sol_vault"), mint.toBuffer()],
                    BONDING_CURVE_PROGRAM_ID
                );

                // Step 1: Migrate to Raydium (charges 5% fee)
                console.log("Step 1: Calling migrate_to_raydium...");
                const migrateIx = await program.methods
                    .migrateToRaydium()
                    .accounts({
                        bondingCurve,
                        authority: botWallet.publicKey,
                        platformAuthority: PLATFORM_AUTHORITY,
                        bondingCurveSolVault: solVault,
                    })
                    .instruction();

                const migrateTx = new Transaction().add(migrateIx);
                const sig = await sendAndConfirmTransactionWithRetry(
                    botConnection,
                    migrateTx,
                    [botWallet],
                    { commitment: "finalized" }
                );

                console.log("✅ Migration prepared:", explorerUrl(sig));

                // Refresh curve data
                const updatedCurveData = await program.account.bondingCurve.fetch(bondingCurve);

                // Step 2: Withdraw tokens and SOL for pool creation
                console.log("Step 2: Withdrawing tokens and SOL for pool...");
                const [tokenVault] = PublicKey.findProgramAddressSync(
                    [Buffer.from("token_vault"), mint.toBuffer()],
                    BONDING_CURVE_PROGRAM_ID
                );

                const poolCreatorTokenAccount = await getAssociatedTokenAddress(
                    mint,
                    botWallet.publicKey,
                    false,
                    TOKEN_2022_PROGRAM_ID
                );

                const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
                    botWallet.publicKey,
                    poolCreatorTokenAccount,
                    botWallet.publicKey,
                    mint,
                    TOKEN_2022_PROGRAM_ID
                );

                const withdrawIx = await program.methods
                    .withdrawForPool()
                    .accounts({
                        bondingCurve,
                        bondingCurveTokenVault: tokenVault,
                        bondingCurveSolVault: solVault,
                        tokenMint: mint,
                        destination: botWallet.publicKey,
                        destinationTokenAccount: poolCreatorTokenAccount,
                        authority: botWallet.publicKey,
                        tokenProgram: TOKEN_2022_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .instruction();

                const withdrawTx = new Transaction().add(createAtaIx, withdrawIx);
                const sig1 = await sendAndConfirmTransactionWithRetry(
                    botConnection,
                    withdrawTx,
                    [botWallet],
                    { commitment: "finalized" }
                );

                console.log("💰 Tokens & SOL withdrawn:", explorerUrl(sig1));

                // Step 3: Create Raydium Pool
                console.log("Step 3: Creating Raydium pool...");
                const raydium = await Raydium.load({
                    owner: botWallet.publicKey,
                    signAllTransactions: async (transactions) => {
                        return Promise.all(transactions.map(tx => {
                            tx.sign(botWallet);
                            return tx;
                        }));
                    },
                    connection: botConnection,
                    cluster: 'devnet',
                    disableFeatureCheck: true,
                    disableLoadToken: false,
                    blockhashCommitment: 'finalized',
                });

                const mintA = await raydium.token.getTokenInfo(mint);
                const mintB = await raydium.token.getTokenInfo(SOL_MINT);

                const feeConfigs = await raydium.api.getCpmmConfigs();
                if (raydium.cluster === 'devnet') {
                    feeConfigs.forEach((config) => {
                        config.id = getCpmmPdaAmmConfigId(
                            DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
                            config.index
                        ).publicKey.toBase58();
                    });
                }

                const { execute, extInfo } = await raydium.cpmm.createPool({
                    programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
                    poolFeeAccount: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC,
                    mintA,
                    mintB,
                    mintAAmount: updatedCurveData.migrationTokens,
                    mintBAmount: updatedCurveData.migrationSol,
                    startTime: new BN(Math.floor(Date.now() / 1000)),
                    feeConfig: feeConfigs[0],
                    ownerInfo: {
                        useSOLBalance: true,
                    },
                    associatedOnly: false,
                    txVersion: TxVersion.LEGACY,
                    computeBudgetConfig: {
                        units: 600000,
                        microLamports: 200000
                    },
                });

                const poolTx = await execute({ sendAndConfirm: true });

                console.log("🏊 Raydium Pool Created:", explorerUrl(poolTx.txId));
                console.log(`   LP Mint: ${extInfo.address.lpMint}`);
                console.log(`   Pool Address: ${extInfo.address.ammId?.toString()}`);

                // Step 4: Lock 60% of LP tokens
                console.log("Step 4: Locking LP tokens...");
                const lpMint = new PublicKey(extInfo.address.lpMint);
                await autoLockLPTokens(lpMint, botWallet, botConnection);

                console.log("🎉 MIGRATION COMPLETE!");

                return {
                    migrateTxid: sig,
                    withdrawTxid: sig1,
                    poolTxid: poolTx.txId,
                    lpMint: extInfo.address.lpMint,
                    poolAddress: extInfo.address.ammId?.toString(),
                };
            } catch (error) {
                console.error("❌ Auto-migration failed:", error);
                throw error;
            }
        })();
    }

    // ============================================
    // AUTO-LOCK LP TOKENS (BOT CONTROLLED)
    // ============================================
    async function autoLockLPTokens(lpMint, botWallet, botConnection) {
        const lockKey = `lock-${lpMint.toString()}`;

        return withDeduplication(lockKey, async () => {
            try {
                console.log("Waiting for LP tokens to arrive...");

                // Wait for pool creation to fully settle
                await new Promise(resolve => setTimeout(resolve, 3000));

                const provider = new AnchorProvider(botConnection, {
                    publicKey: botWallet.publicKey,
                    signTransaction: async (tx) => {
                        tx.sign(botWallet);
                        return tx;
                    },
                    signAllTransactions: async (txs) => {
                        txs.forEach(tx => tx.sign(botWallet));
                        return txs;
                    }
                }, {
                    commitment: 'confirmed'
                });
                const lpLockProgram = new Program(lpLockIDL, provider);

                const [lockInfo] = PublicKey.findProgramAddressSync(
                    [Buffer.from("lock"), lpMint.toBuffer()],
                    LP_LOCK_PROGRAM_ID
                );

                const [lockVault] = PublicKey.findProgramAddressSync(
                    [Buffer.from("lock_vault"), lpMint.toBuffer()],
                    LP_LOCK_PROGRAM_ID
                );

                // Get mint info to determine token program
                const mintInfo = await getMint(botConnection, lpMint, 'confirmed');
                const tokenProgramId = mintInfo.tlvData.length > 0 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

                console.log(`LP Mint: ${lpMint.toString()}`);
                console.log(`Token Program: ${tokenProgramId.toString()}`);

                const fromTokenAccount = await getAssociatedTokenAddress(
                    lpMint,
                    botWallet.publicKey,
                    false,
                    tokenProgramId
                );

                console.log(`Bot's LP Token Account: ${fromTokenAccount.toString()}`);

                // Verify the account exists and has a balance
                let retries = 5;
                let lpBalance;

                while (retries > 0) {
                    try {
                        lpBalance = await botConnection.getTokenAccountBalance(fromTokenAccount, 'confirmed');

                        if (lpBalance && lpBalance.value.amount !== '0') {
                            console.log(`LP Balance found: ${lpBalance.value.amount}`);
                            break;
                        }

                        console.log(`Retry ${6 - retries}: No balance yet, waiting...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        retries--;
                    } catch (error) {
                        console.log(`Retry ${6 - retries}: Account not found, waiting...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        retries--;
                    }
                }

                if (!lpBalance || lpBalance.value.amount === '0') {
                    throw new Error("LP tokens not found in bot wallet after multiple retries");
                }

                // Lock 60% of LP tokens
                const lockAmount = new BN(lpBalance.value.amount)
                    .mul(new BN(60))
                    .div(new BN(100));

                console.log(`Locking ${lockAmount.toString()} LP tokens (60% of ${lpBalance.value.amount})`);

                // Create ATA instruction (idempotent, safe to call even if exists)
                const userAtaIx = createAssociatedTokenAccountIdempotentInstruction(
                    botWallet.publicKey,
                    fromTokenAccount,
                    botWallet.publicKey,
                    lpMint,
                    tokenProgramId
                );

                const ixInitialize = await lpLockProgram.methods
                    .initializeLock(
                        lpMint,
                        lockAmount,
                        new BN(300), // 300+ holders
                        new BN(25000), // $25,000 volume
                        PLATFORM_AUTHORITY // oracle authority
                    )
                    .accounts({
                        lockInfo,
                        authority: botWallet.publicKey,
                        fromTokenAccount,
                        tokenMint: lpMint,
                        lockTokenAccount: lockVault,
                        tokenProgram: tokenProgramId,
                        systemProgram: SystemProgram.programId,
                        rent: SYSVAR_RENT_PUBKEY,
                    })
                    .instruction();

                const tx = new Transaction().add(userAtaIx, ixInitialize);
                const txid = await sendAndConfirmTransactionWithRetry(
                    botConnection,
                    tx,
                    [botWallet],
                    { commitment: "finalized" }
                );

                console.log("🔒 LP Tokens Locked (60%):", explorerUrl(txid));
                console.log(`   Amount: ${lockAmount.toString()} LP tokens`);
                console.log(`   Lock Info PDA: ${lockInfo.toString()}`);
                console.log(`   Lock Vault: ${lockVault.toString()}`);

                return { txid, lockInfo, lockVault };
            } catch (error) {
                console.error("Error locking LP tokens:", error);

                // Log more details for debugging
                if (error.message?.includes('TokenAccountNotFoundError')) {
                    console.error("LP token account was not created. This might be a timing issue or the pool creation failed.");
                }

                throw error;
            }
        })();
    }

    // ============================================
    // 1. CREATE TOKEN MINT
    // ============================================
    async function createTokenMint(formData) {
        const mintKey = `create-mint-${Date.now()}`;

        return withDeduplication(mintKey, async () => {
            const mintKeypair = Keypair.generate();
            const mint = mintKeypair.publicKey;

            const extensions = [ExtensionType.TransferFeeConfig];
            const mintLen = getMintLen(extensions);
            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

            const feeBasisPoints = 75;
            const maxFee = BigInt(9 * Math.pow(10, BONDING_CURVE_CONFIG.DECIMALS));

            const tx = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: publicKey,
                    newAccountPubkey: mint,
                    space: mintLen,
                    lamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                }),
                createInitializeTransferFeeConfigInstruction(
                    mint,
                    publicKey,
                    publicKey,
                    feeBasisPoints,
                    maxFee,
                    TOKEN_2022_PROGRAM_ID
                ),
                createInitializeMintInstruction(
                    mint,
                    BONDING_CURVE_CONFIG.DECIMALS,
                    publicKey,
                    null,
                    TOKEN_2022_PROGRAM_ID
                )
            );

            const txid = await sendTx(tx, [mintKeypair]);
            console.log("🪙 Token Mint Created:", explorerUrl(txid));

            return { mint, mintKeypair, txid };
        })();
    }

    // ============================================
    // 2. ADD METADATA
    // ============================================
    async function addMetadata(mintKeypair, formData) {
        const metadataKey = `metadata-${mintKeypair.publicKey.toString()}`;

        return withDeduplication(metadataKey, async () => {
            const tokenMetadata = await uploadToPinata(formData);
            const umiMintSigner = createSignerFromKeypair(
                umi,
                umi.eddsa.createKeypairFromSecretKey(mintKeypair.secretKey)
            );

            const metadataTx = await createV1(umi, {
                mint: umiMintSigner,
                authority: umi.identity,
                payer: umi.identity,
                updateAuthority: umi.identity,
                name: tokenMetadata.name,
                symbol: tokenMetadata.symbol,
                uri: tokenMetadata.uri,
                sellerFeeBasisPoints: 75,
                tokenStandard: TokenStandard.Fungible,
            }).sendAndConfirm(umi);

            const metadataSig = base58.deserialize(metadataTx.signature);
            console.log("🧾 Metadata Added:", explorerUrl(metadataSig[0]));
            return metadataSig[0];
        })();
    }

    // ============================================
    // 3. MINT TOKENS TO WALLET
    // ============================================
    async function mintTokensToWallet(mint) {
        const mintTokensKey = `mint-tokens-${mint.toString()}`;

        return withDeduplication(mintTokensKey, async () => {
            const totalSupply = new BN(BONDING_CURVE_CONFIG.TOTAL_SUPPLY)
                .mul(new BN(10).pow(new BN(BONDING_CURVE_CONFIG.DECIMALS)));

            const creatorTokenAccount = await getAssociatedTokenAddress(
                mint,
                publicKey,
                false,
                TOKEN_2022_PROGRAM_ID
            );

            const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
                publicKey,
                creatorTokenAccount,
                publicKey,
                mint,
                TOKEN_2022_PROGRAM_ID
            );

            const mintToInstruction = createMintToInstruction(
                mint,
                creatorTokenAccount,
                publicKey,
                totalSupply.toString(),
                [],
                TOKEN_2022_PROGRAM_ID
            );

            const tx = new Transaction().add(createAtaIx, mintToInstruction);
            const txid = await sendTx(tx);

            console.log("🪙 Tokens Minted to Creator:", explorerUrl(txid));

            return { creatorTokenAccount, txid };
        })();
    }

    // ============================================
    // 4. INITIALIZE BONDING CURVE & TRANSFER TOKENS
    // ============================================
    async function initializeBondingCurve(mint, creatorTokenAccount) {
        const initKey = `init-curve-${mint.toString()}`;

        return withDeduplication(initKey, async () => {
            const provider = new AnchorProvider(
                connection,
                { publicKey, signTransaction: async tx => tx },
                {}
            );
            const program = new Program(bondingCurveIDL, provider);

            const [bondingCurve] = PublicKey.findProgramAddressSync(
                [Buffer.from("bonding_curve"), mint.toBuffer()],
                BONDING_CURVE_PROGRAM_ID
            );

            const [tokenVault] = PublicKey.findProgramAddressSync(
                [Buffer.from("token_vault"), mint.toBuffer()],
                BONDING_CURVE_PROGRAM_ID
            );

            const [solVault] = PublicKey.findProgramAddressSync(
                [Buffer.from("sol_vault"), mint.toBuffer()],
                BONDING_CURVE_PROGRAM_ID
            );

            const totalSupply = new BN(BONDING_CURVE_CONFIG.TOTAL_SUPPLY)
                .mul(new BN(10).pow(new BN(BONDING_CURVE_CONFIG.DECIMALS)));

            const virtualTokenReserves = new BN(BONDING_CURVE_CONFIG.VIRTUAL_TOKEN_RESERVES)
                .mul(new BN(1_000_000_000));

            const virtualSolReserves = new BN(BONDING_CURVE_CONFIG.VIRTUAL_SOL_RESERVES)
                .mul(new BN(1_000_000_000));

            const migrationThreshold = new BN(BONDING_CURVE_CONFIG.MIGRATION_THRESHOLD)
                .mul(new BN(1_000_000_000));

            const initializeIx = await program.methods
                .initializeBondingCurve(
                    virtualTokenReserves,
                    virtualSolReserves,
                    migrationThreshold,
                    totalSupply
                )
                .accounts({
                    bondingCurve,
                    tokenVault,
                    solVault,
                    tokenMint: mint,
                    creator: publicKey,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .instruction();

            const transferIx = createTransferCheckedInstruction(
                creatorTokenAccount,
                mint,
                tokenVault,
                publicKey,
                totalSupply.toString(),
                BONDING_CURVE_CONFIG.DECIMALS,
                [],
                TOKEN_2022_PROGRAM_ID
            );

            const revokeIx = createSetAuthorityInstruction(
                mint,
                publicKey,
                AuthorityType.MintTokens,
                null,
                [],
                TOKEN_2022_PROGRAM_ID
            );

            const tx = new Transaction().add(initializeIx, transferIx, revokeIx);
            const txid = await sendTx(tx);

            console.log("📈 Bonding Curve Initialized:", explorerUrl(txid));

            return { bondingCurve, tokenVault, solVault, txid };
        })();
    }

    // ============================================
    // 5. BUY TOKENS ON CURVE (WITH AUTO-MIGRATION CHECK)
    // ============================================
    async function buyTokens(mint, solAmount, slippageBps = 100) {
        const buyKey = `buy-${mint.toString()}-${Date.now()}`;

        return withDeduplication(buyKey, async () => {
            const provider = new AnchorProvider(
                connection,
                { publicKey, signTransaction: async tx => tx },
                {}
            );
            const program = new Program(bondingCurveIDL, provider);

            const [bondingCurve] = PublicKey.findProgramAddressSync(
                [Buffer.from("bonding_curve"), mint.toBuffer()],
                BONDING_CURVE_PROGRAM_ID
            );

            const [tokenVault] = PublicKey.findProgramAddressSync(
                [Buffer.from("token_vault"), mint.toBuffer()],
                BONDING_CURVE_PROGRAM_ID
            );

            const [solVault] = PublicKey.findProgramAddressSync(
                [Buffer.from("sol_vault"), mint.toBuffer()],
                BONDING_CURVE_PROGRAM_ID
            );

            const buyerTokenAccount = await getAssociatedTokenAddress(
                mint,
                publicKey,
                false,
                TOKEN_2022_PROGRAM_ID
            );

            const solAmountBN = new BN(solAmount * 1e9);
            const curveData = await program.account.bondingCurve.fetch(bondingCurve);
            const tokensOut = calculateTokensOut(
                solAmountBN,
                curveData.virtualSolReserves.add(curveData.realSolReserves),
                curveData.virtualTokenReserves.add(curveData.realTokenReserves)
            );
            const minTokensOut = tokensOut.mul(new BN(10000 - slippageBps)).div(new BN(10000));

            const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
                publicKey,
                buyerTokenAccount,
                publicKey,
                mint,
                TOKEN_2022_PROGRAM_ID
            );

            const buyIx = await program.methods
                .buy(solAmountBN, minTokensOut)
                .accounts({
                    bondingCurve,
                    buyer: publicKey,
                    buyerTokenAccount,
                    bondingCurveTokenVault: tokenVault,
                    bondingCurveSolVault: solVault,
                    tokenMint: mint,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();

            const tx = new Transaction().add(createAtaIx, buyIx);
            const txid = await sendTx(tx);

            console.log("💰 Bought tokens:", explorerUrl(txid));

            // // 🔥 CHECK FOR AUTO-MIGRATION AFTER BUY (with delay)
            // setTimeout(async () => {
            //     try {
            //         const migrated = await checkAndAutoMigrate(mint);
            //         if (migrated) {
            //             console.log("🎉 Token automatically migrated to Raydium!");
            //         }
            //     } catch (error) {
            //         console.error("Auto-migration check failed:", error);
            //     }
            // }, 5000); // Wait 5 seconds for transaction to fully confirm

            return { txid, tokensOut };
        })();
    }

    // ============================================
    // 6. SELL TOKENS ON CURVE
    // ============================================
    async function sellTokens(mint, tokenAmount, slippageBps = 100) {
        const sellKey = `sell-${mint.toString()}-${Date.now()}`;

        return withDeduplication(sellKey, async () => {
            const tokenAmountBN = new BN(Math.floor(tokenAmount * 1e9).toString());

            const provider = new AnchorProvider(
                connection,
                { publicKey, signTransaction: async tx => tx },
                {}
            );

            const program = new Program(bondingCurveIDL, provider);

            const [bondingCurve] = PublicKey.findProgramAddressSync(
                [Buffer.from("bonding_curve"), mint.toBuffer()],
                BONDING_CURVE_PROGRAM_ID
            );
            const [tokenVault] = PublicKey.findProgramAddressSync(
                [Buffer.from("token_vault"), mint.toBuffer()],
                BONDING_CURVE_PROGRAM_ID
            );
            const [solVault] = PublicKey.findProgramAddressSync(
                [Buffer.from("sol_vault"), mint.toBuffer()],
                BONDING_CURVE_PROGRAM_ID
            );

            const sellerTokenAccount = await getAssociatedTokenAddress(
                mint,
                publicKey,
                false,
                TOKEN_2022_PROGRAM_ID
            );

            const curveData = await program.account.bondingCurve.fetch(bondingCurve);

            const totalTokenReserves = curveData.virtualTokenReserves.add(curveData.realTokenReserves);
            const totalSolReserves = curveData.virtualSolReserves.add(curveData.realSolReserves);

            if (totalTokenReserves.lte(new BN(0)) || totalSolReserves.lte(new BN(0))) {
                throw new Error("Invalid bonding curve state: zero reserves");
            }

            const solOut = calculateSolOut(tokenAmountBN, totalTokenReserves, totalSolReserves);

            if (!solOut || solOut.lte(new BN(0))) {
                throw new Error("Invalid output amount");
            }

            const minSolOut = solOut.mul(new BN(10000 - slippageBps)).div(new BN(10000));

            const sellIx = await program.methods
                .sell(tokenAmountBN, minSolOut)
                .accounts({
                    bondingCurve,
                    buyer: publicKey,
                    buyerTokenAccount: sellerTokenAccount,
                    bondingCurveTokenVault: tokenVault,
                    bondingCurveSolVault: solVault,
                    tokenMint: mint,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();

            const tx = new Transaction().add(sellIx);
            const txid = await sendTx(tx);

            console.log("📤 Sold tokens:", explorerUrl(txid));
            return {
                txid,
                solOut: parseFloat(solOut.toString()) / 1e9,
                minSolOut: parseFloat(minSolOut.toString()) / 1e9,
            };
        })();
    }

    // ============================================
    // 9. GET BONDING CURVE INFO
    // ============================================
    async function getBondingCurveInfo(mint) {
        try {
            const infoConnection = new Connection(RPC_URL, 'confirmed');
            const provider = new AnchorProvider(infoConnection, {}, {});
            const program = new Program(bondingCurveIDL, provider);

            const [bondingCurve] = PublicKey.findProgramAddressSync(
                [Buffer.from("bonding_curve"), mint.toBuffer()],
                BONDING_CURVE_PROGRAM_ID
            );

            const curveData = await program.account.bondingCurve.fetch(bondingCurve);

            // Convert BN values to numbers with proper decimal handling
            const bnToNumber = (bn, decimals = 9) => {
                const value = parseFloat(bn.toString()) / Math.pow(10, decimals);
                return value;
            };

            const virtualSolReserves = new BN(curveData.virtualSolReserves);
            const realSolReserves = new BN(curveData.realSolReserves);
            const virtualTokenReserves = new BN(curveData.virtualTokenReserves);
            const realTokenReserves = new BN(curveData.realTokenReserves);
            const totalSupply = new BN(curveData.totalSupply);
            const migrationThreshold = new BN(curveData.migrationThreshold);

            const SOL_DECIMALS = 9;
            const TOKEN_DECIMALS = 9;

            const totalSolReserves = virtualSolReserves.add(realSolReserves);
            const totalTokenReserves = virtualTokenReserves.add(realTokenReserves);

            const totalSolReservesNum = bnToNumber(totalSolReserves, SOL_DECIMALS);
            const totalTokenReservesNum = bnToNumber(totalTokenReserves, TOKEN_DECIMALS);
            const realSolReservesNum = bnToNumber(realSolReserves, SOL_DECIMALS);
            const migrationThresholdNum = bnToNumber(migrationThreshold, SOL_DECIMALS);
            const totalSupplyNum = bnToNumber(totalSupply, TOKEN_DECIMALS);

            // Calculate price per token in SOL
            const priceInSol = totalTokenReservesNum > 0 ? totalSolReservesNum / totalTokenReservesNum : 0;

            // Convert SOL price to USD
            const SOL_TO_USD = await fetchSolPrice();
            const priceInUsd = priceInSol * SOL_TO_USD;

            const marketCap = priceInUsd * totalSupplyNum;

            const progress = migrationThresholdNum > 0
                ? (realSolReservesNum / migrationThresholdNum) * 100
                : 0;

            const result = {
                tokenMint: curveData.tokenMint.toString(),
                creator: curveData.creator.toString(),
                realSolReserves: realSolReservesNum,
                realTokenReserves: bnToNumber(realTokenReserves, TOKEN_DECIMALS),
                virtualSolReserves: bnToNumber(virtualSolReserves, SOL_DECIMALS),
                virtualTokenReserves: bnToNumber(virtualTokenReserves, TOKEN_DECIMALS),
                totalSolReserves: totalSolReservesNum,
                totalTokenReserves: totalTokenReservesNum,
                migrationThreshold: migrationThresholdNum,
                isMigrated: curveData.isMigrated,
                progress: Math.min(progress, 100),
                marketCap,
                totalSupply: totalSupplyNum,
                price: priceInUsd,
                priceInSol,
            };

            return result;

        } catch (error) {
            console.error(`Error fetching bonding curve data for mint ${mint.toString()}:`, error);
            throw error;
        }
    }

    // Helper function to fetch SOL price
    async function fetchSolPrice() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const data = await response.json();
            return data.solana.usd;
        } catch (error) {
            console.error('Error fetching SOL price:', error);
            return 186.14; // fallback price
        }
    }

    // ============================================
    // 10. GET PRICE QUOTE
    // ============================================
    async function getPriceQuote(mint, solAmount, isBuy) {
        const curveInfo = await getBondingCurveInfo(mint);

        const solAmountBN = new BN(Math.floor(solAmount * 1e9).toString());
        const solReserves = new BN(Math.floor(curveInfo.totalSolReserves * 1e9).toString());
        const tokenReserves = new BN(Math.floor(curveInfo.totalTokenReserves * 1e9).toString());

        if (isBuy) {
            const tokensOut = calculateTokensOut(solAmountBN, solReserves, tokenReserves);

            const pricePerToken = solAmountBN
                .mul(ONE_E9)
                .div(tokensOut)
                .toString();

            return {
                input: solAmount,
                output: parseFloat(tokensOut.toString()) / 1e9,
                pricePerToken: parseFloat(pricePerToken) / 1e9,
                priceImpact: calculatePriceImpact(solAmountBN, solReserves, tokenReserves, true),
            };
        } else {
            const tokenAmountBN = new BN(Math.floor(solAmount * 1e9).toString());
            const solOut = calculateSolOut(tokenAmountBN, tokenReserves, solReserves);

            const pricePerToken = solOut
                .mul(ONE_E9)
                .div(tokenAmountBN)
                .toString();

            return {
                input: solAmount,
                output: parseFloat(solOut.toString()) / 1e9,
                pricePerToken: parseFloat(pricePerToken) / 1e9,
                priceImpact: calculatePriceImpact(tokenAmountBN, tokenReserves, solReserves, false),
            };
        }
    }

    // ============================================
    // HELPER: Upload to Pinata
    // ============================================
    async function uploadToPinata(formData) {
        const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
        const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY;

        const imageFormData = new FormData();
        imageFormData.append('file', formData.coinMedia);

        const imageResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'pinata_api_key': PINATA_API_KEY,
                'pinata_secret_api_key': PINATA_SECRET_KEY,
            },
            body: imageFormData,
        });

        const imageData = await imageResponse.json();
        const imageUri = `https://gateway.pinata.cloud/ipfs/${imageData.IpfsHash}`;

        const metadata = {
            name: formData.coinName,
            symbol: formData.ticker,
            description: formData.description,
            image: imageUri,
            external_url: formData.website || "",
            social: {
                twitter: formData.twitter || "",
                telegram: formData.telegram || "",
            }
        };

        const metadataResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'pinata_api_key': PINATA_API_KEY,
                'pinata_secret_api_key': PINATA_SECRET_KEY,
            },
            body: JSON.stringify(metadata),
        });

        const metadataData = await metadataResponse.json();
        const metadataUri = `https://gateway.pinata.cloud/ipfs/${metadataData.IpfsHash}`;

        return {
            name: formData.coinName,
            symbol: formData.ticker,
            uri: metadataUri,
        };
    }

    return {
        createTokenMint,
        addMetadata,
        mintTokensToWallet,
        initializeBondingCurve,
        buyTokens,
        sellTokens,
        getBondingCurveInfo,
        getPriceQuote,
        checkAndAutoMigrate, // Export for manual checks
        BONDING_CURVE_CONFIG
    };
};

// ============================================
// MATH HELPERS
// ============================================
const ONE_E9 = new BN("1000000000");

function calculateTokensOut(solIn, solReserves, tokenReserves) {
    if (solIn.lte(new BN(0))) return new BN(0);

    const k = solReserves.mul(tokenReserves);
    const newSolReserves = solReserves.add(solIn);

    if (newSolReserves.lte(new BN(0))) throw new Error("Invalid reserves: newSolReserves <= 0");

    const newTokenReserves = k.div(newSolReserves);
    if (newTokenReserves.gt(tokenReserves)) throw new Error("Reserve inconsistency");

    return tokenReserves.sub(newTokenReserves);
}

function calculateSolOut(tokensIn, tokenReserves, solReserves) {
    if (tokensIn.lte(new BN(0))) return new BN(0);

    const k = tokenReserves.mul(solReserves);
    const newTokenReserves = tokenReserves.add(tokensIn);

    if (newTokenReserves.lte(new BN(0))) throw new Error("Invalid reserves: newTokenReserves <= 0");

    const newSolReserves = k.div(newTokenReserves);
    if (newSolReserves.gt(solReserves)) throw new Error("Reserve inconsistency");

    return solReserves.sub(newSolReserves);
}

function calculatePriceImpact(amountIn, reservesIn, reservesOut, isBuy) {
    const amountOut = isBuy
        ? calculateTokensOut(amountIn, reservesIn, reservesOut)
        : calculateSolOut(amountIn, reservesIn, reservesOut);

    if (amountOut.lte(new BN(0))) return 0;

    const effectivePrice = amountIn.mul(ONE_E9).div(amountOut);
    const spotPrice = reservesIn.mul(ONE_E9).div(reservesOut);

    const impact = effectivePrice.sub(spotPrice).mul(new BN(10000)).div(spotPrice);
    return Math.abs(parseFloat(impact.toString()) / 100);
}