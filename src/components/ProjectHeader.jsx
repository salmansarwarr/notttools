import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import constants from "../constants";
import {
  MessageCircle,
  Calendar,
  User,
  ExternalLink,
  Star,
  Sparkles,
  TrendingUp,
  Globe,
} from "lucide-react";

const ProjectHeader = ({ project }) => {
  // Get comments count
  const { data: commentsCount = 0 } = useQuery({
    queryKey: ["comments-count", project.id],
    queryFn: async () => {
      const { data } = await axios.get(
        `${constants.backend_url}/items/comments`,
        {
          params: {
            filter: JSON.stringify({ project_id: { _eq: project.id } }),
            aggregate: JSON.stringify({ count: "*" }),
          },
        }
      );
      return data.data[0]?.count || 0;
    },
  });

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "1 day ago";
    if (diffInDays < 30) return `${diffInDays} days ago`;
    if (diffInMonths === 1) return "1 month ago";
    if (diffInMonths < 12) return `${diffInMonths} months ago`;
    if (diffInYears === 1) return "1 year ago";
    return `${diffInYears} years ago`;
  };

  return (
    <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 border border-gray-700 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-full blur-3xl"></div>

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Project Logo */}
          <div className="flex-shrink-0">
            <div className="relative">
              {project.logo ? (
                <img
                  src={`${constants.backend_url}/assets/${project.logo}`}
                  alt={project.name}
                  className="w-24 h-24 rounded-2xl object-cover ring-4 ring-blue-500/30"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center ring-4 ring-blue-500/30">
                  <span className="text-white text-3xl font-bold">
                    {project.name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
              )}

              {/* Status indicator */}
              <div className="absolute -top-2 -right-2 bg-green-500 w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#192630]">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Project Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">
                    {project.name || "Unnamed Project"}
                  </h1>
                  <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                    <Star className="w-4 h-4" />
                    <span className="text-sm font-medium">Featured</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <span className="text-xl text-blue-400 font-bold">
                    ${project.symbol?.toUpperCase() || "TKN"}
                  </span>
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm px-4 py-2 rounded-full font-medium">
                    {project.chain?.toUpperCase() || "SOLANA"}
                  </span>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2">
                <button className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors">
                  <TrendingUp className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
                <button className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors">
                  <ExternalLink className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
              </div>
            </div>

            {/* Description */}
            {project.description && (
              <p className="text-gray-300 mb-6 leading-relaxed">
                {project.description}
              </p>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white mb-1">$0.00</div>
                <div className="text-gray-400 text-sm">Price</div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white mb-1">0%</div>
                <div className="text-gray-400 text-sm">24h Change</div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white mb-1">$0</div>
                <div className="text-gray-400 text-sm">Volume</div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white mb-1">$0</div>
                <div className="text-gray-400 text-sm">Market Cap</div>
              </div>
            </div>

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {/* Creator Info */}
              <div className="flex items-center gap-2 bg-gray-800/30 rounded-lg px-3 py-2">
                <User className="w-4 h-4 text-gray-400" />
                {project.user?.avatar ? (
                  <img
                    src={`${constants.backend_url}/assets/${project.user.avatar}`}
                    alt={project.user.first_name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {project.user?.first_name?.charAt(0)?.toUpperCase() ||
                        "U"}
                    </span>
                  </div>
                )}
                <span className="text-gray-300 font-medium">
                  {project.user?.first_name || "Unknown"}
                </span>
              </div>

              {/* Date Created */}
              <div className="flex items-center gap-2 bg-gray-800/30 rounded-lg px-3 py-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">
                  {getTimeAgo(project.date_created)}
                </span>
              </div>

              {/* Comments Count */}
              <div className="flex items-center gap-2 bg-gray-800/30 rounded-lg px-3 py-2">
                <MessageCircle className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">{commentsCount} comments</span>
              </div>

              {/* Live indicator */}
              <div className="flex items-center gap-2 bg-green-600/20 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-medium">Live Trading</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;
