import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let connection;
  
  try {
    const dbConfig = {
      host: 'localhost',
      database: 'noottools-panel',
      user: 'noottools-panel',
      password: 'noottools-12345-2025',
    };

    connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(
      'SELECT * FROM nft_config WHERE id = 1'
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }
    
    const config = rows[0];
    
    res.status(200).json({
      success: true,
      config: {
        minting_fee_sol: parseFloat(config.minting_fee_sol),
        minting_fee_lamports: parseInt(config.minting_fee_lamports),
        max_nfts_per_wallet: parseInt(config.max_nfts_per_wallet),
        staking_duration_months: parseInt(config.staking_duration_months),
        collection_mint: config.collection_mint,
        admin_wallet: config.admin_wallet,
        program_id: config.program_id,
        rpc_endpoint: config.rpc_endpoint,
        is_active: Boolean(config.is_active),
        updated_at: config.updated_at
      }
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Database error: ' + error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}