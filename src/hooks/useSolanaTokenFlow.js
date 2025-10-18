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
import bs58 from 'bs58';
import { toast } from 'react-toastify';

// Constants
const BONDING_CURVE_PROGRAM_ID = new PublicKey("C1yuYbMvQ69dtx4EfZafFKdi34H3YdYWEX9QzXfNDFxb");
const LP_LOCK_PROGRAM_ID = new PublicKey("GJBWK2HdEyyQaxNvbjw3TXWEXZXbNz6oYhNKUtj7SvBD");
const PLATFORM_AUTHORITY = new PublicKey("35Bk7MrW3c17QWioRuABBEMFwNk4NitXRFBvkzYAupfF");
const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const RPC_URL = "https://api.devnet.solana.com";

const MIGRATION_BOT_PRIVATE_KEY = import.meta.env.VITE_MIGRATION_BOT_PRIVATE_KEY ||
    "YOUR_BASE58_PRIVATE_KEY_HERE";

const BONDING_CURVE_CONFIG = {
    TOTAL_SUPPLY: 1_000_000_000,
    DECIMALS: 9,
    VIRTUAL_SOL_RESERVES: 30,
    VIRTUAL_TOKEN_RESERVES: 1_073_000_000,
    MIGRATION_THRESHOLD: 1,
    INITIAL_REAL_TOKENS: 800_000_000,
};

const pendingTransactions = new Set();

function withDeduplication(key, fn) {
    return async (...args) => {
        if (pendingTransactions.has(key)) {
            toast.warn("Transaction already in progress");
            throw new Error("Transaction already in progress");
        }

        pendingTransactions.add(key);
        try {
            const result = await fn(...args);
            return result;
        } finally {
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

    function getMigrationBotWallet() {
        try {
            return Keypair.fromSecretKey(bs58.decode(MIGRATION_BOT_PRIVATE_KEY));
        } catch (error) {
            console.error("Failed to load migration bot keypair:", error);
            toast.error("Migration bot configuration invalid");
            throw new Error("Migration bot configuration invalid");
        }
    }

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

                if (curveData.realSolReserves.gte(curveData.migrationThreshold) && !curveData.isMigrated) {
                    toast.info("🚀 Migration threshold reached! Starting automatic migration...");
                    await autoMigrateToRaydium(mint, botWallet, botConnection);
                    return true;
                }
                return false;
            } catch (error) {
                console.error("Error checking migration status:", error);
                return false;
            }
        })();
    }

    async function autoMigrateToRaydium(mint, botWallet, botConnection) {
        const migrateKey = `migrate-${mint.toString()}`;
        const toastId = toast.loading("Migrating to Raydium...");

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

                toast.update(toastId, { render: "Step 1/4: Preparing migration..." });
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

                const updatedCurveData = await program.account.bondingCurve.fetch(bondingCurve);

                toast.update(toastId, { render: "Step 2/4: Withdrawing tokens and SOL..." });
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

                toast.update(toastId, { render: "Step 3/4: Creating Raydium pool..." });
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

                toast.update(toastId, { render: "Step 4/4: Locking LP tokens..." });
                const lpMint = new PublicKey(extInfo.address.lpMint);
                await autoLockLPTokens(lpMint, botWallet, botConnection);

                toast.update(toastId, { 
                    render: "🎉 Migration complete! Token now trading on Raydium", 
                    type: "success", 
                    isLoading: false,
                    autoClose: 5000
                });

                return {
                    migrateTxid: sig,
                    withdrawTxid: sig1,
                    poolTxid: poolTx.txId,
                    lpMint: extInfo.address.lpMint,
                    poolAddress: extInfo.address.ammId?.toString(),
                };
            } catch (error) {
                console.error("❌ Auto-migration failed:", error);
                toast.update(toastId, { 
                    render: `Migration failed: ${error.message}`, 
                    type: "error", 
                    isLoading: false,
                    autoClose: 5000
                });
                throw error;
            }
        })();
    }

    async function autoLockLPTokens(lpMint, botWallet, botConnection) {
        const lockKey = `lock-${lpMint.toString()}`;

        return withDeduplication(lockKey, async () => {
            try {
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

                const mintInfo = await getMint(botConnection, lpMint, 'confirmed');
                const tokenProgramId = mintInfo.tlvData.length > 0 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

                const fromTokenAccount = await getAssociatedTokenAddress(
                    lpMint,
                    botWallet.publicKey,
                    false,
                    tokenProgramId
                );

                let retries = 5;
                let lpBalance;

                while (retries > 0) {
                    try {
                        lpBalance = await botConnection.getTokenAccountBalance(fromTokenAccount, 'confirmed');

                        if (lpBalance && lpBalance.value.amount !== '0') {
                            break;
                        }

                        await new Promise(resolve => setTimeout(resolve, 2000));
                        retries--;
                    } catch (error) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        retries--;
                    }
                }

                if (!lpBalance || lpBalance.value.amount === '0') {
                    throw new Error("LP tokens not found in bot wallet after multiple retries");
                }

                const lockAmount = new BN(lpBalance.value.amount)
                    .mul(new BN(60))
                    .div(new BN(100));

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
                        new BN(300),
                        new BN(25000),
                        PLATFORM_AUTHORITY
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

                return { txid, lockInfo, lockVault };
            } catch (error) {
                console.error("Error locking LP tokens:", error);
                throw error;
            }
        })();
    }

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

            return { mint, mintKeypair, txid };
        })();
    }

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
            return metadataSig[0];
        })();
    }

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

            return { creatorTokenAccount, txid };
        })();
    }

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

            return { bondingCurve, tokenVault, solVault, txid };
        })();
    }

    async function buyTokens(mint, solAmount, slippageBps = 100) {
        const buyKey = `buy-${mint.toString()}-${Date.now()}`;
        const toastId = toast.loading("Preparing buy transaction...");

        return withDeduplication(buyKey, async () => {
            try {
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
                
                toast.update(toastId, { render: "Confirm transaction in wallet..." });
                const txid = await sendTx(tx);

                toast.update(toastId, { 
                    render: `✅ Successfully bought ${(tokensOut.toNumber() / 1e9).toFixed(2)} tokens!`, 
                    type: "success", 
                    isLoading: false,
                    autoClose: 5000
                });

                return { txid, tokensOut };
            } catch (error) {
                toast.update(toastId, { 
                    render: `Buy failed: ${error.message}`, 
                    type: "error", 
                    isLoading: false,
                    autoClose: 5000
                });
                throw error;
            }
        })();
    }

    async function sellTokens(mint, tokenAmount, slippageBps = 100) {
        const sellKey = `sell-${mint.toString()}-${Date.now()}`;
        const toastId = toast.loading("Preparing sell transaction...");

        return withDeduplication(sellKey, async () => {
            try {
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
                
                toast.update(toastId, { render: "Confirm transaction in wallet..." });
                const txid = await sendTx(tx);

                toast.update(toastId, { 
                    render: `✅ Successfully sold for ${(solOut.toNumber() / 1e9).toFixed(4)} SOL!`, 
                    type: "success", 
                    isLoading: false,
                    autoClose: 5000
                });

                return {
                    txid,
                    solOut: parseFloat(solOut.toString()) / 1e9,
                    minSolOut: parseFloat(minSolOut.toString()) / 1e9,
                };
            } catch (error) {
                toast.update(toastId, { 
                    render: `Sell failed: ${error.message}`, 
                    type: "error", 
                    isLoading: false,
                    autoClose: 5000
                });
                throw error;
            }
        })();
    }

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

            const priceInSol = totalTokenReservesNum > 0 ? totalSolReservesNum / totalTokenReservesNum : 0;

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

    async function fetchSolPrice() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const data = await response.json();
            return data.solana.usd;
        } catch (error) {
            console.error('Error fetching SOL price:', error);
            return 186.14;
        }
    }

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
        checkAndAutoMigrate,
        BONDING_CURVE_CONFIG
    };
};

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