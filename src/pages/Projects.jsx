import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import constants from "../constants";
import Loading from "../components/Loading";
import {
  Search,
  Filter,
  TrendingUp,
  Star,
  Users,
  Calendar,
  ExternalLink,
  Sparkles,
  Zap,
  Trophy,
  Globe,
  Twitter,
  MessageCircle,
  Copy,
  CheckCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const Projects = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date_created");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const itemsPerPage = 12;
  const navigate = useNavigate();
  const sliderRef = useRef(null);

  // Fetch featured projects
  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ["featured-projects"],
    queryFn: async () => {
      const { data } = await axios.get(
        `${constants.backend_url}/items/projects`,
        {
          params: {
            fields: [
              "id",
              "name",
              "symbol",
              "contract_address",
              "logo",
              "description",
              "chain",
              "date_created",
              "website",
              "twitter",
              "telegram",
              "user.id",
              "user.first_name",
              "user.avatar",
              "featured",
            ].join(","),
            filter: JSON.stringify({ featured: { _eq: true } }),
            sort: "-date_created",
          },
        }
      );
      return data;
    },
  });

  // Fetch all projects
  const {
    data: projectsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["projects", searchTerm, sortBy, currentPage],
    queryFn: async () => {
      const { data } = await axios.get(
        `${constants.backend_url}/items/projects`,
        {
          params: {
            fields: [
              "id",
              "name",
              "symbol",
              "contract_address",
              "logo",
              "description",
              "chain",
              "date_created",
              "website",
              "twitter",
              "telegram",
              "user.id",
              "user.first_name",
              "user.avatar",
              "featured",
            ].join(","),
            search: searchTerm,
            sort: sortBy === "date_created" ? "-date_created" : sortBy,
            limit: itemsPerPage,
            offset: (currentPage - 1) * itemsPerPage,
            meta: "filter_count",
          },
        }
      );
      return data;
    },
  });

  const projects = projectsData?.data || [];
  const totalCount = projectsData?.meta?.filter_count || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Featured projects from separate query
  const featuredProjects = featuredData?.data || [];

  // Auto-play slider
  useEffect(() => {
    if (!isAutoPlaying || featuredProjects.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredProjects.length);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, featuredProjects.length]);

  // Slider controls
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredProjects.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + featuredProjects.length) % featuredProjects.length
    );
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const copyToClipboard = (address) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "1 day ago";
    if (diffInDays < 30) return `${diffInDays} days ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  if (isLoading && featuredLoading) return <Loading darkMode={true} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A151E] via-[#0D1B2A] to-[#0A151E] pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl px-6 py-3 mb-8">
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            <span className="text-purple-300 font-semibold">Live Projects</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Explore
            </span>
            <br />
            <span className="text-white">Web3 Projects</span>
          </h1>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-12">
            Discover innovative blockchain projects, trade tokens, and join
            thriving communities built on our platform.
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-8 mb-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {totalCount}
              </div>
              <div className="text-gray-400">Total Projects</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">24/7</div>
              <div className="text-gray-400">Active Trading</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">100%</div>
              <div className="text-gray-400">Decentralized</div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-gradient-to-r from-[#192630] to-[#1a2332] rounded-2xl p-6 border border-gray-700 mb-12">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search projects by name or symbol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Sort Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-10 pr-8 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option value="date_created">Latest First</option>
                <option value="name">Name A-Z</option>
                <option value="-name">Name Z-A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Featured Projects Slider - Temporarily commented out */}
        {/* {featuredProjects.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h2 className="text-3xl font-bold text-white">
                  Featured Projects
                </h2>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  {isAutoPlaying ? (
                    <div className="w-4 h-4 flex items-center justify-center">
                      <div className="w-1 h-3 bg-gray-400 mr-1"></div>
                      <div className="w-1 h-3 bg-gray-400"></div>
                    </div>
                  ) : (
                    <div className="w-4 h-4 flex items-center justify-center">
                      <div className="w-0 h-0 border-l-[6px] border-l-gray-400 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent"></div>
                    </div>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={prevSlide}
                    className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl">
              <div
                ref={sliderRef}
                className="flex transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translateX(-${currentSlide * 100}%)`,
                }}
                onMouseEnter={() => setIsAutoPlaying(false)}
                onMouseLeave={() => setIsAutoPlaying(true)}
              >
                {featuredProjects.map((project, index) => (
                  <div key={project.id} className="w-full flex-shrink-0 px-4">
                    <div className="group relative bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700 hover:border-purple-500/50 transition-all duration-300 cursor-pointer overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      <div className="absolute top-6 right-6 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Featured
                      </div>

                      <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                        <div>
                          <div className="flex items-center gap-6 mb-6">
                            {project.logo ? (
                              <img
                                src={`${constants.backend_url}/assets/${project.logo}`}
                                alt={project.name}
                                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-purple-500/30 group-hover:ring-purple-500/60 transition-all"
                              />
                            ) : (
                              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center ring-4 ring-purple-500/30 group-hover:ring-purple-500/60 transition-all">
                                <span className="text-white text-2xl font-bold">
                                  {project.name?.charAt(0)?.toUpperCase() ||
                                    "?"}
                                </span>
                              </div>
                            )}
                            <div>
                              <h3 className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors mb-2">
                                {project.name || "Unnamed Project"}
                              </h3>
                              <p className="text-purple-400 font-medium text-lg">
                                ${project.symbol?.toUpperCase() || "TKN"}
                              </p>
                            </div>
                          </div>

                          <p className="text-gray-300 mb-6 leading-relaxed">
                            {project.description ||
                              "No description available for this project."}
                          </p>

                          <div className="flex items-center gap-6 text-sm text-gray-400 mb-6">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {getTimeAgo(project.date_created)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {project.user?.first_name || "Unknown"}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="bg-blue-600/20 text-blue-400 text-sm font-medium px-3 py-1 rounded-full">
                              {project.chain?.toUpperCase() || "SOLANA"}
                            </span>
                            <button
                              onClick={() => navigate(`/project/${project.id}`)}
                              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                            >
                              View Project
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-2xl p-6 border border-purple-500/30">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-white mb-1">
                                  $0.00
                                </div>
                                <div className="text-gray-400 text-sm">
                                  Price
                                </div>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-green-400 mb-1">
                                  +0%
                                </div>
                                <div className="text-gray-400 text-sm">24h</div>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-white mb-1">
                                  $0
                                </div>
                                <div className="text-gray-400 text-sm">
                                  Volume
                                </div>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-white mb-1">
                                  $0
                                </div>
                                <div className="text-gray-400 text-sm">
                                  MCap
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center mt-6 gap-2">
              {featuredProjects.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? "bg-purple-500 w-8"
                      : "bg-gray-600 hover:bg-gray-500"
                  }`}
                />
              ))}
            </div>
          </div>
        )} */}

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="w-6 h-6 text-blue-400" />
            <h2 className="text-3xl font-bold text-white">All Projects</h2>
          </div>

          {error ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ExternalLink className="w-10 h-10 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Failed to Load Projects
              </h3>
              <p className="text-gray-400">Please try again later</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                No Projects Found
              </h3>
              <p className="text-gray-400">
                Try adjusting your search terms or filters
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:transform hover:scale-105 cursor-pointer relative"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  {/* Featured badge - show only if project is featured */}
                  {project.featured && (
                    <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Featured
                    </div>
                  )}

                  {/* Rest of the project card remains the same */}
                  <div className="flex items-center gap-4 mb-4">
                    {project.logo ? (
                      <img
                        src={`${constants.backend_url}/assets/${project.logo}`}
                        alt={project.name}
                        className="w-14 h-14 rounded-xl object-cover ring-2 ring-gray-600 group-hover:ring-gray-500 transition-all"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center ring-2 ring-gray-600 group-hover:ring-gray-500 transition-all">
                        <span className="text-white text-lg font-bold">
                          {project.name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                        {project.name || "Unnamed Project"}
                      </h3>
                      <p className="text-blue-400 font-medium">
                        ${project.symbol?.toUpperCase() || "TKN"}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {project.description ||
                      "No description available for this project."}
                  </p>

                  {/* Contract Address */}
                  {project.contract_address && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-2">
                        <code className="flex-1 text-white font-mono text-xs">
                          {formatAddress(project.contract_address)}
                        </code>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(project.contract_address);
                          }}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          {copiedAddress === project.contract_address ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Social Links */}
                  <div className="flex items-center gap-3 mb-4">
                    {project.website && (
                      <a
                        href={project.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                      >
                        <Globe className="w-4 h-4 text-gray-400 hover:text-white" />
                      </a>
                    )}
                    {project.twitter && (
                      <a
                        href={project.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                      >
                        <Twitter className="w-4 h-4 text-gray-400 hover:text-blue-400" />
                      </a>
                    )}
                    {project.telegram && (
                      <a
                        href={project.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                      >
                        <MessageCircle className="w-4 h-4 text-gray-400 hover:text-blue-400" />
                      </a>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {getTimeAgo(project.date_created)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Users className="w-4 h-4" />
                      {project.user?.first_name || "Unknown"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  currentPage === page
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
