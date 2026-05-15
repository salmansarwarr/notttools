// Spawns N workers in parallel — first one to find the suffix wins.
// The losing workers are terminated immediately.

import { useCallback, useRef, useState } from "react";
import { Keypair } from "@solana/web3.js";

// Use all available CPU cores (capped at 8 to avoid memory pressure)
const WORKER_COUNT = Math.min(navigator.hardwareConcurrency ?? 4, 8);

/**
 * Returns { findVanityMint, isSearching, attempts, cancel }
 *
 * Usage:
 *   const { findVanityMint, isSearching, attempts } = useVanityMint();
 *   const mint = await findVanityMint("NTL");
 */
export function useVanityMint() {
    const [isSearching, setIsSearching] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const workersRef = useRef([]);
    const totalAttemptsRef = useRef(0);

    // Kill all running workers
    const terminateAll = useCallback(() => {
        workersRef.current.forEach((w) => w.terminate());
        workersRef.current = [];
    }, []);

    const cancel = useCallback(() => {
        terminateAll();
        setIsSearching(false);
        setAttempts(0);
        totalAttemptsRef.current = 0;
    }, [terminateAll]);

    const findVanityMint = useCallback(
        (suffix = "NTL") => {
            return new Promise((resolve, reject) => {
                setIsSearching(true);
                setAttempts(0);
                totalAttemptsRef.current = 0;

                const workerAttempts = new Array(WORKER_COUNT).fill(0);

                const workers = Array.from({ length: WORKER_COUNT }, (_, id) => {
                    const worker = new Worker("/vanityWorker.js");

                    worker.onmessage = ({ data }) => {
                        if (data.progress) {
                            workerAttempts[data.workerId] = data.attempts;
                            totalAttemptsRef.current = workerAttempts.reduce(
                                (a, b) => a + b,
                                0
                            );
                            setAttempts(totalAttemptsRef.current);
                            return;
                        }

                        terminateAll();
                        setIsSearching(false);

                        workerAttempts[data.workerId] = data.attempts;
                        const total = workerAttempts.reduce((a, b) => a + b, 0);
                        setAttempts(total);

                        const keypair = Keypair.fromSecretKey(
                            Uint8Array.from(data.secretKey)
                        );
                        resolve(keypair);
                    };

                    worker.onerror = (err) => {
                        terminateAll();
                        setIsSearching(false);
                        reject(err);
                    };

                    worker.postMessage({ suffix, workerId: id });
                    return worker;
                });

                workersRef.current = workers;
            });
        },
        [terminateAll]
    );

    return { findVanityMint, isSearching, attempts, cancel };
}