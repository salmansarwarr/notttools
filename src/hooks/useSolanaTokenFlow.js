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
    createTransferCheckedInstruction,
} from "@solana/spl-token";
import bondingCurveIDL from './bonding_curve.json';
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplTokenMetadata, createV1, TokenStandard, updateV1 } from "@metaplex-foundation/mpl-token-metadata";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { createSignerFromKeypair } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { toast } from 'react-toastify';


// Constants
const BONDING_CURVE_PROGRAM_ID = new PublicKey("CPMWvEXzNTnrksm1PPXQzp2UUTXWxCKQaw9HhvDdf3nT");
const PLATFORM_AUTHORITY = new PublicKey("9CgjeM8CfEXXBVMvTfPjbB2iLPNHFCVGgdYRZw9FdjRk")
const RPC_URL = "https://solana-mainnet.api.syndica.io/api-key/21P91u6oC24BUjduDPBnPEdmPWWz7fmFp3jtMBY52Mgq5j1CE9sjKbUv1TzPZGan2pKeDg289fHqvdP6UK5cAHhyJmuHSLE2qm";

const BONDING_CURVE_CONFIG = {
    TOTAL_SUPPLY: 1_000_000_000,
    DECIMALS: 9,
    VIRTUAL_SOL_RESERVES: 30,
    VIRTUAL_TOKEN_RESERVES: 1_073_000_000,
    MIGRATION_THRESHOLD: 85, // 85 SOL
    HOLDER_THRESHOLD: 300,
    VOLUME_THRESHOLD_USD_CENTS: 2500000, // $25,000
};

// 🔒 Global in-memory cache for in-flight actions
const inFlightMap = new Map();

/**
 * Prevents duplicate execution of async actions with the same key.
 * Returns the same promise if already running.
 */
export async function withDeduplication(key, actionFn) {
    // If there's an active operation with this key, return its promise
    if (inFlightMap.has(key)) {
        console.log(`⏳ Deduplication: Waiting for existing task "${key}"`);
        return inFlightMap.get(key);
    }

    // Otherwise, run the action and cache it
    console.log(`🚀 Deduplication: Executing new task "${key}"`);
    const promise = (async () => {
        try {
            return await actionFn();
        } finally {
            // ✅ Always remove key after completion or error
            inFlightMap.delete(key);
            console.log(`✅ Deduplication: Cleared key "${key}"`);
        }
    })();

    // Store the running promise in the map
    inFlightMap.set(key, promise);
    return promise;
}

export const useBondingCurveFlow = () => {
    const { connection, publicKey, sendTx } = useSolanaActions();
    const wallet = useUnifiedWallet();

    const umi = createUmi(RPC_URL)
        .use(mplTokenMetadata())
        .use(mplToolbox())
        .use(walletAdapterIdentity(wallet));

    async function createMicroPool(mint) {
        const toastId = toast.loading("Creating Raydium pool...");

        try {
            // Initialize Raydium
            const raydium = await Raydium.load({
                owner: wallet,
                connection,
                cluster: 'mainnet',
                disableFeatureCheck: true,
                blockhashCommitment: 'finalized',
            });

            // Get token accounts
            const tokenAccounts = await connection.getTokenAccountsByOwner(
                wallet.publicKey,
                { programId: TOKEN_2022_PROGRAM_ID }
            );

            const parsedAccounts = tokenAccounts.value.map((accountInfo) => {
                return {
                    pubkey: accountInfo.pubkey,
                    accountInfo: parseTokenAccountResp(accountInfo.account),
                };
            });

            // Set token accounts for Raydium
            raydium.account.updateTokenAccount(parsedAccounts);

            // Create market first
            const marketResult = await raydium.marketV2.create({
                baseInfo: {
                    mint: mint,
                    decimals: 9,
                },
                quoteInfo: {
                    mint: new PublicKey('So11111111111111111111111111111111111111112'),
                    decimals: 9,
                },
                lotSize: 1,
                tickSize: 0.01,
                dexProgramId: new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'),
            });

            const marketTx = await marketResult.execute({ sendAndConfirm: true });
            console.log('Market created:', marketTx.txId);

            // Wait for market confirmation
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Create pool
            const poolResult = await raydium.liquidity.createPoolV4({
                programId: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
                marketInfo: {
                    marketId: marketResult.extInfo.address,
                    programId: new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'),
                },
                baseMintInfo: {
                    mint: mint,
                    decimals: 9,
                },
                quoteMintInfo: {
                    mint: new PublicKey('So11111111111111111111111111111111111111112'),
                    decimals: 9,
                },
                baseAmount: new BN(1_000_000 * 1e9), // 1M tokens
                quoteAmount: new BN(0.05 * 1e9), // 0.05 SOL
                startTime: new BN(0),
            });

            const poolTx = await poolResult.execute({ sendAndConfirm: true });

            toast.update(toastId, {
                render: "✅ Pool created successfully!",
                type: "success",
                isLoading: false,
                autoClose: 5000
            });

            return {
                poolId: poolResult.extInfo.address.toBase58(),
                marketId: marketResult.extInfo.address.toBase58(),
                txId: poolTx.txId,
            };

        } catch (error) {
            toast.update(toastId, {
                render: `Failed: ${error.message}`,
                type: "error",
                isLoading: false,
                autoClose: 5000
            });
            throw error;
        }
    }

    async function createTokenMint(formData) {
        const mintKey = `create-mint-${Date.now()}`;

        return withDeduplication(mintKey, async () => {
            // Check wallet balance first
            const balance = await connection.getBalance(publicKey);
            const requiredBalance = 0.01 * 1e9; // 0.01 SOL minimum

            if (balance < requiredBalance) {
                throw new Error(`Insufficient SOL balance. You have ${balance / 1e9} SOL but need at least ${requiredBalance / 1e9} SOL`);
            }

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

            // Add compute budget to ensure enough compute units
            const { ComputeBudgetProgram } = await import('@solana/web3.js');
            tx.add(
                ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
            );

            const txid = await sendTx(tx, [mintKeypair]);

            return { mint, mintKeypair, txid };
        });
    }

    async function addMetadata(mintKeypair, formData) {
        const metadataKey = `metadata-${mintKeypair.publicKey.toString()}`;

        return withDeduplication(metadataKey, async () => {
            const tokenMetadata = await uploadToPinata(formData);
            const umiMintSigner = createSignerFromKeypair(
                umi,
                umi.eddsa.createKeypairFromSecretKey(mintKeypair.secretKey)
            );

            // Create metadata
            const metadataTx = await createV1(umi, {
                mint: umiMintSigner,
                authority: umi.identity,
                payer: umi.identity,
                updateAuthority: umi.identity.publicKey,
                name: tokenMetadata.name,
                symbol: tokenMetadata.symbol,
                uri: tokenMetadata.uri,
                sellerFeeBasisPoints: 75,
                tokenStandard: TokenStandard.Fungible,
            }).sendAndConfirm(umi);

            const metadataSig = base58.deserialize(metadataTx.signature);
            console.log('✅ Metadata created:', metadataSig[0]);

            // Wait for metadata to finalize
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Revoke update authority
            try {
                console.log('🔒 Revoking metadata update authority...');

                const revokeUpdateAuthTx = await updateV1(umi, {
                    mint: umiMintSigner.publicKey,
                    authority: umi.identity,
                    newUpdateAuthority: null, // Set to null to revoke permanently
                }).sendAndConfirm(umi);

                const revokeSig = base58.deserialize(revokeUpdateAuthTx.signature);
                console.log('✅ Metadata update authority revoked:', revokeSig[0]);

            } catch (revokeError) {
                console.warn('⚠️  Could not revoke update authority:', revokeError.message);
                // Non-critical error - metadata is still created
            }

            return metadataSig[0];
        });
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

            const { ComputeBudgetProgram } = await import('@solana/web3.js');

            // ==========================================
            // TRANSACTION 1: Create Associated Token Account
            // ==========================================
            console.log('📋 Creating token account...');

            const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
                publicKey,
                creatorTokenAccount,
                publicKey,
                mint,
                TOKEN_2022_PROGRAM_ID
            );

            const createAtaTx = new Transaction().add(createAtaIx);

            try {
                const ataId = await sendTx(createAtaTx);
                console.log('✅ Token account created:', ataId);
            } catch (error) {
                // ATA might already exist, that's OK with idempotent instruction
                if (!error.message?.includes('already in use')) {
                    throw error;
                }
                console.log('ℹ️  Token account already exists');
            }

            // Small delay to ensure account is created
            await new Promise(resolve => setTimeout(resolve, 1000));

            // ==========================================
            // TRANSACTION 2: Mint tokens with compute budget
            // ==========================================
            console.log('🪙 Minting', BONDING_CURVE_CONFIG.TOTAL_SUPPLY.toLocaleString(), 'tokens...');

            const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
                units: 300_000
            });

            const computePriceIx = ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 2000 // Higher priority for large mint
            });

            const mintToInstruction = createMintToInstruction(
                mint,
                creatorTokenAccount,
                publicKey,
                totalSupply.toString(),
                [],
                TOKEN_2022_PROGRAM_ID
            );

            const mintTx = new Transaction().add(
                computeLimitIx,
                computePriceIx,
                mintToInstruction
            );

            const txid = await sendTx(mintTx);
            console.log('✅ Tokens minted successfully:', txid);

            return { creatorTokenAccount, txid };
        });
    }

    async function initializeBondingCurve(mint, creatorTokenAccount) {
        const initKey = `init-curve-${mint.toString()}`;

        return withDeduplication(initKey, async () => {
            const provider = new AnchorProvider(
                connection,
                wallet,
                { commitment: 'confirmed' }
            );

            const program = new Program(bondingCurveIDL, provider);

            // Derive PDAs
            const [bondingCurve] = PublicKey.findProgramAddressSync(
                [Buffer.from("bonding_curve"), mint.toBuffer()],
                BONDING_CURVE_PROGRAM_ID
            );

            const [tokenVault] = PublicKey.findProgramAddressSync(
                [Buffer.from("token_vault"), mint.toBuffer()],
                BONDING_CURVE_PROGRAM_ID
            );

            const [firstBuyerLockVault] = PublicKey.findProgramAddressSync(
                [Buffer.from("first_buyer_lock_vault"), mint.toBuffer()],
                BONDING_CURVE_PROGRAM_ID
            );

            const [solVault] = PublicKey.findProgramAddressSync(
                [Buffer.from("sol_vault"), mint.toBuffer()],
                BONDING_CURVE_PROGRAM_ID
            );

            // Calculate amounts
            const totalSupply = new BN(BONDING_CURVE_CONFIG.TOTAL_SUPPLY)
                .mul(new BN(10).pow(new BN(BONDING_CURVE_CONFIG.DECIMALS)));

            const virtualTokenReserves = new BN(BONDING_CURVE_CONFIG.VIRTUAL_TOKEN_RESERVES)
                .mul(new BN(1_000_000_000));

            const virtualSolReserves = new BN(BONDING_CURVE_CONFIG.VIRTUAL_SOL_RESERVES)
                .mul(new BN(1_000_000_000));

            const migrationThreshold = new BN(BONDING_CURVE_CONFIG.MIGRATION_THRESHOLD)
                .mul(new BN(1_000_000_000));

            console.log('📊 Initializing Bonding Curve...');

            // ============================================
            // TRANSACTION 1: Initialize bonding curve only
            // ============================================
            console.log('📋 Transaction 1: Initializing bonding curve...');

            const initIx = await program.methods
                .initializeBondingCurve(
                    virtualTokenReserves,
                    virtualSolReserves,
                    migrationThreshold,
                    totalSupply,
                    new BN(BONDING_CURVE_CONFIG.HOLDER_THRESHOLD),
                    new BN(BONDING_CURVE_CONFIG.VOLUME_THRESHOLD_USD_CENTS)
                )
                .accounts({
                    bondingCurve,
                    tokenVault,
                    firstBuyerLockVault,
                    solVault,
                    tokenMint: mint,
                    creator: wallet.publicKey,
                    oracleAuthority: PLATFORM_AUTHORITY,
                    tokenProgram: TOKEN_2022_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                .instruction();

            // Add compute budget for heavy transaction
            const { ComputeBudgetProgram } = await import('@solana/web3.js');
            const computeIx = ComputeBudgetProgram.setComputeUnitLimit({
                units: 400_000
            });

            const initTx = new Transaction().add(computeIx, initIx);

            console.log('📤 Sending initialization transaction...');
            const initTxid = await sendTx(initTx);
            console.log('✅ Bonding curve initialized:', initTxid);

            // Wait a moment for the transaction to settle
            await new Promise(resolve => setTimeout(resolve, 2000));

            // ============================================
            // TRANSACTION 2: Transfer tokens to vault
            // ============================================
            console.log('📋 Transaction 2: Transferring tokens to vault...');

            const transferIx = createTransferCheckedInstruction(
                creatorTokenAccount,
                mint,
                tokenVault,
                wallet.publicKey,
                totalSupply,
                BONDING_CURVE_CONFIG.DECIMALS,
                [],
                TOKEN_2022_PROGRAM_ID
            );

            const transferTx = new Transaction().add(transferIx);

            console.log('📤 Sending transfer transaction...');
            const transferTxid = await sendTx(transferTx);
            console.log('✅ Tokens transferred:', transferTxid);

            // ============================================
            // OPTIONAL TRANSACTION 3: Revoke mint authority
            // ============================================
            try {
                console.log('📋 Transaction 3 (optional): Revoking mint authority...');

                const revokeIx = createSetAuthorityInstruction(
                    mint,
                    wallet.publicKey,
                    AuthorityType.MintTokens,
                    null,
                    [],
                    TOKEN_2022_PROGRAM_ID
                );

                const revokeTx = new Transaction().add(revokeIx);

                console.log('📤 Sending revoke transaction...');
                const revokeTxid = await sendTx(revokeTx);
                console.log('✅ Mint authority revoked:', revokeTxid);
            } catch (revokeError) {
                console.warn('⚠️  Could not revoke mint authority:', revokeError.message);
                // Don't throw - this is optional
            }

            console.log('✅ All transactions confirmed!');
            console.log('✅ Bonding curve ready for trading!');

            return {
                bondingCurve,
                tokenVault,
                firstBuyerLockVault,
                solVault,
                txid: initTxid, // Return the init transaction ID
            };
        });
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

                const [firstBuyerLockVault] = PublicKey.findProgramAddressSync(
                    [Buffer.from("first_buyer_lock_vault"), mint.toBuffer()],
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
                        firstBuyerLockVault,
                        bondingCurveSolVault: solVault,
                        tokenMint: mint,
                        tokenProgram: TOKEN_2022_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .instruction();

                const tx = new Transaction().add(createAtaIx, buyIx);

                toast.update(toastId, { render: "Confirm transaction in wallet..." });
                const txid = await sendTx(tx);

                // Check if this was the first buy
                const isFirstBuy = curveData.firstBuyer === null;
                const message = isFirstBuy
                    ? `🔒 First buy! 60% tokens locked until conditions met`
                    : `✅ Successfully bought tokens!`;

                toast.update(toastId, {
                    render: message,
                    type: "success",
                    isLoading: false,
                    autoClose: 5000
                });

                return { txid, tokensOut, isFirstBuy };
            } catch (error) {
                toast.update(toastId, {
                    render: `Buy failed: ${error.message}`,
                    type: "error",
                    isLoading: false,
                    autoClose: 5000
                });
                throw error;
            }
        });
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
                const [firstBuyerLockVault] = PublicKey.findProgramAddressSync(
                    [Buffer.from("first_buyer_lock_vault"), mint.toBuffer()],
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
                        firstBuyerLockVault,
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
                    render: `✅ Successfully sold tokens for SOL!`,
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
        });
    }

    async function batchUpdateData(mint, holderCount, volumeToAddCents) {
        const updateKey = `update-data-${mint.toString()}-${Date.now()}`;
        const toastId = toast.loading("Updating bonding curve data...");

        return withDeduplication(updateKey, async () => {
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

                const currentTimestamp = Math.floor(Date.now() / 1000);
                const updateIx = await program.methods
                    .batchUpdateData(
                        new BN(holderCount),
                        new BN(currentTimestamp),
                        new BN(volumeToAddCents),
                        new BN(currentTimestamp)
                    )
                    .accounts({
                        bondingCurve,
                        oracleAuthority: publicKey,
                    })
                    .instruction();

                const tx = new Transaction().add(updateIx);
                const txid = await sendTx(tx);

                toast.update(toastId, {
                    render: "✅ Successfully updated bonding curve data!",
                    type: "success",
                    isLoading: false,
                    autoClose: 5000
                });

                return { txid };
            } catch (error) {
                toast.update(toastId, {
                    render: `Update failed: ${error.message}`,
                    type: "error",
                    isLoading: false,
                    autoClose: 5000
                });
                throw error;
            }
        });
    }

    async function checkUnlockConditions(mint) {
        const checkKey = `check-unlock-${mint.toString()}-${Date.now()}`;
        const toastId = toast.loading("Checking unlock conditions...");

        return withDeduplication(checkKey, async () => {
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

                const checkIx = await program.methods
                    .checkUnlockConditions()
                    .accounts({
                        bondingCurve,
                    })
                    .instruction();

                const tx = new Transaction().add(checkIx);
                const txid = await sendTx(tx);

                const curveData = await program.account.bondingCurve.fetch(bondingCurve);

                toast.update(toastId, {
                    render: curveData.unlockable
                        ? "🎉 Unlock conditions met!"
                        : "⏳ Unlock conditions not yet met",
                    type: curveData.unlockable ? "success" : "info",
                    isLoading: false,
                    autoClose: 5000
                });

                return { txid, unlockable: curveData.unlockable };
            } catch (error) {
                toast.update(toastId, {
                    render: `Check failed: ${error.message}`,
                    type: "error",
                    isLoading: false,
                    autoClose: 5000
                });
                throw error;
            }
        });
    }

    async function unlockFirstBuyerTokens(mint) {
        const unlockKey = `unlock-${mint.toString()}-${Date.now()}`;
        const toastId = toast.loading("Unlocking first buyer tokens...");

        return withDeduplication(unlockKey, async () => {
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

                const [firstBuyerLockVault] = PublicKey.findProgramAddressSync(
                    [Buffer.from("first_buyer_lock_vault"), mint.toBuffer()],
                    BONDING_CURVE_PROGRAM_ID
                );

                const firstBuyerTokenAccount = await getAssociatedTokenAddress(
                    mint,
                    publicKey,
                    false,
                    TOKEN_2022_PROGRAM_ID
                );

                const unlockIx = await program.methods
                    .unlockFirstBuyerTokens()
                    .accounts({
                        bondingCurve,
                        firstBuyerLockVault,
                        firstBuyerTokenAccount,
                        tokenMint: mint,
                        firstBuyer: publicKey,
                        tokenProgram: TOKEN_2022_PROGRAM_ID,
                    })
                    .instruction();

                const tx = new Transaction().add(unlockIx);
                const txid = await sendTx(tx);

                toast.update(toastId, {
                    render: "🔓 Successfully unlocked first buyer tokens!",
                    type: "success",
                    isLoading: false,
                    autoClose: 5000
                });

                return { txid };
            } catch (error) {
                toast.update(toastId, {
                    render: `Unlock failed: ${error.message}`,
                    type: "error",
                    isLoading: false,
                    autoClose: 5000
                });
                throw error;
            }
        });
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
            const firstBuyerLockedAmount = new BN(curveData.firstBuyerLockedAmount);

            const SOL_DECIMALS = 9;
            const TOKEN_DECIMALS = 9;

            const totalSolReserves = virtualSolReserves.add(realSolReserves);
            const totalTokenReserves = virtualTokenReserves.add(realTokenReserves);

            const totalSolReservesNum = bnToNumber(totalSolReserves, SOL_DECIMALS);
            const totalTokenReservesNum = bnToNumber(totalTokenReserves, TOKEN_DECIMALS);
            const realSolReservesNum = bnToNumber(realSolReserves, SOL_DECIMALS);
            const migrationThresholdNum = bnToNumber(migrationThreshold, SOL_DECIMALS);
            const totalSupplyNum = bnToNumber(totalSupply, TOKEN_DECIMALS);
            const firstBuyerLockedNum = bnToNumber(firstBuyerLockedAmount, TOKEN_DECIMALS);

            const priceInSol = totalTokenReservesNum > 0 ? totalSolReservesNum / totalTokenReservesNum : 0;

            const SOL_TO_USD = await fetchSolPrice();
            const priceInUsd = priceInSol * SOL_TO_USD;

            const marketCap = priceInUsd * totalSupplyNum;

            const progress = migrationThresholdNum > 0
                ? (realSolReservesNum / migrationThresholdNum) * 100
                : 0;

            return {
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
                // First buyer lock info
                firstBuyer: curveData.firstBuyer ? curveData.firstBuyer.toString() : null,
                firstBuyerLockedAmount: firstBuyerLockedNum,
                firstBuyerLockActive: curveData.firstBuyerLockActive,
                holderThreshold: parseInt(curveData.holderThreshold.toString()),
                volumeThreshold: parseInt(curveData.volumeThreshold.toString()) / 100,
                currentHolderCount: parseInt(curveData.currentHolderCount.toString()),
                totalVolumeUsd: parseInt(curveData.totalVolumeUsd.toString()) / 100,
                unlockable: curveData.unlockable,
                lastHolderUpdate: parseInt(curveData.lastHolderUpdate.toString()),
                lastVolumeUpdate: parseInt(curveData.lastVolumeUpdate.toString()),
            };
        } catch (error) {
            console.error(`Error fetching bonding curve data for mint ${mint.toString()}:`, error);
            throw error;
        }
    }

    async function fetchSolPrice() {
        try {
            const price = await (
                await fetch(
                    'https://api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112',
                {
                  headers: {
                    'x-api-key': '60012c1b-4bd1-4e6f-a6a3-eb991ed23e95',
                  },
                }
              )
            ).json();
            return price['So11111111111111111111111111111111111111112'].usdPrice;
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
        batchUpdateData,
        checkUnlockConditions,
        unlockFirstBuyerTokens,
        getBondingCurveInfo,
        getPriceQuote,
        createMicroPool,
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
    try {
        // Ensure we're working with BN objects
        const amountInBN = BN.isBN(amountIn) ? amountIn : new BN(amountIn.toString());
        const reservesInBN = BN.isBN(reservesIn) ? reservesIn : new BN(reservesIn.toString());
        const reservesOutBN = BN.isBN(reservesOut) ? reservesOut : new BN(reservesOut.toString());

        // Validate inputs
        if (amountInBN.lte(new BN(0)) || reservesInBN.lte(new BN(0)) || reservesOutBN.lte(new BN(0))) {
            return 0;
        }

        // Calculate output amount
        const amountOut = isBuy
            ? calculateTokensOut(amountInBN, reservesInBN, reservesOutBN)
            : calculateSolOut(amountInBN, reservesInBN, reservesOutBN);

        if (amountOut.lte(new BN(0))) {
            return 0;
        }

        // Spot price = current reserves ratio
        const spotPrice = reservesInBN.mul(ONE_E9).div(reservesOutBN);
        
        // Effective price = actual price paid in this trade
        const effectivePrice = amountInBN.mul(ONE_E9).div(amountOut);

        // Price impact = (effectivePrice - spotPrice) / spotPrice * 100
        const priceDiff = effectivePrice.sub(spotPrice);
        const impact = priceDiff.mul(new BN(10000)).div(spotPrice);

        const impactPercent = Math.abs(parseFloat(impact.toString()) / 100);
        
        // Debug log (remove after testing)
        console.log('💰 Price Impact:', {
            input: amountInBN.toString(),
            output: amountOut.toString(), 
            spot: spotPrice.toString(),
            effective: effectivePrice.toString(),
            impact: impactPercent.toFixed(4) + '%'
        });

        return impactPercent;
    } catch (error) {
        console.error('Error calculating price impact:', error);
        return 0;
    }
}