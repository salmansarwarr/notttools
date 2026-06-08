import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import {
    X,
    ExternalLink,
    Users,
    Network,
    Link2,
    Star,
    ChevronUp,
    ChevronDown,
    Circle,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

const truncate = (addr, n = 4) =>
    addr ? `${addr.slice(0, n)}...${addr.slice(-n)}` : "Unknown";

const fmtTokens = (n) => {
    const num = parseFloat(String(n).replace(/,/g, ""));
    if (isNaN(num)) return n;
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toLocaleString();
};

// Classify a hub node by connections
const hubClass = (connections) => {
    if (connections >= 10) return "major";
    if (connections >= 5) return "minor";
    if (connections >= 2) return "connected";
    return "leaf";
};

// Node color by role
const NODE_COLORS = {
    "insider-hub": "#ec4899", // pink — insider trading hub
    major: "#ffffff", // white
    minor: "#60a5fa", // blue
    connected: "#60a5fa",
    leaf: "#60a5fa",
    wallet: "#ec4899", // spoke wallets
};

// ─── main component ──────────────────────────────────────────────────────────

const InsiderNetworkModal = ({ isOpen, onClose, report }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const simulationRef = useRef(null);

    const [selectedNode, setSelectedNode] = useState(null);
    const [legendOpen, setLegendOpen] = useState(true);
    const [infoOpen, setInfoOpen] = useState(true);
    const [fps, setFps] = useState(0);
    // mobile bottom-sheet: null | 'legend' | 'info'
    const [mobilePanel, setMobilePanel] = useState(null);

    // ── build graph data from insiderNetworks ──
    const buildGraphData = useCallback(() => {
        if (!report?.insiderNetworks?.length) return { nodes: [], links: [] };

        const nodes = [];
        const links = [];
        const seen = new Set();

        report.insiderNetworks.forEach((net, netIdx) => {
            const hubId = `hub-${net.id}`;
            const connections = net.activeAccounts || 0;
            const role =
                connections >= 10 ? "insider-hub" : hubClass(connections);

            if (!seen.has(hubId)) {
                seen.add(hubId);
                nodes.push({
                    id: hubId,
                    networkId: net.id,
                    label: truncate(net.id.split("-").slice(-2).join(""), 6),
                    fullId: net.id,
                    type: "hub",
                    role,
                    connections,
                    pct: net.pct,
                    tokenAmount: net.tokenAmount,
                    netType: net.type,
                    size:
                        role === "insider-hub"
                            ? 14 + Math.min(connections * 0.6, 12)
                            : 8 + Math.min(connections * 0.4, 8),
                });
            }

            // Generate spoke wallet nodes
            for (let i = 0; i < connections; i++) {
                const walletId = `${net.id}-w${i}`;
                if (!seen.has(walletId)) {
                    seen.add(walletId);
                    nodes.push({
                        id: walletId,
                        networkId: net.id,
                        label: `Wallet ${i + 1}`,
                        type: "wallet",
                        role: "wallet",
                        connections: 1,
                        size: 5,
                        netType: net.type,
                    });
                }
                links.push({
                    source: hubId,
                    target: walletId,
                    networkId: net.id,
                });
            }
        });

        return { nodes, links };
    }, [report]);

    // ── D3 simulation ──
    useEffect(() => {
        if (!isOpen || !svgRef.current) return;

        const { nodes, links } = buildGraphData();
        if (!nodes.length) return;

        const el = svgRef.current;
        const W = el.clientWidth || 900;
        const H = el.clientHeight || 600;

        d3.select(el).selectAll("*").remove();

        const svg = d3.select(el).attr("width", W).attr("height", H);

        // Starfield background
        const stars = svg.append("g").attr("class", "stars");
        for (let i = 0; i < 80; i++) {
            stars
                .append("circle")
                .attr("cx", Math.random() * W)
                .attr("cy", Math.random() * H)
                .attr("r", Math.random() * 1.2)
                .attr("fill", "rgba(255,255,255,0.25)");
        }

        const g = svg.append("g");

        svg.call(
            d3
                .zoom()
                .scaleExtent([0.2, 4])
                .on("zoom", (e) => g.attr("transform", e.transform)),
        );

        const sim = d3
            .forceSimulation(nodes)
            .force(
                "link",
                d3
                    .forceLink(links)
                    .id((d) => d.id)
                    .distance(80)
                    .strength(0.7),
            )
            .force("charge", d3.forceManyBody().strength(-180))
            .force("center", d3.forceCenter(W / 2, H / 2))
            .force(
                "collision",
                d3.forceCollide().radius((d) => d.size + 6),
            );

        simulationRef.current = sim;

        // Links
        const link = g
            .append("g")
            .selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .attr("stroke", "rgba(236,72,153,0.2)")
            .attr("stroke-width", 0.7);

        // Glow filter for insider hubs
        const defs = svg.append("defs");
        const glow = defs.append("filter").attr("id", "glow");
        glow.append("feGaussianBlur")
            .attr("stdDeviation", "4")
            .attr("result", "blur");
        const merge = glow.append("feMerge");
        merge.append("feMergeNode").attr("in", "blur");
        merge.append("feMergeNode").attr("in", "SourceGraphic");

        // Node groups
        const nodeG = g
            .append("g")
            .selectAll("g")
            .data(nodes)
            .enter()
            .append("g")
            .style("cursor", "pointer")
            .on("click", (event, d) => {
                event.stopPropagation();
                setSelectedNode(d);
            })
            .call(
                d3
                    .drag()
                    .on("start", (event, d) => {
                        if (!event.active) sim.alphaTarget(0.3).restart();
                        d.fx = d.x;
                        d.fy = d.y;
                    })
                    .on("drag", (event, d) => {
                        d.fx = event.x;
                        d.fy = event.y;
                    })
                    .on("end", (event, d) => {
                        if (!event.active) sim.alphaTarget(0);
                        d.fx = null;
                        d.fy = null;
                    }),
            );

        // Outer glow ring for insider hubs
        nodeG
            .filter((d) => d.role === "insider-hub")
            .append("circle")
            .attr("r", (d) => d.size + 6)
            .attr("fill", "rgba(236,72,153,0.12)")
            .attr("stroke", "rgba(236,72,153,0.35)")
            .attr("stroke-width", 1);

        // Main circle
        nodeG
            .append("circle")
            .attr("r", (d) => d.size)
            .attr("fill", (d) => NODE_COLORS[d.role] || "#60a5fa")
            .attr("stroke", (d) =>
                d.role === "insider-hub"
                    ? "#f9a8d4"
                    : d.role === "major"
                      ? "rgba(255,255,255,0.6)"
                      : "none",
            )
            .attr("stroke-width", (d) =>
                d.role === "insider-hub" || d.role === "major" ? 1.5 : 0,
            )
            .attr("filter", (d) =>
                d.role === "insider-hub" ? "url(#glow)" : null,
            );

        // FPS counter
        let frameCount = 0;
        let lastTime = performance.now();
        sim.on("tick", () => {
            link.attr("x1", (d) => d.source.x)
                .attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y);
            nodeG.attr("transform", (d) => `translate(${d.x},${d.y})`);

            frameCount++;
            const now = performance.now();
            if (now - lastTime >= 1000) {
                setFps(frameCount);
                frameCount = 0;
                lastTime = now;
            }
        });

        // Click canvas to deselect
        svg.on("click", () => setSelectedNode(null));

        return () => sim.stop();
    }, [isOpen, buildGraphData]);

    if (!isOpen) return null;

    const networks = report?.insiderNetworks || [];
    const totalAccounts =
        networks.reduce((s, n) => s + (n.activeAccounts || 0), 0) +
        networks.length;
    const totalConnections =
        report?.graphInsidersDetected ||
        networks.reduce((s, n) => s + (n.activeAccounts || 0), 0);
    const majorHubs = networks.filter((n) => (n.activeAccounts || 0) >= 10);

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: "#050e16" }}
        >
            {/* ── top bar ── */}
            <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b border-gray-800/60 shrink-0">
                <div className="flex items-center gap-2">
                    {report?.tokenImage && (
                        <img
                            src={report.tokenImage}
                            alt=""
                            className="w-7 h-7 md:w-8 md:h-8 rounded-full"
                        />
                    )}
                    <span className="text-white font-bold font-mono text-xs md:text-sm">
                        {report?.tokenMeta?.name || "Token"}
                    </span>
                    <span className="hidden sm:inline bg-green-500/20 text-green-400 text-xs font-bold px-2 py-0.5 rounded border border-green-500/30">
                        1 / {networks.length * 10}
                    </span>
                    <span className="hidden sm:inline text-gray-500 text-xs font-mono bg-gray-800 px-2 py-0.5 rounded">
                        {report?.mint
                            ? `${report.mint.slice(0, 4)}...${report.mint.slice(-4)}`
                            : ""}
                    </span>
                </div>

                <h2 className="text-white font-bold tracking-widest text-xs md:text-sm uppercase absolute left-1/2 -translate-x-1/2 hidden md:block">
                    Insider Networks
                </h2>

                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-all font-bold text-lg"
                >
                    ✕
                </button>
            </div>

            {/* ── main area ── */}
            <div className="flex flex-1 overflow-hidden relative flex-col md:flex-row">
                {/* ── LEFT: Node Legend — hidden on mobile, shown as bottom sheet ── */}
                <div
                    className="hidden md:flex md:flex-col w-72 shrink-0 border-r border-gray-800/60 overflow-y-auto"
                    style={{ background: "rgba(5,14,22,0.95)" }}
                >
                    <div
                        className="flex items-center justify-between px-4 py-3 border-b border-gray-800/40 cursor-pointer"
                        onClick={() => setLegendOpen((v) => !v)}
                    >
                        <div className="flex items-center gap-2 text-blue-400">
                            <span className="text-base">🎨</span>
                            <span className="font-bold text-sm">
                                Node Legend
                            </span>
                        </div>
                        {legendOpen ? (
                            <ChevronUp size={16} className="text-gray-500" />
                        ) : (
                            <ChevronDown size={16} className="text-gray-500" />
                        )}
                    </div>

                    {legendOpen && (
                        <div className="px-4 py-4 space-y-5">
                            {/* Non-trading */}
                            <div>
                                <p className="text-[10px] font-black tracking-widest text-blue-400 mb-3 text-center border-b border-gray-800 pb-2">
                                    NON-TRADING NETWORK MEMBERS
                                </p>
                                <div className="space-y-3">
                                    {[
                                        {
                                            role: "major",
                                            label: "Major Hub",
                                            desc: "Connected to 10+ insider accounts",
                                            color: "#ffffff",
                                        },
                                        {
                                            role: "minor",
                                            label: "Minor Hub",
                                            desc: "Connected to 5–10 insider accounts",
                                            color: "#60a5fa",
                                        },
                                        {
                                            role: "connected",
                                            label: "Connected",
                                            desc: "Connected to 2–4 insider accounts",
                                            color: "#60a5fa",
                                        },
                                        {
                                            role: "leaf",
                                            label: "Leaf",
                                            desc: "Only received from insiders",
                                            color: "#60a5fa",
                                        },
                                    ].map((item) => (
                                        <div
                                            key={item.role}
                                            className="flex items-start gap-3"
                                        >
                                            <div
                                                className="w-5 h-5 rounded-full shrink-0 mt-0.5 border border-white/20"
                                                style={{
                                                    background: item.color,
                                                }}
                                            />
                                            <div>
                                                <p className="text-white font-bold text-sm">
                                                    {item.label}
                                                </p>
                                                <p className="text-gray-500 text-xs">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Insider trading */}
                            <div>
                                <p className="text-[10px] font-black tracking-widest text-pink-500 mb-3 text-center border-b border-gray-800 pb-2">
                                    INSIDER TRADING
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="w-5 h-5 rounded-full shrink-0 mt-0.5"
                                            style={{
                                                background: "#ec4899",
                                                boxShadow: "0 0 8px #ec4899",
                                            }}
                                        />
                                        <div>
                                            <p className="text-white font-bold text-sm">
                                                Insider Hub
                                            </p>
                                            <p className="text-gray-500 text-xs">
                                                Connected to 10+ accounts and
                                                participated in insider trading
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="w-5 h-5 rounded-full shrink-0 mt-0.5"
                                            style={{
                                                background: "#ec4899",
                                                boxShadow: "0 0 8px #ec4899",
                                            }}
                                        />
                                        <div>
                                            <p className="text-white font-bold text-sm">
                                                Insider
                                            </p>
                                            <p className="text-gray-500 text-xs">
                                                Connected to few accounts, and
                                                participated in insider trading
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="w-5 h-5 rounded-full shrink-0 mt-0.5"
                                            style={{
                                                background: "#ec4899",
                                                boxShadow: "0 0 8px #ec4899",
                                            }}
                                        />{" "}
                                        <div>
                                            <p className="text-white font-bold text-sm">
                                                Link
                                            </p>
                                            <p className="text-gray-500 text-xs">
                                                Transaction between accounts
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── CENTER: Graph canvas ── */}
                <div
                    className="flex-1 relative overflow-hidden"
                    ref={containerRef}
                >
                    <svg
                        ref={svgRef}
                        className="w-full h-full"
                        style={{ background: "transparent" }}
                    />

                    {/* Mobile panel toggle buttons */}
                    <div className="md:hidden absolute top-3 left-3 flex gap-2 z-10">
                        <button
                            onClick={() =>
                                setMobilePanel((p) =>
                                    p === "legend" ? null : "legend",
                                )
                            }
                            className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-all"
                            style={{
                                background:
                                    mobilePanel === "legend"
                                        ? "rgba(96,165,250,0.2)"
                                        : "rgba(5,14,22,0.85)",
                                borderColor:
                                    mobilePanel === "legend"
                                        ? "#60a5fa"
                                        : "rgba(255,255,255,0.1)",
                                color:
                                    mobilePanel === "legend"
                                        ? "#60a5fa"
                                        : "#9ca3af",
                            }}
                        >
                            🎨 Legend
                        </button>
                        <button
                            onClick={() =>
                                setMobilePanel((p) =>
                                    p === "info" ? null : "info",
                                )
                            }
                            className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-all"
                            style={{
                                background:
                                    mobilePanel === "info"
                                        ? "rgba(96,165,250,0.2)"
                                        : "rgba(5,14,22,0.85)",
                                borderColor:
                                    mobilePanel === "info"
                                        ? "#60a5fa"
                                        : "rgba(255,255,255,0.1)",
                                color:
                                    mobilePanel === "info"
                                        ? "#60a5fa"
                                        : "#9ca3af",
                            }}
                        >
                            ⠿ Info
                        </button>
                    </div>

                    {/* FPS */}
                    <div className="absolute bottom-3 left-3 text-gray-600 text-[10px] font-mono">
                        FPS: {fps}
                    </div>

                    {/* Selected node card */}
                    {selectedNode && (
                        <div
                            className="absolute bottom-6 left-3 right-3 md:left-6 md:right-auto md:w-80 rounded-2xl border border-gray-700/60 p-4 shadow-2xl"
                            style={{ background: "rgba(10,20,30,0.97)" }}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <Star
                                        size={16}
                                        className="text-yellow-400 fill-yellow-400"
                                    />
                                    <span className="text-white font-bold text-sm">
                                        {selectedNode.type === "hub"
                                            ? "Hub Wallet"
                                            : "Participant"}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setSelectedNode(null)}
                                    className="text-gray-500 hover:text-white w-6 h-6 flex items-center justify-center rounded"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <span className="text-gray-500 text-sm">
                                        Address:
                                    </span>
                                    <a
                                        className="flex items-center gap-1"
                                        target="_blank"
                                        href={`https://solscan.io/account/${selectedNode.fullId || selectedNode.networkId}`}
                                    >
                                        <span className="text-blue-400 font-mono text-xs text-right max-w-[180px] break-all">
                                            {selectedNode.fullId ||
                                                selectedNode.networkId}
                                        </span>
                                        <ExternalLink
                                            size={11}
                                            className="text-blue-400 shrink-0"
                                        />
                                    </a>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-sm">
                                        Connections:
                                    </span>
                                    <span className="text-white font-bold text-sm">
                                        {selectedNode.connections || 1}
                                    </span>
                                </div>

                                {selectedNode.pct && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 text-sm">
                                            Supply %:
                                        </span>
                                        <span className="text-red-400 font-bold text-sm">
                                            {selectedNode.pct}%
                                        </span>
                                    </div>
                                )}

                                {selectedNode.tokenAmount && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 text-sm">
                                            Tokens:
                                        </span>
                                        <span className="text-gray-300 text-sm">
                                            {fmtTokens(
                                                selectedNode.tokenAmount,
                                            )}
                                        </span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 text-sm">
                                        Network:
                                    </span>
                                    <span className="text-gray-300 text-sm capitalize">
                                        {selectedNode.netType || "transfer"}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-gray-500 text-sm">
                                        Status:
                                    </span>
                                    <span
                                        className="text-xs font-bold px-3 py-1 rounded-lg"
                                        style={{
                                            background:
                                                selectedNode.role ===
                                                "insider-hub"
                                                    ? "#ec4899"
                                                    : "#3b82f6",
                                            color: "#fff",
                                        }}
                                    >
                                        {selectedNode.type === "hub"
                                            ? "Hub"
                                            : "Participant"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Graph Information — hidden on mobile, shown as bottom sheet ── */}
                <div
                    className="hidden md:flex md:flex-col w-72 shrink-0 border-l border-gray-800/60 overflow-y-auto"
                    style={{ background: "rgba(5,14,22,0.95)" }}
                >
                    <div
                        className="flex items-center justify-between px-4 py-3 border-b border-gray-800/40 cursor-pointer"
                        onClick={() => setInfoOpen((v) => !v)}
                    >
                        <div className="flex items-center gap-2 text-blue-400">
                            <span className="text-base">⠿</span>
                            <span className="font-bold text-sm">
                                Graph Information
                            </span>
                        </div>
                        {infoOpen ? (
                            <ChevronUp size={16} className="text-gray-500" />
                        ) : (
                            <ChevronDown size={16} className="text-gray-500" />
                        )}
                    </div>

                    {infoOpen && (
                        <div className="px-4 py-4 space-y-4">
                            {/* Overview label */}
                            <div className="flex items-center gap-2 text-blue-400 mb-1">
                                <span className="text-sm">🥧</span>
                                <span className="font-bold text-sm">
                                    Overview
                                </span>
                            </div>

                            {/* Stats */}
                            {[
                                {
                                    icon: "👥",
                                    label: "TOTAL ACCOUNTS",
                                    value: totalAccounts,
                                    color: "#818cf8",
                                    bg: "#312e81",
                                },
                                {
                                    icon: "🔗",
                                    label: "TOTAL CONNECTIONS",
                                    value: totalConnections,
                                    color: "#f472b6",
                                    bg: "#831843",
                                },
                                {
                                    icon: "🔀",
                                    label: "NETWORKS",
                                    value: networks.length,
                                    color: "#38bdf8",
                                    bg: "#0c4a6e",
                                },
                            ].map((stat) => (
                                <div
                                    key={stat.label}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-800/50"
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                    }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                                        style={{ background: stat.bg + "80" }}
                                    >
                                        {stat.icon}
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-[10px] font-black tracking-widest">
                                            {stat.label}
                                        </p>
                                        <p className="text-white font-black text-2xl leading-tight">
                                            {stat.value}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {/* Major Hubs */}
                            {majorHubs.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3 pt-2 border-t border-gray-800">
                                        <Star
                                            size={14}
                                            className="text-yellow-400 fill-yellow-400"
                                        />
                                        <span className="text-white font-bold text-sm">
                                            Major Hubs ({majorHubs.length})
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {majorHubs.map((net) => (
                                            <div
                                                key={net.id}
                                                className="p-3 rounded-xl border border-gray-800/60"
                                                style={{
                                                    background:
                                                        "rgba(255,255,255,0.03)",
                                                }}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{
                                                            background:
                                                                "#f59e0b",
                                                            boxShadow:
                                                                "0 0 6px #f59e0b",
                                                        }}
                                                    />
                                                    <span className="text-blue-400 font-mono text-xs flex items-center gap-1">
                                                        {truncate(
                                                            net.id.replace(
                                                                /-/g,
                                                                "",
                                                            ),
                                                            5,
                                                        )}
                                                        <ExternalLink
                                                            size={10}
                                                        />
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30">
                                                        {net.activeAccounts}{" "}
                                                        connections
                                                    </span>
                                                    <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded border border-green-500/30">
                                                        {fmtTokens(
                                                            net.tokenAmount,
                                                        )}{" "}
                                                        tokens
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* All networks list */}
                            <div>
                                <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-3 pt-2 border-t border-gray-800">
                                    All Networks
                                </p>
                                <div className="space-y-1.5">
                                    {networks.map((net, idx) => (
                                        <div
                                            key={net.id}
                                            className="flex items-center justify-between p-2.5 rounded-lg border border-gray-800/40 hover:border-gray-700 transition-colors"
                                            style={{
                                                background:
                                                    "rgba(255,255,255,0.02)",
                                            }}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{
                                                        background:
                                                            (net.activeAccounts ||
                                                                0) >= 10
                                                                ? "#ec4899"
                                                                : "#60a5fa",
                                                    }}
                                                />
                                                <span className="text-gray-400 font-mono text-[11px] truncate">
                                                    {net.id}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                <span className="text-gray-500 text-[10px]">
                                                    {net.activeAccounts}w
                                                </span>
                                                <span className="text-red-400 text-[10px] font-bold">
                                                    {net.pct}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Mobile bottom sheets ── */}
            {mobilePanel && (
                <div
                    className="md:hidden fixed inset-0 z-40"
                    onClick={() => setMobilePanel(null)}
                    style={{ background: "rgba(0,0,0,0.5)" }}
                />
            )}
            {/* Legend sheet */}
            <div
                className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-gray-800 overflow-y-auto transition-transform duration-300"
                style={{
                    background: "rgba(5,14,22,0.98)",
                    maxHeight: "65vh",
                    transform:
                        mobilePanel === "legend"
                            ? "translateY(0)"
                            : "translateY(100%)",
                }}
            >
                <div
                    className="flex items-center justify-between px-4 py-3 border-b border-gray-800/40 cursor-pointer"
                    onClick={() => setMobilePanel(null)}
                >
                    <div className="flex items-center gap-2 text-blue-400">
                        <span className="text-base">🎨</span>
                        <span className="font-bold text-sm">Node Legend</span>
                    </div>
                    <ChevronDown size={16} className="text-gray-500" />
                </div>
                <div className="px-4 py-4 space-y-5">
                    <div>
                        <p className="text-[10px] font-black tracking-widest text-blue-400 mb-3 text-center border-b border-gray-800 pb-2">
                            NON-TRADING NETWORK MEMBERS
                        </p>
                        <div className="space-y-3">
                            {[
                                {
                                    role: "major",
                                    label: "Major Hub",
                                    desc: "Connected to 10+ insider accounts",
                                    color: "#ffffff",
                                },
                                {
                                    role: "minor",
                                    label: "Minor Hub",
                                    desc: "Connected to 5–10 insider accounts",
                                    color: "#60a5fa",
                                },
                                {
                                    role: "connected",
                                    label: "Connected",
                                    desc: "Connected to 2–4 insider accounts",
                                    color: "#60a5fa",
                                },
                                {
                                    role: "leaf",
                                    label: "Leaf",
                                    desc: "Only received from insiders",
                                    color: "#60a5fa",
                                },
                            ].map((item) => (
                                <div
                                    key={item.role}
                                    className="flex items-start gap-3"
                                >
                                    <div
                                        className="w-5 h-5 rounded-full shrink-0 mt-0.5 border border-white/20"
                                        style={{ background: item.color }}
                                    />
                                    <div>
                                        <p className="text-white font-bold text-sm">
                                            {item.label}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black tracking-widest text-pink-500 mb-3 text-center border-b border-gray-800 pb-2">
                            INSIDER TRADING
                        </p>
                        <div className="space-y-3">
                            {[
                                {
                                    label: "Insider Hub",
                                    desc: "Connected to 10+ accounts and participated in insider trading",
                                },
                                {
                                    label: "Insider",
                                    desc: "Connected to few accounts, and participated in insider trading",
                                },
                                {
                                    label: "Link",
                                    desc: "Transaction between accounts",
                                },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="flex items-start gap-3"
                                >
                                    <div
                                        className="w-5 h-5 rounded-full shrink-0 mt-0.5"
                                        style={{
                                            background: "#ec4899",
                                            boxShadow: "0 0 8px #ec4899",
                                        }}
                                    />
                                    <div>
                                        <p className="text-white font-bold text-sm">
                                            {item.label}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Info sheet */}
            <div
                className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-gray-800 overflow-y-auto transition-transform duration-300"
                style={{
                    background: "rgba(5,14,22,0.98)",
                    maxHeight: "65vh",
                    transform:
                        mobilePanel === "info"
                            ? "translateY(0)"
                            : "translateY(100%)",
                }}
            >
                <div
                    className="flex items-center justify-between px-4 py-3 border-b border-gray-800/40 cursor-pointer"
                    onClick={() => setMobilePanel(null)}
                >
                    <div className="flex items-center gap-2 text-blue-400">
                        <span className="text-base">⠿</span>
                        <span className="font-bold text-sm">
                            Graph Information
                        </span>
                    </div>
                    <ChevronDown size={16} className="text-gray-500" />
                </div>
                <div className="px-4 py-4 space-y-4">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                        <span className="text-sm">🥧</span>
                        <span className="font-bold text-sm">Overview</span>
                    </div>
                    {[
                        {
                            icon: "👥",
                            label: "TOTAL ACCOUNTS",
                            value: totalAccounts,
                            bg: "#312e81",
                        },
                        {
                            icon: "🔗",
                            label: "TOTAL CONNECTIONS",
                            value: totalConnections,
                            bg: "#831843",
                        },
                        {
                            icon: "🔀",
                            label: "NETWORKS",
                            value: networks.length,
                            bg: "#0c4a6e",
                        },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="flex items-center gap-3 p-3 rounded-xl border border-gray-800/50"
                            style={{ background: "rgba(255,255,255,0.03)" }}
                        >
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                                style={{ background: stat.bg + "80" }}
                            >
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-gray-500 text-[10px] font-black tracking-widest">
                                    {stat.label}
                                </p>
                                <p className="text-white font-black text-2xl leading-tight">
                                    {stat.value}
                                </p>
                            </div>
                        </div>
                    ))}
                    {majorHubs.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3 pt-2 border-t border-gray-800">
                                <Star
                                    size={14}
                                    className="text-yellow-400 fill-yellow-400"
                                />
                                <span className="text-white font-bold text-sm">
                                    Major Hubs ({majorHubs.length})
                                </span>
                            </div>
                            <div className="space-y-2">
                                {majorHubs.map((net) => (
                                    <div
                                        key={net.id}
                                        className="p-3 rounded-xl border border-gray-800/60"
                                        style={{
                                            background:
                                                "rgba(255,255,255,0.03)",
                                        }}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                                style={{
                                                    background: "#f59e0b",
                                                    boxShadow:
                                                        "0 0 6px #f59e0b",
                                                }}
                                            />
                                            <span className="text-blue-400 font-mono text-xs flex items-center gap-1">
                                                {truncate(
                                                    net.id.replace(/-/g, ""),
                                                    5,
                                                )}
                                                <ExternalLink size={10} />
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30">
                                                {net.activeAccounts} connections
                                            </span>
                                            <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded border border-green-500/30">
                                                {fmtTokens(net.tokenAmount)}{" "}
                                                tokens
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-3 pt-2 border-t border-gray-800">
                            All Networks
                        </p>
                        <div className="space-y-1.5">
                            {networks.map((net) => (
                                <div
                                    key={net.id}
                                    className="flex items-center justify-between p-2.5 rounded-lg border border-gray-800/40"
                                    style={{
                                        background: "rgba(255,255,255,0.02)",
                                    }}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{
                                                background:
                                                    (net.activeAccounts || 0) >=
                                                    10
                                                        ? "#ec4899"
                                                        : "#60a5fa",
                                            }}
                                        />
                                        <span className="text-gray-400 font-mono text-[11px] truncate">
                                            {net.id}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className="text-gray-500 text-[10px]">
                                            {net.activeAccounts}w
                                        </span>
                                        <span className="text-red-400 text-[10px] font-bold">
                                            {net.pct}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InsiderNetworkModal;
