import { 
    Connection, 
    PublicKey, 
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    clusterApiUrl
  } from '@solana/web3.js';
  import { 
    TOKEN_PROGRAM_ID,
    createCloseAccountInstruction,
    getAccount
  } from '@solana/spl-token';
  
  const RENT_PER_ACCOUNT = 0.00203928; // SOL per token account
  const FEE_PERCENTAGE = 0.20; // 20%
  const FEE_WALLET = new PublicKey('35Bk7MrW3c17QWioRuABBEMFwNk4NitXRFBvkzYAupfF'); // Replace with your wallet
  
  export class DetoxService {
    constructor(rpcUrl = clusterApiUrl('devnet')) {
      this.connection = new Connection(rpcUrl, 'confirmed');
    }
  
    /**
     * Scan wallet for empty token accounts
     */
    async scanWallet(walletAddress) {
      try {
        const publicKey = new PublicKey(walletAddress);
        
        const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID }
        );
  
        // Filter for empty accounts (balance = 0)
        const emptyAccounts = tokenAccounts.value.filter(account => {
          const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
          return amount === 0;
        });
  
        return {
          emptyAccounts: emptyAccounts.map(acc => ({
            address: acc.pubkey.toString(),
            mint: acc.account.data.parsed.info.mint,
            owner: acc.account.data.parsed.info.owner
          })),
          totalAccounts: emptyAccounts.length,
          recoverableSOL: emptyAccounts.length * RENT_PER_ACCOUNT,
          feeAmount: (emptyAccounts.length * RENT_PER_ACCOUNT) * FEE_PERCENTAGE,
          netRecovery: (emptyAccounts.length * RENT_PER_ACCOUNT) * (1 - FEE_PERCENTAGE)
        };
      } catch (error) {
        console.error('Error scanning wallet:', error);
        throw error;
      }
    }
  
    /**
     * Create detox transaction with fee
     */
    async createDetoxTransaction(emptyAccounts, userWallet, batchSize = 12) {
      const transactions = [];
      const userPublicKey = new PublicKey(userWallet);
  
      // Process accounts in batches
      for (let i = 0; i < emptyAccounts.length; i += batchSize) {
        const batch = emptyAccounts.slice(i, i + batchSize);
        const transaction = new Transaction();
  
        // Calculate fee for this batch
        const batchRentRecovered = batch.length * RENT_PER_ACCOUNT;
        const batchFee = batchRentRecovered * FEE_PERCENTAGE;
        const feeLamports = Math.floor(batchFee * LAMPORTS_PER_SOL);
  
        // Add fee transfer instruction FIRST
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: userPublicKey,
            toPubkey: FEE_WALLET,
            lamports: feeLamports
          })
        );
  
        // Add close account instructions
        for (const account of batch) {
          const closeInstruction = createCloseAccountInstruction(
            new PublicKey(account.address),  // account to close
            userPublicKey,                    // destination for recovered rent
            userPublicKey,                    // account owner
            []                                // no multisig
          );
          transaction.add(closeInstruction);
        }
  
        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = 
          await this.connection.getLatestBlockhash('finalized');
        
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = userPublicKey;
  
        transactions.push({
          transaction,
          lastValidBlockHeight,
          accountsClosed: batch.length,
          feeAmount: batchFee
        });
      }
  
      return transactions;
    }
  
    /**
     * Execute detox with fee collection
     */
    async executeDetox(emptyAccounts, userWallet, signTransaction, onProgress) {
      try {
        const transactions = await this.createDetoxTransaction(
          emptyAccounts, 
          userWallet
        );
  
        const results = [];
        let totalClosed = 0;
        let totalFees = 0;
  
        for (let i = 0; i < transactions.length; i++) {
          const { transaction, accountsClosed, feeAmount } = transactions[i];
  
          // Sign transaction
          const signed = await signTransaction(transaction);
  
          // Send transaction
          const signature = await this.connection.sendRawTransaction(
            signed.serialize(),
            {
              skipPreflight: false,
              preflightCommitment: 'confirmed'
            }
          );
  
          // Wait for confirmation
          const confirmation = await this.connection.confirmTransaction(
            signature,
            'confirmed'
          );
  
          totalClosed += accountsClosed;
          totalFees += feeAmount;
  
          results.push({
            signature,
            success: !confirmation.value.err,
            accountsClosed,
            feeAmount
          });
  
          // Progress callback
          if (onProgress) {
            onProgress({
              current: i + 1,
              total: transactions.length,
              accountsClosed: totalClosed,
              feesCollected: totalFees
            });
          }
        }
  
        return {
          success: true,
          results,
          totalClosed,
          totalFees,
          netRecovered: (totalClosed * RENT_PER_ACCOUNT) - totalFees
        };
      } catch (error) {
        console.error('Error executing detox:', error);
        throw error;
      }
    }
  }