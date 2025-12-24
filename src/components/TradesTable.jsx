import { toast } from "react-toastify";

const TradesTable = ({ trades, currentSolPrice, isLoading }) => {
    const formatTimestamp = (timestamp) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        return `${Math.floor(seconds / 86400)}d`;
    };

    const formatNumber = (num) => {
        const number = parseFloat(num);
        if (number >= 1e6) return `${(number / 1e6).toFixed(2)}M`;
        if (number >= 1e3) return `${(number / 1e3).toFixed(2)}K`;
        return number.toFixed(2);
    };

    const copyAddress = (address) => {
        navigator.clipboard.writeText(address);
        toast.success("Address copied!", { autoClose: 2000 });
    };

    const openTransaction = (signature) => {
        window.open(`https://solscan.io/tx/${signature}`, "_blank");
    };

    if (isLoading && trades.length === 0) {
        return (
            <div className="bg-[#192630] rounded-2xl border border-gray-700 p-6">
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-400">Loading trades...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#192630] rounded-2xl border border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Recent Trades</h2>
                <div className="flex items-center gap-2">
                    {isLoading && (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                    )}
                    <span className="text-sm text-gray-400">
                        {trades.length} trades
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-[#0A151E]">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Age
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Type
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Price
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Amount
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Total USD
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Trader
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {trades.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-4 py-12 text-center text-gray-400">
                                    No trades yet
                                </td>
                            </tr>
                        ) : (
                            trades.map((trade) => (
                                <tr
                                    key={trade.id}
                                    className="hover:bg-gray-800/30 transition-colors"
                                >
                                    {/* Age */}
                                    <td className="px-4 py-3 text-sm text-gray-400">
                                        {formatTimestamp(trade.timestamp)}
                                    </td>

                                    {/* Type */}
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                                                trade.type === "Buy"
                                                    ? "bg-green-900/30 text-green-400 border border-green-500/30"
                                                    : "bg-red-900/30 text-red-400 border border-red-500/30"
                                            }`}
                                        >
                                            {trade.type}
                                        </span>
                                    </td>

                                    {/* Price */}
                                    <td className="px-4 py-3 text-right text-sm text-white font-mono">
                                        ${trade.price < 0.000001 
                                            ? trade.price.toExponential(2)
                                            : trade.price < 0.01
                                            ? trade.price.toFixed(8)
                                            : trade.price.toFixed(6)
                                        }
                                    </td>

                                    {/* Amount */}
                                    <td className="px-4 py-3 text-right text-sm text-white">
                                        {formatNumber(trade.tokens)}
                                    </td>

                                    {/* Total USD */}
                                    <td className={`px-4 py-3 text-right text-sm font-semibold ${
                                        trade.type === "Buy" ? "text-green-400" : "text-red-400"
                                    }`}>
                                        ${formatNumber(trade.totalUsd)}
                                    </td>

                                    {/* Trader */}
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1">
                                                {/* Random emoji avatars */}
                                                <span className="text-lg">
                                                    {['🐸', '🦊', '🐻', '🐼', '🦁'][
                                                        Math.abs(trade.trader.charCodeAt(0) % 5)
                                                    ]}
                                                </span>
                                                <code className="text-gray-400 text-xs">
                                                    {trade.trader.slice(0, 4)}..{trade.trader.slice(-4)}
                                                </code>
                                            </div>
                                            <button
                                                onClick={() => copyAddress(trade.trader)}
                                                className="p-1 hover:bg-gray-700 rounded transition-colors"
                                                title="Copy address"
                                            >
                                                <svg
                                                    className="w-3 h-3 text-gray-500 hover:text-gray-300"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => openTransaction(trade.signature)}
                                                className="p-1 hover:bg-gray-700 rounded transition-colors"
                                                title="View transaction on Solscan"
                                            >
                                                <svg
                                                    className="w-4 h-4 text-gray-400 hover:text-gray-200"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2"
                                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            {trades.length > 0 && (
                <div className="px-6 py-3 border-t border-gray-700 flex items-center justify-between bg-[#0A151E]">
                    <span className="text-sm text-gray-400">
                        Showing {trades.length} recent trades
                    </span>
                    {/* <button
                        onClick={fetchTrades}
                        disabled={isLoading}
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg
                            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        Refresh
                    </button> */}
                </div>
            )}
        </div>
    );
};

export default TradesTable;