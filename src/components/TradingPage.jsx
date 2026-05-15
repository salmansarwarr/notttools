import React, { useState, useEffect } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import TVChartContainer from "./TVChartContainer";
import {
    fetchBondingCurve,
    getTradingStats,
    subscribeToBondingCurve,
} from "../utils/bondingCurveHelpers";
import "./TradingPage.css";

const PROGRAM_ID = "CPMWvEXzNTnrksm1PPXQzp2UUTXWxCKQaw9HhvDdf3nT";

function TradingPage({ tokenMint }) {
    const connection = new Connection(import.meta.env.VITE_RPC_URL);

    const [bondingCurve, setBondingCurve] = useState(null);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();

        // Subscribe to real-time updates
        const unsubscribe = subscribeToBondingCurve(
            connection,
            new PublicKey(PROGRAM_ID),
            new PublicKey(tokenMint),
            (updatedCurve) => {
                setBondingCurve(updatedCurve);
                updateStats(updatedCurve);
            },
        );

        return () => unsubscribe();
    }, [tokenMint]);

    const loadData = async () => {
        try {
            setIsLoading(true);

            // Fetch bonding curve data
            const curve = await fetchBondingCurve(
                connection,
                new PublicKey(PROGRAM_ID),
                new PublicKey(tokenMint),
            );
            setBondingCurve(curve);

            // Fetch trading stats
            const tradingStats = await getTradingStats(
                connection,
                new PublicKey(PROGRAM_ID),
                new PublicKey(tokenMint),
            );
            setStats(tradingStats);

            setIsLoading(false);
        } catch (error) {
            console.error("Error loading data:", error);
            setIsLoading(false);
        }
    };

    const updateStats = async (curve) => {
        const tradingStats = await getTradingStats(
            connection,
            new PublicKey(PROGRAM_ID),
            new PublicKey(tokenMint),
        );
        setStats(tradingStats);
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading bonding curve...</p>
            </div>
        );
    }

    if (!bondingCurve || !stats) {
        return (
            <div className="error-container">
                <p>Failed to load bonding curve data</p>
                <button onClick={loadData}>Retry</button>
            </div>
        );
    }

    return (
        <div className="trading-page">
            {/* Chart Section */}
            <div className="chart-section">
                <TVChartContainer
                    symbol="TOKEN/SOL"
                    programId={PROGRAM_ID}
                    tokenMint={tokenMint}
                    rpcUrl={connection.rpcEndpoint}
                />
            </div>
        </div>
    );
}

export default TradingPage;
