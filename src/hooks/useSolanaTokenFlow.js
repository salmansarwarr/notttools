import {
    Connection,
    SystemProgram,
    Transaction,
    PublicKey,
    Keypair,
    SYSVAR_RENT_PUBKEY,
    clusterApiUrl,
    VersionedTransaction,
} from "@solana/web3.js";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountIdempotentInstruction,
    createInitializeMintInstruction,
    mintTo,
    TOKEN_2022_PROGRAM_ID,
    getMintLen,
    ExtensionType,
    createInitializeTransferFeeConfigInstruction,
    getAssociatedTokenAddress,
    withdrawWithheldTokensFromMint,
    createTransferCheckedWithTransferHookInstruction,
    TOKEN_PROGRAM_ID,
    getMint,
    getOrCreateAssociatedTokenAccount,
    createAssociatedTokenAccountIdempotent,
    createBurnInstruction,
    getAssociatedTokenAddressSync,
    createMintToInstruction,
    createSetAuthorityInstruction,
    AuthorityType,
} from "@solana/spl-token";
import {
    createV1,
    mplTokenMetadata,
    TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { createSignerFromKeypair, keypairIdentity } from "@metaplex-foundation/umi";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { BN } from "bn.js";
import lpLockIDL from './lp_escrow.json' with { type: 'json' };
import {
    DEVNET_PROGRAM_ID,
    getCpmmPdaAmmConfigId,
    Raydium,
    TxVersion,
} from "@raydium-io/raydium-sdk-v2";
import { useSolanaActions } from "./useSolanaActions";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";

// ======================================================
//  Constants
// ======================================================

const PLATFORM_AUTHORITY = new PublicKey("4ZqMvu1HaNPLbqvhwx1KXHFzqkhf2pB3pGPSt9HbyvQD");
const LP_LOCK_PROGRAM_ID = new PublicKey("GJBWK2HdEyyQaxNvbjw3TXWEXZXbNz6oYhNKUtj7SvBD");
const NOOT_MINT = new PublicKey("HuMqNCmUzNq5LHNKVbRFFBSwD7JkfC4ivPdBerNvQmwS");
const PLATFORM_NFT_MINT = new PublicKey("34iZhfLmwrtaYDhcZVxaiTctf253azhZLNc8eeMYETij");
const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

const decimals = 9;
const feeBasisPoints = 75;
const maxFeeNumber = 9 * Math.pow(10, decimals);
const maxFee = BigInt(maxFeeNumber);
const mintAmountNumber = 1_000_000 * Math.pow(10, decimals);
const mintAmount = BigInt(mintAmountNumber);
const tokensToSend = 1000;
const extensions = [ExtensionType.TransferFeeConfig];
const SLIPPAGE_BPS = 50;
const RPC_URL = clusterApiUrl("devnet");

function explorerUrl(tx) {
    return `https://explorer.solana.com/tx/${tx}?cluster=devnet`;
}

// ======================================================
//  Main Flow Hook
// ======================================================

export const useSolanaTokenFlow = () => {
    const { connection, publicKey, sendTx, signTransaction } = useSolanaActions();
    const wallet = useUnifiedWallet();

    const umi = createUmi(RPC_URL)
        .use(mplTokenMetadata())
        .use(mplToolbox())
        .use(walletAdapterIdentity(wallet))
    // --------------------------------------------------
    // Helper: Check if wallet holds platform NFT
    // --------------------------------------------------
    async function walletHoldsNFT(walletPublicKey, nftMintAddress) {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPublicKey, {
            programId: TOKEN_PROGRAM_ID,
        });

        for (const { account } of tokenAccounts.value) {
            const tokenInfo = account.data.parsed.info;
            if (tokenInfo.tokenAmount.amount === "1" && tokenInfo.tokenAmount.decimals === 0) {
                const mintAddress = new PublicKey(tokenInfo.mint);
                if (mintAddress.toBase58() === nftMintAddress.toBase58()) {
                    return true;
                }
            }
        }
        return false;
    }

    // --------------------------------------------------
    // 1. Create Mint with Transfer Fee Extension
    // --------------------------------------------------
    async function createMintAccount(mintKeypair) {
        const mint = mintKeypair.publicKey;
        const mintLen = getMintLen(extensions);
        const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

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
                publicKey, // transfer fee authority
                publicKey, // withdraw authority
                feeBasisPoints,
                maxFee,
                TOKEN_2022_PROGRAM_ID
            ),
            createInitializeMintInstruction(
                mint,
                decimals,
                publicKey, // mint authority
                null,
                TOKEN_2022_PROGRAM_ID
            )
        );

        const txid = await sendTx(tx, [mintKeypair]);
        console.log("🪙 Mint Created:", explorerUrl(txid));
        return { mint, txid };
    }

    // --------------------------------------------------
    // 2. Add Metadata
    // --------------------------------------------------
    async function uploadToPinata(formData) {
        const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
        const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY;
    
        try {
            // 1. Upload coin image to Pinata
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
    
            // 2. Create metadata JSON
            const metadata = {
                name: formData.coinName,
                symbol: formData.ticker,
                description: formData.description,
                image: imageUri,
                external_url: formData.website || "",
                attributes: [],
                properties: {
                    files: [
                        {
                            uri: imageUri,
                            type: formData.coinMedia.type,
                        }
                    ],
                    category: "image",
                    creators: []
                },
                social: {
                    twitter: formData.twitter || "",
                    telegram: formData.telegram || "",
                }
            };
    
            // 3. Upload metadata JSON to Pinata
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
        } catch (error) {
            console.error('Error uploading to Pinata:', error);
            throw error;
        }
    }

    async function addMetadata(mintKeypair, formData) {
        const tokenMetadata = await uploadToPinata(formData);

        const umiMintSigner = createSignerFromKeypair(umi, umi.eddsa.createKeypairFromSecretKey(mintKeypair.secretKey));

        const metadataTx = await createV1(umi, {
            mint: umiMintSigner,
            authority: umi.identity,        // wallet acts as authority
            payer: umi.identity,            // wallet pays fees
            updateAuthority: umi.identity,  // wallet remains update authority
            name: tokenMetadata.name,
            symbol: tokenMetadata.symbol,
            uri: tokenMetadata.uri,
            sellerFeeBasisPoints: feeBasisPoints,
            tokenStandard: TokenStandard.Fungible,
        }).sendAndConfirm(umi);

        const metadataSig = base58.deserialize(metadataTx.signature);
        console.log("🧾 Metadata Added:", explorerUrl(metadataSig[0]));
        return metadataSig[0];
    }

    // --------------------------------------------------
    // 3. Mint Tokens
    // --------------------------------------------------
    async function mintTokens(mint, mintAmount) {
        // 1️⃣ Get the associated token account for this user
        const ata = getAssociatedTokenAddressSync(
            mint,
            wallet.publicKey,
            false,
            TOKEN_2022_PROGRAM_ID
        );
    
        // 2️⃣ Create a transaction with all the steps
        const transaction = new Transaction().add(
            // Ensure ATA exists
            createAssociatedTokenAccountIdempotentInstruction(
                wallet.publicKey,
                ata,
                wallet.publicKey,
                mint,
                TOKEN_2022_PROGRAM_ID
            ),
    
            // Mint the desired amount
            createMintToInstruction(
                mint,
                ata,
                wallet.publicKey, // mint authority
                mintAmount,
                [],
                TOKEN_2022_PROGRAM_ID
            ),
    
            // 🔒 Revoke (remove) mint authority
            createSetAuthorityInstruction(
                mint,
                wallet.publicKey, // current mint authority
                AuthorityType.MintTokens,
                null, // new authority = none
                [],
                TOKEN_2022_PROGRAM_ID
            ),
        );
    
        // 3️⃣ Send and confirm via wallet
        const txid = await sendTx(transaction); 
        console.log("💰 Tokens Minted & 🔒 All Authorities Revoked:", txid);
        return { ata, txid };
    }

    // --------------------------------------------------
    // 4. Transfer Tokens (to Platform)
    // --------------------------------------------------
    async function transferTokens(mint, sourceAccount) {
        const destinationPublicKey = PLATFORM_AUTHORITY;
        const destinationAccount = await createAssociatedTokenAccountIdempotent(
            connection,
            publicKey, // payer
            mint,
            destinationPublicKey,
            {},
            TOKEN_2022_PROGRAM_ID
        );

        const transferAmount = BigInt(tokensToSend * 10 ** decimals);

        const transferInstruction = await createTransferCheckedWithTransferHookInstruction(
            connection,
            sourceAccount,
            mint,
            destinationAccount,
            publicKey, // authority
            transferAmount,
            decimals,
            [],
            "confirmed",
            TOKEN_2022_PROGRAM_ID
        );

        const tx = new Transaction().add(transferInstruction);
        const txid = await sendTx(tx);
        console.log("📤 Tokens Transferred:", explorerUrl(txid));
        return { destinationAccount, txid };
    }

    // --------------------------------------------------
    // 5. Collect Transfer Fees
    // --------------------------------------------------
    async function collectFees(mint) {
        const recipientTokenAccount = await getAssociatedTokenAddress(
            mint,
            publicKey, // recipient
            false,
            TOKEN_2022_PROGRAM_ID
        );

        const txid = await withdrawWithheldTokensFromMint(
            connection,
            publicKey, // payer
            mint,
            recipientTokenAccount,
            publicKey, // authority
            [],
            undefined,
            TOKEN_2022_PROGRAM_ID
        );

        console.log("💸 Creator Fees Withdrawn:", explorerUrl(txid));
        return txid;
    }

    // --------------------------------------------------
    // 6. Create Raydium Pool with Platform Fee Logic
    // --------------------------------------------------
    async function createRaydiumPoolWithFee(mint) {     
        const raydium = await Raydium.load({
            owner: publicKey,
            signAllTransactions: async (transactions) => {
                return wallet.signAllTransactions(transactions);
            },
            connection: connection,
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
                config.id = getCpmmPdaAmmConfigId(DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM, config.index).publicKey.toBase58();
            });
        }
    
        console.log(`Creating pool for ${mintA.symbol} - ${mintB.symbol}...`);
        
        // The issue might be in ownerInfo - try without useSOLBalance first
        const { execute, extInfo, transaction } = await raydium.cpmm.createPool({
            programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
            poolFeeAccount: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC,
            mintA,
            mintB,
            mintAAmount: new BN(50000 * 1e9),
            mintBAmount: new BN(0.05 * 1e9),
            startTime: new BN(Math.floor(Date.now() / 1000)),
            feeConfig: feeConfigs[0],
            ownerInfo: {
                useSOLBalance: true,
            },
            associatedOnly: false,
            txVersion: TxVersion.LEGACY,
            computeBudgetConfig: { 
                units: 400000, 
                microLamports: 100000 
            },
        });
    
        // Check if wallet holds platform NFT
        const hasNFT = await walletHoldsNFT(wallet.publicKey, PLATFORM_NFT_MINT);
    
        let platformFee = 0;
        if (!hasNFT) {
            const totalPoolValue = 0.05 * 1e9;
            platformFee = Math.floor(totalPoolValue * 0.05);
            const feeInstruction = SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: new PublicKey(PLATFORM_AUTHORITY),
                lamports: platformFee,
            });
            transaction.add(feeInstruction);
            console.log(`💸 Platform fee applied: ${platformFee / 1e9} SOL`);
        } else {
            console.log("🎟️ User holds platform NFT — skipping platform fee.");
        }
    
        const poolTx = await execute({ sendAndConfirm: true,  });
        console.log('✅ Pool created - txId:', poolTx.txId, 'lpMint:', extInfo.address.lpMint);
    
        return { txId: poolTx.txId, lpMint: extInfo.address.lpMint, platformFee };
    }

    // --------------------------------------------------
    // 7. Burn NOOT Tokens (Jupiter Swap + Burn)
    // --------------------------------------------------
    async function burnNootTokens(platformFee, solMint = 'So11111111111111111111111111111111111111112') {
        console.log('📊 Getting swap quote...');
        const quoteResponse = await fetch(
            `https://quote-api.jup.ag/v6/quote?inputMint=${solMint}&outputMint=${NOOT_MINT}&amount=${platformFee}&slippageBps=${SLIPPAGE_BPS}`
        );

        if (!quoteResponse.ok) {
            throw new Error(`Quote API error: ${quoteResponse.status}`);
        }

        const quote = await quoteResponse.json();

        const balance = await connection.getBalance(publicKey);
        const balanceInSol = balance / 1e9;
        const amountInSol = parseFloat(platformFee) / 1e9;
        const requiredBalance = amountInSol + 0.002;

        console.log(`Current SOL balance: ${balanceInSol} SOL`);

        if (balanceInSol < requiredBalance) {
            throw new Error(`Insufficient balance. Need at least ${requiredBalance} SOL, have ${balanceInSol} SOL`);
        }

        const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse: quote,
                userPublicKey: publicKey.toString(),
                wrapAndUnwrapSol: true,
            })
        });

        const { swapTransaction } = await swapResponse.json();

        console.log('🔐 Signing and sending swap transaction...');
        const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
        const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

        // Sign the transaction using the wallet adapter
        const signedTransaction = await signTransaction(transaction);
        const swapTxid = await connection.sendRawTransaction(signedTransaction.serialize(), {
            skipPreflight: false,
            maxRetries: 2
        });

        await connection.confirmTransaction(swapTxid, 'confirmed');
        console.log(`✅ Swap successful: ${explorerUrl(swapTxid)}`);

        console.log('⏳ Waiting for token account update...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const nootMint = new PublicKey(NOOT_MINT);
        const tokenAccount = await getAssociatedTokenAddress(
            nootMint,
            publicKey
        );

        const tokenBalance = await connection.getTokenAccountBalance(tokenAccount);
        const actualNootAmount = tokenBalance.value.amount;

        if (actualNootAmount === '0') {
            throw new Error('No NOOT tokens found to burn');
        }

        const burnInstruction = createBurnInstruction(
            tokenAccount,
            nootMint,
            publicKey,
            BigInt(actualNootAmount),
            [],
            TOKEN_2022_PROGRAM_ID
        );

        const burnTransaction = new Transaction().add(burnInstruction);
        const burnTxid = await sendTx(burnTransaction);

        console.log(`🔥 Burn successful: ${explorerUrl(burnTxid)}`);
        console.log(`💰 Burned ${parseFloat(actualNootAmount) / 1e6} NOOT tokens`);
        return burnTxid;
    }

    // --------------------------------------------------
    // 8. Initialize LP Lock
    // --------------------------------------------------
    async function initializeLPLock(lpMint) {
        const provider = new AnchorProvider(connection, { publicKey, signTransaction: async tx => tx }, {});
        const lpLockProgram = new Program(lpLockIDL, provider);

        const [lockInfo] = PublicKey.findProgramAddressSync(
            [Buffer.from("lock"), lpMint.toBuffer()],
            LP_LOCK_PROGRAM_ID
        );
        const [lockVault] = PublicKey.findProgramAddressSync(
            [Buffer.from("lock_vault"), lpMint.toBuffer()],
            LP_LOCK_PROGRAM_ID
        );

        const mintInfo = await getMint(connection, lpMint);
        const tokenProgramId = mintInfo.tlvData.length > 0 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

        const fromTokenAccount = await getAssociatedTokenAddress(
            lpMint,
            publicKey,
            false,
            tokenProgramId,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const lpTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            publicKey,
            lpMint,
            publicKey,
            false,
            'confirmed',
            undefined,
            tokenProgramId
        );

        const lockAmount = new BN(lpTokenAccount.amount.toString())
            .mul(new BN(60))
            .div(new BN(100));

        const userAtaIx = createAssociatedTokenAccountIdempotentInstruction(
            publicKey,
            fromTokenAccount,
            publicKey,
            lpMint,
            tokenProgramId,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const ixInitialize = await lpLockProgram.methods
            .initializeLock(
                lpMint,
                lockAmount,
                new BN(300), // holder_threshold
                new BN(25000), // volume_threshold_usd
                PLATFORM_AUTHORITY // oracle_authority
            )
            .accounts({
                lockInfo,
                authority: publicKey,
                fromTokenAccount,
                tokenMint: lpMint,
                lockTokenAccount: lockVault,
                tokenProgram: tokenProgramId,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .instruction();

        console.log(`🔒 Locking ${lockAmount.toString()} LP tokens (60% of balance)`);
        console.log(`📊 Conditions: 300+ holders, $25,000+ volume`);
        console.log(`🔑 Oracle authority (platform): ${PLATFORM_AUTHORITY.toString()}`);

        const tx = new Transaction().add(userAtaIx, ixInitialize);
        const txid = await sendTx(tx);

        console.log("🔒 LP Tokens Locked:", explorerUrl(txid));
        console.log(`Lock Info Address: ${lockInfo.toString()}`);
        console.log(`Lock Vault Address: ${lockVault.toString()}`);

        return { txid, lockInfo, lockVault };
    }

    // --------------------------------------------------
    // Return all actions
    // --------------------------------------------------
    return {
        createMintAccount,
        addMetadata,
        mintTokens,
        transferTokens,
        collectFees,
        createRaydiumPoolWithFee,
        burnNootTokens,
        initializeLPLock,
        walletHoldsNFT,
    };
};