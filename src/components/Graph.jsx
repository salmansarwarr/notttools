import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import {
    X,
    ExternalLink,
    Users,
    Star,
    ChevronUp,
    ChevronDown,
    Search,
    Copy,
    CheckCheck,
    AlertTriangle,
    Loader2,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

const truncate = (addr, n = 4) =>
    addr ? `${addr.slice(0, n)}...${addr.slice(-n)}` : "Unknown";

const fmtTokens = (raw, decimals = 6) => {
    const num = Number(raw) / Math.pow(10, decimals);
    if (isNaN(num) || num === 0) return "0";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

// Distinct cluster palette — vivid, dark-bg friendly
const CLUSTER_PALETTE = [
    "#f97316", // orange
    "#a78bfa", // violet
    "#34d399", // emerald
    "#fb7185", // rose
    "#38bdf8", // sky
    "#facc15", // yellow
    "#c084fc", // purple
    "#4ade80", // green
    "#f472b6", // pink
    "#22d3ee", // cyan
];

const clusterColor = (idx) => CLUSTER_PALETTE[idx % CLUSTER_PALETTE.length];

// ─── main component ───────────────────────────────────────────────────────────

const InsiderNetworkModal = ({ isOpen, onClose, report }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const simulationRef = useRef(null);

    const [graphData, setGraphData] = useState(null); // raw API response
    const [isLoadingGraph, setIsLoadingGraph] = useState(false);
    const [graphError, setGraphError] = useState(null);

    const [selectedNode, setSelectedNode] = useState(null);
    const [hoveredCluster, setHoveredCluster] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [copied, setCopied] = useState(false);
    const [legendOpen, setLegendOpen] = useState(true);
    const [infoOpen, setInfoOpen] = useState(true);
    const [fps, setFps] = useState(0);
    const [mobilePanel, setMobilePanel] = useState(null);

    // ── fetch graph data when modal opens ──
    useEffect(() => {
        if (!isOpen || !report?.mint) return;
        setGraphData(null);
        setGraphError(null);
        setSelectedNode(null);
        setSearchQuery("");

        const fetchGraph = async () => {
            setIsLoadingGraph(true);
            try {
                const res = await fetch(
                    `https://api.rugcheck.xyz/v1/tokens/${report.mint}/insiders/graph`,
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setGraphData(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Graph fetch failed:", err);
                setGraphError(err.message);
            } finally {
                setIsLoadingGraph(false);
            }
        };

        fetchGraph();
    }, [isOpen, report?.mint]);

    // ── build D3-ready nodes + links from API response ──
    const buildGraphData = useCallback(() => {
        if (!graphData?.length) return { nodes: [], links: [], clusters: [] };

        const nodeMap = new Map(); // id -> node obj
        const allLinks = [];

        // First pass: collect all nodes, tag with cluster index
        graphData.forEach((network, clusterIdx) => {
            network.nodes.forEach((n) => {
                if (!nodeMap.has(n.id)) {
                    nodeMap.set(n.id, {
                        id: n.id,
                        holdings: n.holdings || 0,
                        participant: n.participant,
                        // track which clusters this node appears in
                        clusters: new Set(),
                        inDegree: 0,
                        outDegree: 0,
                    });
                }
                // a node in multiple clusters keeps the first cluster's color
                nodeMap.get(n.id).clusters.add(clusterIdx);
            });

            network.links.forEach((l) => {
                allLinks.push({
                    source: l.source,
                    target: l.target,
                    clusterId: network.net_id,
                    clusterIdx,
                });
            });
        });

        // Second pass: compute degree
        allLinks.forEach((l) => {
            if (nodeMap.has(l.source)) nodeMap.get(l.source).outDegree++;
            if (nodeMap.has(l.target)) nodeMap.get(l.target).inDegree++;
        });

        // Assign primary cluster, role, size, color
        const nodes = Array.from(nodeMap.values()).map((n) => {
            const primaryCluster = [...n.clusters][0] ?? 0;
            const totalDegree = n.inDegree + n.outDegree;
            const isHub = n.holdings > 0 && totalDegree >= 3;
            const role = isHub
                ? "hub"
                : totalDegree >= 4
                  ? "connector"
                  : "participant";

            return {
                ...n,
                clusters: [...n.clusters],
                primaryCluster,
                role,
                color: clusterColor(primaryCluster),
                size:
                    role === "hub"
                        ? 12 + Math.min(Math.log(n.holdings + 1) * 1.2, 14)
                        : role === "connector"
                          ? 8
                          : 5,
            };
        });

        const clusterMeta = graphData.map((net, idx) => ({
            net_id: net.net_id,
            idx,
            color: clusterColor(idx),
            nodeCount: net.nodes.length,
            linkCount: net.links.length,
        }));

        return { nodes, links: allLinks, clusters: clusterMeta };
    }, [graphData]);

    // ── D3 force simulation ──
    useEffect(() => {
        if (!isOpen || !svgRef.current || !graphData) return;

        const { nodes, links, clusters } = buildGraphData();
        if (!nodes.length) return;

        const el = svgRef.current;
        const W = el.clientWidth || 900;
        const H = el.clientHeight || 600;

        d3.select(el).selectAll("*").remove();

        const svg = d3.select(el).attr("viewBox", `0 0 ${W} ${H}`);

        // Starfield
        const stars = svg.append("g");
        for (let i = 0; i < 100; i++) {
            stars
                .append("circle")
                .attr("cx", Math.random() * W)
                .attr("cy", Math.random() * H)
                .attr("r", Math.random() * 1.1)
                .attr("fill", `rgba(255,255,255,${Math.random() * 0.3})`);
        }

        const g = svg.append("g");

        // Zoom
        const zoom = d3
            .zoom()
            .scaleExtent([0.1, 5])
            .on("zoom", (e) => g.attr("transform", e.transform));
        svg.call(zoom);

        // Defs: glow + arrowhead per cluster color
        const defs = svg.append("defs");

        const glow = defs.append("filter").attr("id", "glow-hub");
        glow.append("feGaussianBlur")
            .attr("stdDeviation", "5")
            .attr("result", "blur");
        const merge = glow.append("feMerge");
        merge.append("feMergeNode").attr("in", "blur");
        merge.append("feMergeNode").attr("in", "SourceGraphic");

        const glowSm = defs.append("filter").attr("id", "glow-sm");
        glowSm
            .append("feGaussianBlur")
            .attr("stdDeviation", "2.5")
            .attr("result", "blur");
        const mergeSm = glowSm.append("feMerge");
        mergeSm.append("feMergeNode").attr("in", "blur");
        mergeSm.append("feMergeNode").attr("in", "SourceGraphic");

        // Cluster color markers (arrows)
        CLUSTER_PALETTE.forEach((color, i) => {
            defs.append("marker")
                .attr("id", `arrow-${i}`)
                .attr("viewBox", "0 -4 8 8")
                .attr("refX", 14)
                .attr("refY", 0)
                .attr("markerWidth", 5)
                .attr("markerHeight", 5)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M0,-4L8,0L0,4")
                .attr("fill", color)
                .attr("opacity", 0.7);
        });

        // Simulation
        // Cluster hubs get pre-seeded positions so clusters stay separated
        const hubNodes = nodes.filter((n) => n.role === "hub");
        const hubCount = hubNodes.length || 1;
        hubNodes.forEach((hub, i) => {
            const angle = (2 * Math.PI * i) / hubCount;
            const r = Math.min(W, H) * 0.28;
            hub.x = W / 2 + r * Math.cos(angle);
            hub.y = H / 2 + r * Math.sin(angle);
            hub.fx = hub.x;
            hub.fy = hub.y;
        });

        const sim = d3
            .forceSimulation(nodes)
            .force(
                "link",
                d3
                    .forceLink(links)
                    .id((d) => d.id)
                    .distance((l) => {
                        const s = nodes.find(
                            (n) => n.id === (l.source.id || l.source),
                        );
                        const t = nodes.find(
                            (n) => n.id === (l.target.id || l.target),
                        );
                        return s?.role === "hub" || t?.role === "hub" ? 90 : 55;
                    })
                    .strength(0.6),
            )
            .force("charge", d3.forceManyBody().strength(-220).distanceMax(350))
            .force("center", d3.forceCenter(W / 2, H / 2).strength(0.05))
            .force(
                "collision",
                d3.forceCollide().radius((d) => d.size + 5),
            )
            // Cluster grouping: pull same-cluster nodes together
            .force(
                "clusterX",
                d3
                    .forceX((d) => {
                        const hub = hubNodes.find(
                            (h) => h.primaryCluster === d.primaryCluster,
                        );
                        return hub ? (hub.x ?? W / 2) : W / 2;
                    })
                    .strength(0.12),
            )
            .force(
                "clusterY",
                d3
                    .forceY((d) => {
                        const hub = hubNodes.find(
                            (h) => h.primaryCluster === d.primaryCluster,
                        );
                        return hub ? (hub.y ?? H / 2) : H / 2;
                    })
                    .strength(0.12),
            );

        simulationRef.current = sim;

        // After initial layout, release hub fixed positions
        setTimeout(() => {
            hubNodes.forEach((hub) => {
                hub.fx = null;
                hub.fy = null;
            });
            sim.alpha(0.3).restart();
        }, 800);

        // Links
        const link = g
            .append("g")
            .selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .attr("stroke", (d) => clusterColor(d.clusterIdx))
            .attr("stroke-width", 0.8)
            .attr("stroke-opacity", 0.25)
            .attr("marker-end", (d) => `url(#arrow-${d.clusterIdx})`);

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
            .on("mouseenter", (_, d) => setHoveredCluster(d.primaryCluster))
            .on("mouseleave", () => setHoveredCluster(null))
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

        // Hub outer pulse ring
        nodeG
            .filter((d) => d.role === "hub")
            .append("circle")
            .attr("r", (d) => d.size + 7)
            .attr("fill", (d) => d.color + "18")
            .attr("stroke", (d) => d.color + "55")
            .attr("stroke-width", 1.5);

        // Main node circle
        const circle = nodeG
            .append("circle")
            .attr("r", (d) => d.size)
            .attr("fill", (d) => d.color)
            .attr("fill-opacity", (d) => (d.role === "hub" ? 0.9 : 0.7))
            .attr("stroke", (d) => (d.role === "hub" ? d.color : "none"))
            .attr("stroke-width", (d) => (d.role === "hub" ? 2 : 0))
            .attr("filter", (d) =>
                d.role === "hub"
                    ? "url(#glow-hub)"
                    : d.role === "connector"
                      ? "url(#glow-sm)"
                      : null,
            );

        // Label for hub nodes only
        nodeG
            .filter((d) => d.role === "hub")
            .append("text")
            .text((d) => truncate(d.id))
            .attr("dy", (d) => -(d.size + 5))
            .attr("text-anchor", "middle")
            .attr("font-size", "9px")
            .attr("fill", (d) => d.color)
            .attr("font-family", "monospace")
            .attr("pointer-events", "none");

        // FPS + tick
        let frameCount = 0;
        let lastTime = performance.now();

        sim.on("tick", () => {
            link.attr("x1", (d) => d.source.x)
                .attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y);
            nodeG.attr(
                "transform",
                (d) => `translate(${d.x ?? 0},${d.y ?? 0})`,
            );

            frameCount++;
            const now = performance.now();
            if (now - lastTime >= 1000) {
                setFps(frameCount);
                frameCount = 0;
                lastTime = now;
            }
        });

        svg.on("click", () => setSelectedNode(null));

        return () => sim.stop();
    }, [isOpen, graphData, buildGraphData]);

    // ── dim non-hovered cluster links ──
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.selectAll("line")
            .attr("stroke-opacity", (d) =>
                hoveredCluster === null || d.clusterIdx === hoveredCluster
                    ? 0.35
                    : 0.06,
            )
            .attr("stroke-width", (d) =>
                hoveredCluster !== null && d.clusterIdx === hoveredCluster
                    ? 1.4
                    : 0.8,
            );
    }, [hoveredCluster]);

    // ── highlight searched node ──
    useEffect(() => {
        if (!svgRef.current) return;
        const q = searchQuery.trim().toLowerCase();
        d3.select(svgRef.current)
            .selectAll("circle")
            .attr("stroke-width", (d) => {
                if (!d?.id) return 0;
                if (q && d.id.toLowerCase().includes(q)) return 3;
                return d.role === "hub" ? 2 : 0;
            })
            .attr("stroke", (d) => {
                if (!d?.id) return "none";
                if (q && d.id.toLowerCase().includes(q)) return "#fff";
                return d.role === "hub" ? d.color : "none";
            });
    }, [searchQuery]);

    const copyAddress = (addr) => {
        navigator.clipboard.writeText(addr).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    if (!isOpen) return null;

    const { nodes, links, clusters } = graphData
        ? buildGraphData()
        : { nodes: [], links: [], clusters: [] };

    const totalAccounts = nodes.length;
    const totalLinks = links.length;
    const hubNodes = nodes.filter((n) => n.role === "hub");
    const networks = report?.insiderNetworks || [];

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: "#050e16" }}
        >
            {/* ── Top bar ── */}
            <div className="flex items-center justify-between px-3 md:px-5 py-2.5 border-b border-gray-800/60 shrink-0">
                <div className="flex items-center gap-2.5">
                    {report?.tokenImage && (
                        <img
                            src={report.tokenImage}
                            alt=""
                            className="w-7 h-7 rounded-full ring-1 ring-white/10"
                        />
                    )}
                    <span className="text-white font-bold font-mono text-xs md:text-sm">
                        {report?.tokenMeta?.name || "Token"}
                    </span>
                    <span className="hidden sm:inline text-gray-500 text-xs font-mono bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                        {report?.mint ? truncate(report.mint, 6) : ""}
                    </span>
                    {!isLoadingGraph && graphData && (
                        <span className="hidden sm:inline bg-red-500/15 text-red-400 text-xs font-bold px-2 py-0.5 rounded border border-red-500/25">
                            {totalAccounts} wallets · {clusters.length} clusters
                        </span>
                    )}
                </div>

                <h2 className="text-white font-bold tracking-widest text-xs md:text-sm uppercase absolute left-1/2 -translate-x-1/2 hidden md:block">
                    Insider Network Map
                </h2>

                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-all"
                >
                    <X size={16} />
                </button>
            </div>

            {/* ── Main area ── */}
            <div className="flex flex-1 overflow-hidden relative flex-col md:flex-row">
                {/* ── LEFT sidebar: Legend ── */}
                <div
                    className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-gray-800/60 overflow-y-auto"
                    style={{ background: "rgba(5,14,22,0.97)" }}
                >
                    <div
                        className="flex items-center justify-between px-4 py-3 border-b border-gray-800/40 cursor-pointer select-none"
                        onClick={() => setLegendOpen((v) => !v)}
                    >
                        <span className="text-blue-400 font-bold text-sm flex items-center gap-2">
                            🎨 Node Legend
                        </span>
                        {legendOpen ? (
                            <ChevronUp size={15} className="text-gray-600" />
                        ) : (
                            <ChevronDown size={15} className="text-gray-600" />
                        )}
                    </div>

                    {legendOpen && (
                        <div className="px-4 py-4 space-y-4">
                            {[
                                {
                                    color: "#f97316",
                                    label: "Hub Wallet",
                                    desc: "Holds tokens + heavily connected. Likely coordinator.",
                                    glow: true,
                                },
                                {
                                    color: "#60a5fa",
                                    label: "Connector",
                                    desc: "Multiple links across wallets, no large holdings.",
                                },
                                {
                                    color: "#60a5fa",
                                    label: "Participant",
                                    desc: "Received / sent tokens within the network.",
                                    dim: true,
                                },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="flex items-start gap-3"
                                >
                                    <div
                                        className="w-4 h-4 rounded-full shrink-0 mt-0.5"
                                        style={{
                                            background: item.color,
                                            opacity: item.dim ? 0.5 : 1,
                                            boxShadow: item.glow
                                                ? `0 0 10px ${item.color}`
                                                : "none",
                                        }}
                                    />
                                    <div>
                                        <p className="text-white font-bold text-xs">
                                            {item.label}
                                        </p>
                                        <p className="text-gray-500 text-[11px] leading-snug">
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            <div className="border-t border-gray-800 pt-4">
                                <p className="text-[10px] text-gray-500 font-black tracking-widest mb-3 uppercase">
                                    Cluster Colors
                                </p>
                                <div className="space-y-1.5">
                                    {clusters.slice(0, 8).map((cl, i) => (
                                        <div
                                            key={cl.net_id}
                                            className="flex items-center gap-2 cursor-pointer group"
                                            onMouseEnter={() =>
                                                setHoveredCluster(cl.idx)
                                            }
                                            onMouseLeave={() =>
                                                setHoveredCluster(null)
                                            }
                                        >
                                            <div
                                                className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125"
                                                style={{ background: cl.color }}
                                            />
                                            <span className="text-gray-400 text-[11px] font-mono truncate group-hover:text-white transition-colors">
                                                {cl.net_id.slice(0, 8)}…
                                            </span>
                                            <span className="text-gray-600 text-[10px] ml-auto shrink-0">
                                                {cl.nodeCount}w
                                            </span>
                                        </div>
                                    ))}
                                    {clusters.length > 8 && (
                                        <p className="text-gray-600 text-[10px]">
                                            +{clusters.length - 8} more clusters
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── CENTER: graph canvas ── */}
                <div
                    className="flex-1 relative overflow-hidden"
                    ref={containerRef}
                >
                    {/* Loading overlay */}
                    {isLoadingGraph && (
                        <div
                            className="absolute inset-0 flex flex-col items-center justify-center z-20"
                            style={{ background: "rgba(5,14,22,0.85)" }}
                        >
                            <Loader2
                                className="text-blue-400 animate-spin mb-3"
                                size={32}
                            />
                            <p className="text-gray-400 text-sm font-bold">
                                Fetching insider graph…
                            </p>
                            <p className="text-gray-600 text-xs mt-1 font-mono">
                                {report?.mint ? truncate(report.mint, 8) : ""}
                            </p>
                        </div>
                    )}

                    {/* Error overlay */}
                    {graphError && !isLoadingGraph && (
                        <div
                            className="absolute inset-0 flex flex-col items-center justify-center z-20"
                            style={{ background: "rgba(5,14,22,0.85)" }}
                        >
                            <AlertTriangle
                                className="text-red-400 mb-3"
                                size={32}
                            />
                            <p className="text-red-400 text-sm font-bold">
                                Failed to load graph
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                                {graphError}
                            </p>
                        </div>
                    )}

                    {/* Empty state */}
                    {!isLoadingGraph &&
                        !graphError &&
                        graphData &&
                        nodes.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                                <p className="text-gray-500 text-sm">
                                    No insider networks found
                                </p>
                            </div>
                        )}

                    <svg
                        ref={svgRef}
                        className="w-full h-full"
                        style={{ background: "transparent" }}
                    />

                    {/* Search bar — desktop only at top-right; on mobile rendered below toggles */}
                    <div className="hidden md:block absolute top-3 right-3 z-10">
                        <div className="flex items-center gap-2 bg-gray-900/90 border border-gray-700/60 rounded-xl px-3 py-2 backdrop-blur-sm">
                            <Search
                                size={13}
                                className="text-gray-500 shrink-0"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter address…"
                                className="bg-transparent text-white text-xs outline-none placeholder-gray-600 w-36"
                            />
                        </div>
                    </div>

                    {/* Mobile panel toggles + search stacked */}
                    <div className="md:hidden absolute top-3 left-3 right-3 z-10 flex flex-col gap-2">
                        <div className="flex gap-2">
                            {["legend", "info"].map((panel) => (
                                <button
                                    key={panel}
                                    onClick={() =>
                                        setMobilePanel((p) =>
                                            p === panel ? null : panel,
                                        )
                                    }
                                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all capitalize"
                                    style={{
                                        background:
                                            mobilePanel === panel
                                                ? "rgba(96,165,250,0.2)"
                                                : "rgba(5,14,22,0.85)",
                                        borderColor:
                                            mobilePanel === panel
                                                ? "#60a5fa"
                                                : "rgba(255,255,255,0.1)",
                                        color:
                                            mobilePanel === panel
                                                ? "#60a5fa"
                                                : "#9ca3af",
                                    }}
                                >
                                    {panel === "legend" ? "🎨" : "⠿"} {panel}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 bg-gray-900/90 border border-gray-700/60 rounded-xl px-3 py-2 backdrop-blur-sm">
                            <Search
                                size={13}
                                className="text-gray-500 shrink-0"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter address…"
                                className="bg-transparent text-white text-xs outline-none placeholder-gray-600 w-full"
                            />
                        </div>
                    </div>

                    {/* FPS */}
                    <div className="absolute bottom-3 left-3 text-gray-700 text-[10px] font-mono select-none">
                        {fps} fps · {nodes.length} nodes · {links.length} edges
                    </div>

                    {/* Selected node card */}
                    {selectedNode && (
                        <div
                            className="absolute bottom-6 left-3 right-3 md:left-auto md:right-auto md:bottom-6 md:left-6 md:w-80 rounded-2xl border border-gray-700/60 p-4 shadow-2xl z-20"
                            style={{ background: "rgba(8,18,28,0.98)" }}
                        >
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{
                                            background: selectedNode.color,
                                            boxShadow:
                                                selectedNode.role === "hub"
                                                    ? `0 0 8px ${selectedNode.color}`
                                                    : "none",
                                        }}
                                    />
                                    <span className="text-white font-bold text-sm capitalize">
                                        {selectedNode.role} Wallet
                                    </span>
                                </div>
                                <button
                                    onClick={() => setSelectedNode(null)}
                                    className="text-gray-500 hover:text-white"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Address row */}
                            <div className="bg-gray-900/60 rounded-xl p-3 mb-3 border border-gray-800">
                                <p className="text-[10px] text-gray-500 font-black tracking-widest mb-1.5 uppercase">
                                    Wallet Address
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="text-blue-400 font-mono text-[11px] flex-1 break-all leading-relaxed">
                                        {selectedNode.id}
                                    </span>
                                    <div className="flex flex-col gap-1.5 shrink-0">
                                        <button
                                            onClick={() =>
                                                copyAddress(selectedNode.id)
                                            }
                                            className="text-gray-500 hover:text-white transition-colors"
                                            title="Copy address"
                                        >
                                            {copied ? (
                                                <CheckCheck
                                                    size={13}
                                                    className="text-green-400"
                                                />
                                            ) : (
                                                <Copy size={13} />
                                            )}
                                        </button>
                                        <a
                                            href={`https://solscan.io/account/${selectedNode.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-gray-500 hover:text-blue-400 transition-colors"
                                            title="Open in Solscan"
                                        >
                                            <ExternalLink size={13} />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-gray-900/40 rounded-lg p-2.5 border border-gray-800/60">
                                    <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase mb-0.5">
                                        Holdings
                                    </p>
                                    <p className="text-white font-bold text-sm">
                                        {selectedNode.holdings > 0
                                            ? fmtTokens(selectedNode.holdings)
                                            : "0"}
                                    </p>
                                </div>
                                <div className="bg-gray-900/40 rounded-lg p-2.5 border border-gray-800/60">
                                    <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase mb-0.5">
                                        Connections
                                    </p>
                                    <p className="text-white font-bold text-sm">
                                        {selectedNode.inDegree +
                                            selectedNode.outDegree}
                                    </p>
                                </div>
                                <div className="bg-gray-900/40 rounded-lg p-2.5 border border-gray-800/60">
                                    <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase mb-0.5">
                                        In / Out
                                    </p>
                                    <p className="text-white font-bold text-sm">
                                        {selectedNode.inDegree} /{" "}
                                        {selectedNode.outDegree}
                                    </p>
                                </div>
                                <div className="bg-gray-900/40 rounded-lg p-2.5 border border-gray-800/60">
                                    <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase mb-0.5">
                                        Clusters
                                    </p>
                                    <p className="text-white font-bold text-sm">
                                        {selectedNode.clusters.length}
                                    </p>
                                </div>
                            </div>

                            {/* Cluster badges */}
                            {selectedNode.clusters.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedNode.clusters.map((ci) => (
                                        <span
                                            key={ci}
                                            className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                                            style={{
                                                background:
                                                    clusterColor(ci) + "25",
                                                color: clusterColor(ci),
                                                border: `1px solid ${clusterColor(ci)}40`,
                                            }}
                                        >
                                            Cluster {ci + 1}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── RIGHT sidebar: Graph Info ── */}
                <div
                    className="hidden md:flex md:flex-col w-64 shrink-0 border-l border-gray-800/60 overflow-y-auto"
                    style={{ background: "rgba(5,14,22,0.97)" }}
                >
                    <div
                        className="flex items-center justify-between px-4 py-3 border-b border-gray-800/40 cursor-pointer select-none"
                        onClick={() => setInfoOpen((v) => !v)}
                    >
                        <span className="text-blue-400 font-bold text-sm flex items-center gap-2">
                            ⠿ Graph Info
                        </span>
                        {infoOpen ? (
                            <ChevronUp size={15} className="text-gray-600" />
                        ) : (
                            <ChevronDown size={15} className="text-gray-600" />
                        )}
                    </div>

                    {infoOpen && (
                        <div className="px-4 py-4 space-y-4">
                            {/* Stats */}
                            {[
                                {
                                    icon: "👥",
                                    label: "WALLETS",
                                    value: totalAccounts,
                                    bg: "#312e81",
                                },
                                {
                                    icon: "🔗",
                                    label: "CONNECTIONS",
                                    value: totalLinks,
                                    bg: "#831843",
                                },
                                {
                                    icon: "🔀",
                                    label: "CLUSTERS",
                                    value: clusters.length,
                                    bg: "#0c4a6e",
                                },
                                {
                                    icon: "⭐",
                                    label: "HUB WALLETS",
                                    value: hubNodes.length,
                                    bg: "#713f12",
                                },
                            ].map((s) => (
                                <div
                                    key={s.label}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-800/50"
                                    style={{
                                        background: "rgba(255,255,255,0.025)",
                                    }}
                                >
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                                        style={{ background: s.bg + "90" }}
                                    >
                                        {s.icon}
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-[10px] font-black tracking-widest">
                                            {s.label}
                                        </p>
                                        <p className="text-white font-black text-xl leading-tight">
                                            {isLoadingGraph ? "…" : s.value}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {/* Hub wallets list */}
                            {hubNodes.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2 pt-2 border-t border-gray-800">
                                        <Star
                                            size={13}
                                            className="text-yellow-400 fill-yellow-400"
                                        />
                                        <p className="text-white font-bold text-xs">
                                            Hub Wallets
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        {hubNodes.map((n) => (
                                            <div
                                                key={n.id}
                                                className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-800/50 hover:border-gray-700 transition-colors cursor-pointer group"
                                                style={{
                                                    background:
                                                        "rgba(255,255,255,0.02)",
                                                }}
                                                onClick={() =>
                                                    setSelectedNode(n)
                                                }
                                            >
                                                <div
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{
                                                        background: n.color,
                                                        boxShadow: `0 0 5px ${n.color}`,
                                                    }}
                                                />
                                                <span className="text-blue-400 font-mono text-[11px] flex-1 truncate group-hover:text-blue-300">
                                                    {truncate(n.id)}
                                                </span>
                                                <a
                                                    href={`https://solscan.io/account/${n.id}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                    className="text-gray-600 hover:text-blue-400 shrink-0"
                                                >
                                                    <ExternalLink size={11} />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* All clusters */}
                            <div>
                                <p className="text-gray-500 font-black text-[10px] uppercase tracking-widest mb-2 pt-2 border-t border-gray-800">
                                    All Clusters
                                </p>
                                <div className="space-y-1.5">
                                    {clusters.map((cl) => (
                                        <div
                                            key={cl.net_id}
                                            className="flex items-center justify-between p-2.5 rounded-lg border border-gray-800/40 hover:border-gray-700 transition-colors cursor-pointer group"
                                            style={{
                                                background:
                                                    "rgba(255,255,255,0.02)",
                                            }}
                                            onMouseEnter={() =>
                                                setHoveredCluster(cl.idx)
                                            }
                                            onMouseLeave={() =>
                                                setHoveredCluster(null)
                                            }
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div
                                                    className="w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-150"
                                                    style={{
                                                        background: cl.color,
                                                    }}
                                                />
                                                <span className="text-gray-400 font-mono text-[10px] truncate">
                                                    {cl.net_id.slice(0, 8)}…
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                <span className="text-gray-500 text-[10px]">
                                                    {cl.nodeCount}w
                                                </span>
                                                <span className="text-gray-600 text-[10px]">
                                                    ·
                                                </span>
                                                <span className="text-gray-500 text-[10px]">
                                                    {cl.linkCount}e
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* RugCheck summary from report */}
                            {networks.length > 0 && (
                                <div>
                                    <p className="text-gray-500 font-black text-[10px] uppercase tracking-widest mb-2 pt-2 border-t border-gray-800">
                                        Risk Summary
                                    </p>
                                    <div className="space-y-1.5">
                                        {networks.map((net, idx) => (
                                            <div
                                                key={net.id}
                                                className="flex items-center justify-between p-2 rounded-lg"
                                                style={{
                                                    background:
                                                        "rgba(255,255,255,0.02)",
                                                }}
                                            >
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <div
                                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                                        style={{
                                                            background:
                                                                clusterColor(
                                                                    idx,
                                                                ),
                                                        }}
                                                    />
                                                    <span className="text-gray-500 font-mono text-[10px] truncate">
                                                        {net.id}
                                                    </span>
                                                </div>
                                                <span className="text-red-400 text-[10px] font-bold shrink-0 ml-1">
                                                    {net.pct}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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
                    background: "rgba(5,14,22,0.99)",
                    maxHeight: "60vh",
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
                    <span className="text-blue-400 font-bold text-sm">
                        🎨 Node Legend
                    </span>
                    <ChevronDown size={15} className="text-gray-500" />
                </div>
                <div className="px-4 py-4 space-y-4">
                    {[
                        {
                            color: "#f97316",
                            label: "Hub Wallet",
                            desc: "High holdings + many connections",
                            glow: true,
                        },
                        {
                            color: "#60a5fa",
                            label: "Connector",
                            desc: "Cross-cluster bridge node",
                        },
                        {
                            color: "#60a5fa",
                            label: "Participant",
                            desc: "Regular network member",
                            dim: true,
                        },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="flex items-start gap-3"
                        >
                            <div
                                className="w-4 h-4 rounded-full shrink-0 mt-0.5"
                                style={{
                                    background: item.color,
                                    opacity: item.dim ? 0.5 : 1,
                                    boxShadow: item.glow
                                        ? `0 0 10px ${item.color}`
                                        : "none",
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
                    <div className="border-t border-gray-800 pt-3">
                        <p className="text-[10px] text-gray-500 font-black tracking-widest mb-2 uppercase">
                            Cluster Colors
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {clusters.map((cl) => (
                                <div
                                    key={cl.net_id}
                                    className="flex items-center gap-2"
                                >
                                    <div
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ background: cl.color }}
                                    />
                                    <span className="text-gray-400 text-[11px] font-mono truncate">
                                        {cl.net_id.slice(0, 8)}…
                                    </span>
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
                    background: "rgba(5,14,22,0.99)",
                    maxHeight: "60vh",
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
                    <span className="text-blue-400 font-bold text-sm">
                        ⠿ Graph Info
                    </span>
                    <ChevronDown size={15} className="text-gray-500" />
                </div>
                <div className="px-4 py-4 space-y-3">
                    {[
                        { icon: "👥", label: "WALLETS", value: totalAccounts },
                        { icon: "🔗", label: "CONNECTIONS", value: totalLinks },
                        {
                            icon: "🔀",
                            label: "CLUSTERS",
                            value: clusters.length,
                        },
                        {
                            icon: "⭐",
                            label: "HUB WALLETS",
                            value: hubNodes.length,
                        },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className="flex items-center justify-between p-3 rounded-xl border border-gray-800/50"
                            style={{ background: "rgba(255,255,255,0.025)" }}
                        >
                            <span className="text-gray-400 text-xs font-bold flex items-center gap-2">
                                {s.icon} {s.label}
                            </span>
                            <span className="text-white font-black text-lg">
                                {isLoadingGraph ? "…" : s.value}
                            </span>
                        </div>
                    ))}
                    {hubNodes.length > 0 && (
                        <div>
                            <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase mb-2 pt-1">
                                Hub Wallets
                            </p>
                            {hubNodes.map((n) => (
                                <div
                                    key={n.id}
                                    className="flex items-center gap-2 p-2 rounded-lg mb-1"
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                    }}
                                >
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ background: n.color }}
                                    />
                                    <span className="text-blue-400 font-mono text-[11px] flex-1 truncate">
                                        {truncate(n.id)}
                                    </span>
                                    <a
                                        href={`https://solscan.io/account/${n.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-gray-600 hover:text-blue-400"
                                    >
                                        <ExternalLink size={11} />
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InsiderNetworkModal;
