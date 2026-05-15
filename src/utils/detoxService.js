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
    createBurnInstruction,
    getAccount
  } from '@solana/spl-token';
  import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
  
  const RENT_PER_ACCOUNT = 0.00203928; // SOL per token account
  const FEE_PERCENTAGE = 0.20; // 20%
  const FEE_WALLET = new PublicKey('9CgjeM8CfEXXBVMvTfPjbB2iLPNHFCVGgdYRZw9FdjRk'); 
  
  export class DetoxService {
    constructor(rpcUrl = import.meta.env.VITE_RPC_URL) {
      this.connection = new Connection(rpcUrl, 'confirmed');
    }
  
    /**
     * Scan wallet for token accounts
     */
    async scanWallet(walletAddress) {
      try {
        const publicKey = new PublicKey(walletAddress);
        
        const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID }
        );
  
        const accounts = await Promise.all(tokenAccounts.value.map(async (acc) => {
          const info = acc.account.data.parsed.info;
          const amount = info.tokenAmount.uiAmount;
          const decimals = info.tokenAmount.decimals;
          const mint = info.mint;
          
          let name = 'Unknown Token';
          let symbol = '???';
          let image = null;

          try {
            const metadataPDA = PublicKey.findProgramAddressSync(
              [
                Buffer.from("metadata"),
                new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
                new PublicKey(mint).toBuffer(),
              ],
              new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
            )[0];

            const metadataAccount = await this.connection.getAccountInfo(metadataPDA);
            if (metadataAccount) {
                // Simplified metadata parsing or just keep it as unknown for now to avoid complexity
                // If we want real metadata, we'd need to decode it.
                // For now, let's just identify common ones or leave as is.
            }
          } catch (e) {
            // Ignore metadata fetch errors
          }

          return {
            address: acc.pubkey.toString(),
            mint: mint,
            amount: amount,
            decimals: decimals,
            isNFT: decimals === 0 && amount === 1,
            isEmpty: amount === 0,
            name: name,
            symbol: symbol
          };
        }));
  
        return {
          accounts: accounts,
          totalAccounts: accounts.length,
          emptyAccounts: accounts.filter(a => a.isEmpty),
          tokenAccounts: accounts.filter(a => !a.isEmpty),
          recoverableSOL: accounts.length * RENT_PER_ACCOUNT,
        };
      } catch (error) {
        console.error('Error scanning wallet:', error);
        throw error;
      }
    }
  
    /**
     * Create detox transaction with fee
     */
    async createDetoxTransaction(selectedAccounts, userWallet, batchSize = 10) {
      const transactions = [];
      const userPublicKey = new PublicKey(userWallet);
  
      // Process accounts in batches
      for (let i = 0; i < selectedAccounts.length; i += batchSize) {
        const batch = selectedAccounts.slice(i, i + batchSize);
        const transaction = new Transaction();
  
        // Calculate total rent recovered for this batch
        const batchRentRecovered = batch.length * RENT_PER_ACCOUNT;
        const batchFee = batchRentRecovered * FEE_PERCENTAGE;
        const feeLamports = Math.floor(batchFee * LAMPORTS_PER_SOL);
  
        // Add fee transfer instruction
        if (feeLamports > 0) {
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: userPublicKey,
              toPubkey: FEE_WALLET,
              lamports: feeLamports
            })
          );
        }
  
        // Add burn and close account instructions
        for (const account of batch) {
          // If not empty, burn tokens first
          if (account.amount > 0) {
            const burnInstruction = createBurnInstruction(
              new PublicKey(account.address),
              new PublicKey(account.mint),
              userPublicKey,
              account.amount * Math.pow(10, account.decimals)
            );
            transaction.add(burnInstruction);
          }

          // Close account instruction
          const closeInstruction = createCloseAccountInstruction(
            new PublicKey(account.address),  // account to close
            userPublicKey,                    // destination for recovered rent
            userPublicKey,                    // account owner
            []                                // no multisig
          );
          transaction.add(closeInstruction);
        }
  
        // Get recent blockhash
        const { blockhash } = await this.connection.getLatestBlockhash('finalized');
        
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = userPublicKey;
  
        transactions.push({
          transaction,
          accountsClosed: batch.length,
          feeAmount: batchFee
        });
      }
  
      return transactions;
    }
  
    /**
     * Execute detox
     */
    async executeDetox(selectedAccounts, userWallet, signTransaction, onProgress) {
      try {
        const transactions = await this.createDetoxTransaction(
          selectedAccounts, 
          userWallet
        );
  
        const results = [];
        let totalClosed = 0;
        let totalFees = 0;
  
        for (let i = 0; i < transactions.length; i++) {
          const { transaction, accountsClosed, feeAmount } = transactions[i];
          const signed = await signTransaction(transaction);
          
          const signature = await this.connection.sendRawTransaction(
            signed.serialize(),
            { skipPreflight: false, preflightCommitment: 'confirmed' }
          );
  
          const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
  
          totalClosed += accountsClosed;
          totalFees += feeAmount;
  
          results.push({
            signature,
            success: !confirmation.value.err,
            accountsClosed,
            feeAmount
          });
  
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