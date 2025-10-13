import {
    sendAndConfirmTransaction,
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    clusterApiUrl,
    SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountIdempotentInstruction,
    ExtensionType,
    createInitializeMintInstruction,
    mintTo,
    getMintLen,
    TOKEN_2022_PROGRAM_ID,
    createInitializeTransferFeeConfigInstruction,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountIdempotent,
    getOrCreateAssociatedTokenAccount,
    getMint,
    createTransferCheckedWithTransferHookInstruction,
    TOKEN_PROGRAM_ID,
    withdrawWithheldTokensFromMint,
    createBurnInstruction,
} from "@solana/spl-token";
import {
    createV1,
    mplTokenMetadata,
    TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import {
    keypairIdentity,
    createSignerFromKeypair,
} from "@metaplex-foundation/umi";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import lpLockIDL from './lp_escrow.json' with { type: 'json' };
import { DEVNET_PROGRAM_ID, getCpmmPdaAmmConfigId, Raydium, TxVersion } from "@raydium-io/raydium-sdk-v2";
import { BN } from "bn.js";

// ---------- Constants ----------
const tokenMetadata = {
    name: "Solana Gold",
    symbol: "GOLDSOL",
    uri: "https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/spl-token.json",
};

const LP_LOCK_PROGRAM_ID = new PublicKey("GJBWK2HdEyyQaxNvbjw3TXWEXZXbNz6oYhNKUtj7SvBD");
const FEE_COLLECTION_WALLET = new PublicKey("4ZqMvu1HaNPLbqvhwx1KXHFzqkhf2pB3pGPSt9HbyvQD");
const NOOT_MINT = 'HuMqNCmUzNq5LHNKVbRFFBSwD7JkfC4ivPdBerNvQmwS';
const SLIPPAGE_BPS = '50'; // 0.5% slippage
const decimals = 9;
const feeBasisPoints = 75; // 0.75%
const maxFeeNumber = 9 * Math.pow(10, decimals);
const maxFee = BigInt(maxFeeNumber);
const mintAmountNumber = 1_000_000 * Math.pow(10, decimals);
const mintAmount = BigInt(mintAmountNumber);
const tokensToSend = 1000;
const extensions = [ExtensionType.TransferFeeConfig];

// ---------- Global Setup ----------
// NOTE: we create a single keypair from secret key but expose it as two distinct variables
// so you can replace `platformAuthority` with a different keypair later (production).
export const userPayer = Keypair.fromSecretKey(
    new Uint8Array([
        165, 140, 110, 135, 189, 77, 45, 72, 156, 236, 215, 224, 203, 0, 144,
        136, 51, 134, 111, 132, 82, 4, 31, 190, 201, 254, 20, 58, 149, 157, 73,
        61, 30, 201, 216, 51, 246, 50, 109, 160, 47, 64, 192, 210, 6, 135, 201,
        187, 110, 23, 123, 189, 68, 187, 195, 78, 54, 130, 169, 97, 111, 197,
        79, 22,
    ])
);

// For now use same keypair for platform authority — replace with a different Keypair in prod.
export const platformAuthority = userPayer; // <-- change in prod to a dedicated platform keypair

const mintAuthority = userPayer; // who mints tokens (still the user here)
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const umi = createUmi("https://api.devnet.solana.com")
    .use(mplTokenMetadata())
    .use(mplToolbox());

// Make umi use the userPayer identity (previously you used 'payer' inline).
umi.use(keypairIdentity(umi.eddsa.createKeypairFromSecretKey(userPayer.secretKey)));

function generateExplorerTxUrl(txId) {
    return `https://explorer.solana.com/tx/${txId}?cluster=devnet`;
}

// ---------- Step Functions ----------
const createMintAccount = async (mintKeypair) => {
    const mint = mintKeypair.publicKey;
    const mintLen = getMintLen(extensions);
    const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen);
    const mintTx = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: userPayer.publicKey, // fee payer is the user
            newAccountPubkey: mint,
            space: mintLen,
            lamports: mintLamports,
            programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeTransferFeeConfigInstruction(
            mint,
            userPayer.publicKey, // fee recipient (keeps original semantics)
            userPayer.publicKey,
            feeBasisPoints,
            maxFee,
            TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
            mint,
            decimals,
            userPayer.publicKey, // mint authority remains user's pubkey
            null,
            TOKEN_2022_PROGRAM_ID
        )
    );

    const newTokenTx = await sendAndConfirmTransaction(
        connection,
        mintTx,
        [userPayer, mintKeypair], // signers: user pays fees
        { commitment: "confirmed" }
    );
    console.log("New Token Created:", generateExplorerTxUrl(newTokenTx));
    console.log(`Mint Address: ${mint.toString()}`);
    return { mint, newTokenTx };
};

const addMetadata = async (mintKeypair, mint) => {
    const umiMintSigner = createSignerFromKeypair(umi, umi.eddsa.createKeypairFromSecretKey(mintKeypair.secretKey));
    const metadataTx = await createV1(umi, {
        mint: umiMintSigner,
        authority: umi.identity,
        payer: umi.identity,
        updateAuthority: umi.identity,
        name: tokenMetadata.name,
        symbol: tokenMetadata.symbol,
        uri: tokenMetadata.uri,
        sellerFeeBasisPoints: feeBasisPoints,
        tokenStandard: TokenStandard.Fungible,
    }).sendAndConfirm(umi);

    const metadataSig = base58.deserialize(metadataTx.signature);
    console.log("Metadata Added:", generateExplorerTxUrl(metadataSig[0]));
    return metadataSig[0];
};

const mintTokens = async (mint) => {
    const sourceAccount = await createAssociatedTokenAccountIdempotent(
        connection,
        userPayer,            // payer creating ATA
        mint,
        userPayer.publicKey,  // owner of ATA
        {},
        TOKEN_2022_PROGRAM_ID
    );

    const mintSig = await mintTo(
        connection,
        userPayer, // payer signs mint
        mint,
        sourceAccount,
        mintAuthority,
        mintAmount,
        [],
        undefined,
        TOKEN_2022_PROGRAM_ID
    );
    console.log("Tokens Minted:", generateExplorerTxUrl(mintSig));
    return { sourceAccount, mintSig };
};

const transferTokens = async (mint, sourceAccount) => {
    const destinationPublicKey = new PublicKey("4ZqMvu1HaNPLbqvhwx1KXHFzqkhf2pB3pGPSt9HbyvQD");
    const destinationAccount = await createAssociatedTokenAccountIdempotent(
        connection,
        userPayer, // user pays for creating destination ATA
        mint,
        destinationPublicKey,
        {},
        TOKEN_2022_PROGRAM_ID
    );
    console.log("Destination Account:", destinationAccount.toString());

    const transferAmount = BigInt(tokensToSend * 10 ** decimals);
    const basisPointFee = (transferAmount * BigInt(feeBasisPoints)) / BigInt(10_000);
    const fee = basisPointFee > maxFee ? maxFee : basisPointFee;

    const transferInstruction = await createTransferCheckedWithTransferHookInstruction(
        connection,
        sourceAccount,
        mint,
        destinationAccount,
        userPayer.publicKey, // authority authorizing the transfer (user)
        transferAmount,
        decimals,
        [],
        "confirmed",
        TOKEN_2022_PROGRAM_ID
    );

    const transferTx = new Transaction().add(transferInstruction);
    const transferSig = await sendAndConfirmTransaction(
        connection,
        transferTx,
        [userPayer], // user signs the transfer
        { commitment: "confirmed" }
    );
    console.log("Tokens Transferred:", generateExplorerTxUrl(transferSig));
    return { destinationAccount, transferSig };
};

const collectFees = async (mint) => {
    const recipientTokenAccount = await getAssociatedTokenAddress(
        mint,
        userPayer.publicKey, // fees withdrawn to the user's ATA
        false,
        TOKEN_2022_PROGRAM_ID
    );

    const withdrawSig = await withdrawWithheldTokensFromMint(
        connection,
        userPayer, // user pays and signs to withdraw withheld tokens
        mint,
        recipientTokenAccount,
        userPayer,
        [],
        undefined,
        TOKEN_2022_PROGRAM_ID
    );
    console.log("Creator Fees Withdrawn (0.25%):", generateExplorerTxUrl(withdrawSig));
    return withdrawSig;
};

async function walletHoldsNFT(connection, walletPublicKey, nftMintAddress) {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPublicKey, {
        programId: TOKEN_PROGRAM_ID,
    });

    for (const { account } of tokenAccounts.value) {
        const tokenInfo = account.data.parsed.info;
        if (tokenInfo.tokenAmount.amount === "1" && tokenInfo.tokenAmount.decimals === 0) {
            const mintAddress = new PublicKey(tokenInfo.mint);
            if (mintAddress.toBase58() === nftMintAddress.toBase58()) {
                return true; // ✅ wallet holds this NFT
            }
        }
    }

    return false;
}

const createRaydiumPoolWithFee = async (mint) => {
    const raydium = await Raydium.load({
        owner: userPayer,
        connection: connection,
        cluster: 'devnet',
        disableFeatureCheck: true,
        disableLoadToken: false,
        blockhashCommitment: 'finalized',
    });

    const solMint = new PublicKey('So11111111111111111111111111111111111111112');
    const mintA = await raydium.token.getTokenInfo(mint);
    const mintB = await raydium.token.getTokenInfo(solMint);

    const feeConfigs = await raydium.api.getCpmmConfigs();
    if (raydium.cluster === 'devnet') {
        feeConfigs.forEach((config) => {
            config.id = getCpmmPdaAmmConfigId(DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM, config.index).publicKey.toBase58();
        });
    }

    console.log(`Creating pool for ${mintA.symbol} - ${mintB.symbol}...`);
    const { execute, extInfo, transaction } = await raydium.cpmm.createPool({
        programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
        poolFeeAccount: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC,
        mintA,
        mintB,
        mintAAmount: new BN(50000 * 1e9),
        mintBAmount: new BN(0.05 * 1e9),
        startTime: new BN(Math.floor(Date.now() / 1000)),
        feeConfig: feeConfigs[0],
        ownerInfo: { useSOLBalance: true },
        associatedOnly: false,
        txVersion: TxVersion.LEGACY,
        computeBudgetConfig: { units: 400000, microLamports: 100000 },
    });

    // 🧠 Check if wallet holds platform NFT
    const PLATFORM_NFT_MINT = new PublicKey("34iZhfLmwrtaYDhcZVxaiTctf253azhZLNc8eeMYETij");
    const hasNFT = await walletHoldsNFT(connection, userPayer.publicKey, PLATFORM_NFT_MINT);

    if (hasNFT) {
        console.log("🎟️ User holds platform NFT — skipping platform fee.");
    } else {
        const totalPoolValue = 0.05 * 1e9; // 0.05 SOL example
        const platformFee = Math.floor(totalPoolValue * 0.05); // 5%
        const feeInstruction = SystemProgram.transfer({
            fromPubkey: userPayer.publicKey,
            toPubkey: FEE_COLLECTION_WALLET,
            lamports: platformFee,
        });
        transaction.add(feeInstruction);
        console.log(`💸 Platform fee applied: ${platformFee / 1e9} SOL`);
    }

    const poolTx = await execute({ sendAndConfirm: true });
    console.log('✅ Pool created - txId:', poolTx.txId, 'lpMint:', extInfo.address.lpMint);

    return { txId: poolTx.txId, lpMint: extInfo.address.lpMint };
};


const burnNootTokens = async (platformFee, solMint) => {
    console.log('📊 Getting swap quote...');
    console.log(`https://quote-api.jup.ag/v6/quote?inputMint=${solMint}&outputMint=${NOOT_MINT}&amount=${platformFee}&slippageBps=${SLIPPAGE_BPS}`);
    const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${solMint}&outputMint=${NOOT_MINT}&amount=${platformFee}&slippageBps=${SLIPPAGE_BPS}`
    );

    if (!quoteResponse.ok) {
        throw new Error(`Quote API error: ${quoteResponse.status}`);
    }

    const quote = await quoteResponse.json();

    const balance = await connection.getBalance(userPayer.publicKey);
    const balanceInSol = balance / 1e9;
    const amountInSol = parseFloat(platformFee) / 1e9;
    const requiredBalance = amountInSol + 0.002; // Increased buffer for swap + burn fees

    console.log(`Current SOL balance: ${balanceInSol} SOL`);

    if (balanceInSol < requiredBalance) {
        throw new Error(`Insufficient balance. Need at least ${requiredBalance} SOL, have ${balanceInSol} SOL`);
    }

    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: userPayer.publicKey.toString(),
            wrapAndUnwrapSol: true,
        })
    });

    const { swapTransaction } = await swapResponse.json();

    console.log('🔐 Signing and sending swap transaction...');
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    transaction.sign([userPayer]); // user signs the swap

    const swapTxid = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        maxRetries: 2
    });

    await connection.confirmTransaction(swapTxid, 'confirmed');
    console.log(`✅ Swap successful: https://solscan.io/tx/${swapTxid}`);

    console.log('⏳ Waiting for token account update...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const nootMint = new PublicKey(NOOT_MINT);
    const tokenAccount = await getAssociatedTokenAddress(
        nootMint,
        userPayer.publicKey
    );

    const tokenBalance = await connection.getTokenAccountBalance(tokenAccount);
    const actualNootAmount = tokenBalance.value.amount;

    if (actualNootAmount === '0') {
        throw new Error('No NOOT tokens found to burn');
    }

    const burnInstruction = createBurnInstruction(
        tokenAccount,
        nootMint,
        userPayer.publicKey,
        BigInt(actualNootAmount),
        [],
        TOKEN_2022_PROGRAM_ID
    );
    const burnTransaction = new Transaction().add(burnInstruction);
    const { blockhash } = await connection.getLatestBlockhash();
    burnTransaction.recentBlockhash = blockhash;
    burnTransaction.feePayer = userPayer.publicKey;
    burnTransaction.sign(userPayer);

    const burnTxid = await connection.sendRawTransaction(burnTransaction.serialize(), {
        skipPreflight: false,
        maxRetries: 2
    });

    await connection.confirmTransaction(burnTxid, 'confirmed');
    console.log(`🔥 Burn successful: https://solscan.io/tx/${burnTxid}`);
    console.log(`💰 Burned ${parseFloat(actualNootAmount) / 1e6} NOOT tokens`);
    return burnTxid;
};

const initializeLPLock = async (lpMint) => {
    const provider = new AnchorProvider(connection, userPayer, {});
    const lpLockProgram = new Program(lpLockIDL, provider);

    const [lockInfo] = PublicKey.findProgramAddressSync(
        [Buffer.from("lock"), lpMint.toBuffer()],
        LP_LOCK_PROGRAM_ID
    );
    const [lockVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("lock_vault"), lpMint.toBuffer()],
        LP_LOCK_PROGRAM_ID
    );

    // Get mint info to determine correct token program
    const mintInfo = await getMint(connection, lpMint);
    const tokenProgramId = mintInfo.tlvData.length > 0 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

    const fromTokenAccount = await getAssociatedTokenAddress(
        lpMint,
        userPayer.publicKey,
        false,
        tokenProgramId,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Get current LP token balance
    const lpTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        userPayer, // user pays for ATA creation if needed
        lpMint,
        userPayer.publicKey,
        false,
        'confirmed',
        undefined,
        tokenProgramId
    );

    // Lock 60% of LP tokens
    const lockAmount = new BN(lpTokenAccount.amount.toString())
        .mul(new BN(60))
        .div(new BN(100));

    // Create ATA instruction if needed
    const userAtaIx = createAssociatedTokenAccountIdempotentInstruction(
        userPayer.publicKey,
        fromTokenAccount,
        userPayer.publicKey,
        lpMint,
        tokenProgramId,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Initialize lock instruction - pass platformAuthority.publicKey as oracle_authority
    const ixInitialize = await lpLockProgram.methods
        .initializeLock(
            lpMint,                    // token_mint
            lockAmount,               // lock_amount  
            new BN(100),             // holder_threshold (100 holders)
            new BN(100_000_00),      // volume_threshold_usd (in cents: $100,000)
            platformAuthority.publicKey  // oracle_authority (platform wallet)
        )
        .accounts({
            lockInfo,
            authority: userPayer.publicKey, // who calls the initialize (user)
            fromTokenAccount,
            tokenMint: lpMint,
            lockTokenAccount: lockVault, // This will be created by the program
            tokenProgram: tokenProgramId,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction();

    console.log(`🔒 Locking ${lockAmount.toString()} LP tokens (60% of balance)`);
    console.log(`📊 Conditions: 100+ holders, $100,000+ volume`);
    console.log(`🔑 Oracle authority (platform): ${platformAuthority.publicKey.toString()}`);

    // Send transaction
    const lpTx = new Transaction().add(userAtaIx, ixInitialize);
    const lockSig = await sendAndConfirmTransaction(
        connection,
        lpTx,
        [userPayer],
        { commitment: "confirmed", skipPreflight: true }
    );

    console.log("LP Tokens Locked:", generateExplorerTxUrl(lockSig));
    console.log(`Lock Info Address: ${lockInfo.toString()}`);
    console.log(`Lock Vault Address: ${lockVault.toString()}`);
    
    return { lockSig, lockInfo, lockVault };
};

// ---------- Main ----------
(async () => {
    try {
        const mintKeypair = Keypair.generate();
        const { mint, newTokenTx } = await createMintAccount(mintKeypair);
        await addMetadata(mintKeypair, mint);
        const { sourceAccount, mintSig } = await mintTokens(mint);
        const { destinationAccount, transferSig } = await transferTokens(mint, sourceAccount);
        await collectFees(mint);
        const { lpMint, platformFee } = await createRaydiumPoolWithFee(mint);
        // await burnNootTokens(platformFee, 'So11111111111111111111111111111111111111112'); // pass platformFee and solMint
        await initializeLPLock(lpMint);

        console.log("\n=== Token Creation and Pool Setup Complete ===");
        console.log(`Your token mint address: ${mint.toString()}`);
    } catch (error) {
        console.error("Error occurred:", error);
        if (error.logs) {
            console.error("Program logs:", error.logs);
        }
        if (error.transactionLogs) {
            console.error("Transaction logs:", error.transactionLogs);
        }
    }
})();
