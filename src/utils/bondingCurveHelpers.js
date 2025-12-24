import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Helper functions for interacting with the bonding curve program
 */

/**
 * Get bonding curve PDA
 */
export function getBondingCurvePDA(programId, tokenMint) {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding_curve'), tokenMint.toBuffer()],
    programId
  );
  return { pda, bump };
}

/**
 * Get token vault PDA
 */
export function getTokenVaultPDA(programId, tokenMint) {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_vault'), tokenMint.toBuffer()],
    programId
  );
  return { pda, bump };
}

/**
 * Get first buyer lock vault PDA
 */
export function getFirstBuyerLockVaultPDA(programId, tokenMint) {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('first_buyer_lock_vault'), tokenMint.toBuffer()],
    programId
  );
  return { pda, bump };
}

/**
 * Get SOL vault PDA
 */
export function getSolVaultPDA(programId, tokenMint) {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('sol_vault'), tokenMint.toBuffer()],
    programId
  );
  return { pda, bump };
}

/**
 * Fetch bonding curve data
 */
export async function fetchBondingCurve(connection, programId, tokenMint) {
  const { pda } = getBondingCurvePDA(programId, tokenMint);
  
  try {
    const accountInfo = await connection.getAccountInfo(pda);
    if (!accountInfo) {
      throw new Error('Bonding curve account not found');
    }

    return parseBondingCurveAccount(accountInfo.data);
  } catch (error) {
    console.error('Error fetching bonding curve:', error);
    throw error;
  }
}

/**
 * Parse bonding curve account (matches your Rust struct)
 */
export function parseBondingCurveAccount(data) {
  let offset = 8; // Skip discriminator

  const readU64 = () => {
    const value = data.readBigUInt64LE(offset);
    offset += 8;
    return Number(value);
  };

  const readPubkey = () => {
    const pubkey = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    return pubkey;
  };

  const readBool = () => {
    const value = data[offset] !== 0;
    offset += 1;
    return value;
  };

  const readOptionPubkey = () => {
    const hasValue = data[offset] !== 0;
    offset += 1;
    if (hasValue) {
      return readPubkey();
    }
    return null;
  };

  const readI64 = () => {
    const value = data.readBigInt64LE(offset);
    offset += 8;
    return Number(value);
  };

  const readU8 = () => {
    const value = data[offset];
    offset += 1;
    return value;
  };

  return {
    tokenMint: readPubkey(),
    creator: readPubkey(),
    virtualTokenReserves: readU64(),
    virtualSolReserves: readU64(),
    realTokenReserves: readU64(),
    realSolReserves: readU64(),
    totalSupply: readU64(),
    migrationThreshold: readU64(),
    isMigrated: readBool(),
    migrationSol: readU64(),
    migrationTokens: readU64(),
    firstBuyer: readOptionPubkey(),
    firstBuyerLockedAmount: readU64(),
    firstBuyerLockActive: readBool(),
    holderThreshold: readU64(),
    volumeThreshold: readU64(),
    currentHolderCount: readU64(),
    totalVolumeUsd: readU64(),
    lastHolderUpdate: readI64(),
    lastVolumeUpdate: readI64(),
    unlockable: readBool(),
    oracleAuthority: readPubkey(),
    tokenVaultBump: readU8(),
    solVaultBump: readU8(),
    bump: readU8(),
  };
}

/**
 * Calculate current token price
 */
export function calculateTokenPrice(bondingCurve) {
  const totalSol = bondingCurve.virtualSolReserves + bondingCurve.realSolReserves;
  const totalTokens = bondingCurve.virtualTokenReserves + bondingCurve.realTokenReserves;

  if (totalTokens === 0) return 0;

  // Price in SOL per token
  return totalSol / totalTokens / 1e9; // Adjust for 9 decimals
}

/**
 * Calculate tokens out for a given SOL amount (for buy)
 */
export function calculateTokensOut(solIn, bondingCurve) {
  const solReserves = bondingCurve.virtualSolReserves + bondingCurve.realSolReserves;
  const tokenReserves = bondingCurve.virtualTokenReserves + bondingCurve.realTokenReserves;

  const k = BigInt(solReserves) * BigInt(tokenReserves);
  const newSolReserves = BigInt(solReserves) + BigInt(solIn);
  const newTokenReserves = k / newSolReserves;
  const tokensOut = BigInt(tokenReserves) - newTokenReserves;

  return Number(tokensOut);
}

/**
 * Calculate SOL out for a given token amount (for sell)
 */
export function calculateSolOut(tokensIn, bondingCurve) {
  const solReserves = bondingCurve.virtualSolReserves + bondingCurve.realSolReserves;
  const tokenReserves = bondingCurve.virtualTokenReserves + bondingCurve.realTokenReserves;

  const k = BigInt(tokenReserves) * BigInt(solReserves);
  const newTokenReserves = BigInt(tokenReserves) + BigInt(tokensIn);
  const newSolReserves = k / newTokenReserves;
  const solOut = BigInt(solReserves) - newSolReserves;

  return Number(solOut);
}

/**
 * Get market cap in SOL
 */
export function getMarketCap(bondingCurve) {
  const price = calculateTokenPrice(bondingCurve);
  const circulatingSupply = bondingCurve.totalSupply - bondingCurve.realTokenReserves;
  return (price * circulatingSupply) / 1e9;
}

/**
 * Get trading statistics
 */
export async function getTradingStats(connection, programId, tokenMint) {
  const bondingCurve = await fetchBondingCurve(connection, programId, tokenMint);
  
  const currentPrice = calculateTokenPrice(bondingCurve);
  const marketCap = getMarketCap(bondingCurve);
  const totalLiquidity = bondingCurve.realSolReserves / 1e9;
  const circulatingSupply = bondingCurve.totalSupply - bondingCurve.realTokenReserves;
  
  return {
    currentPrice,
    marketCap,
    totalLiquidity,
    circulatingSupply,
    totalSupply: bondingCurve.totalSupply,
    isMigrated: bondingCurve.isMigrated,
    migrationProgress: (bondingCurve.realSolReserves / bondingCurve.migrationThreshold) * 100,
    firstBuyerLockActive: bondingCurve.firstBuyerLockActive,
    holderCount: bondingCurve.currentHolderCount,
    totalVolume: bondingCurve.totalVolumeUsd / 100, // Convert from cents to dollars
  };
}

/**
 * Subscribe to bonding curve changes
 */
export function subscribeToBondingCurve(connection, programId, tokenMint, callback) {
  const { pda } = getBondingCurvePDA(programId, tokenMint);

  const subscriptionId = connection.onAccountChange(
    pda,
    (accountInfo) => {
      const bondingCurve = parseBondingCurveAccount(accountInfo.data);
      callback(bondingCurve);
    },
    'confirmed'
  );

  return () => {
    connection.removeAccountChangeListener(subscriptionId);
  };
}

/**
 * Format price for display
 */
export function formatPrice(price) {
  if (price === 0) return '0.000000';
  if (price < 0.000001) return price.toExponential(2);
  if (price < 0.01) return price.toFixed(8);
  if (price < 1) return price.toFixed(6);
  return price.toFixed(4);
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format SOL amount
 */
export function formatSol(lamports) {
  return (lamports / 1e9).toFixed(4);
}