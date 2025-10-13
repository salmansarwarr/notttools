import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import constants from "../constants";
import Loading from "../components/Loading";
import {
  ArrowLeft,
  Sparkles,
  ExternalLink,
  Twitter,
  Globe,
  Send,
} from "lucide-react";
import Comments from "../components/Comments";

const SingleProject = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Fetch single project
  const {
    data: project,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data } = await axios.get(
        `${constants.backend_url}/items/projects/${id}`,
        {
          params: {
            fields: [
              "id",
              "name",
              "symbol",
              "contract_address",
              "logo",
              "banner_image",
              "description",
              "launch_tx",
              "chain",
              "date_created",
              "website",
              "twitter",
              "telegram",
              "featured",
              "user.id",
              "user.first_name",
              "user.avatar",
            ].join(","),
          },
        }
      );
      return data.data;
    },
  });

  if (isLoading) return <Loading darkMode={true} />;

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A151E] via-[#0D1B2A] to-[#0A151E] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Project Not Found
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            The project you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate("/projects")}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A151E] via-[#0D1B2A] to-[#0A151E] pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/projects")}
            className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 bg-gray-800/50 hover:bg-gray-700/50 px-4 py-2 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">Back to Projects</span>
          </button>
        </div>

        {/* Featured Badge - Only show if project is featured */}
        {project.featured && (
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-2xl px-6 py-3">
              <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
              <span className="text-yellow-300 font-semibold">
                Featured Project
              </span>
            </div>
          </div>
        )}

        {/* Project Banner */}
        {project.banner_image && (
          <div className="relative mb-8 rounded-2xl overflow-hidden">
            <div className="aspect-[3/1] w-full">
              <img
                src={`${constants.backend_url}/assets/${project.banner_image}`}
                alt={`${project.name} banner`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            </div>
          </div>
        )}

        {/* Project Header */}
        <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl p-8 mb-8 border border-gray-700">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              {project.logo ? (
                <img
                  src={`${constants.backend_url}/assets/${project.logo}`}
                  alt={project.name}
                  className="w-24 h-24 rounded-2xl border-2 border-gray-600"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center border-2 border-gray-600">
                  <span className="text-white text-2xl font-bold">
                    {project.name?.charAt(0)?.toUpperCase() || "T"}
                  </span>
                </div>
              )}
            </div>

            {/* Project Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {project.name || "Unnamed Project"}
                  </h1>
                  <div className="flex items-center gap-4">
                    <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
                      ${project.symbol?.toUpperCase() || "TKN"}
                    </span>
                    <span className="bg-purple-600/20 text-purple-400 px-3 py-1 rounded-full text-sm font-medium">
                      {project.chain?.toUpperCase() || "SOLANA"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {project.description && (
                <p className="text-gray-300 text-lg leading-relaxed mb-6">
                  {project.description}
                </p>
              )}

              {/* Social Links */}
              <div className="flex flex-wrap gap-3">
                {project.website && (
                  <a
                    href={project.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white px-4 py-2 rounded-xl transition-all duration-300"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {project.twitter && (
                  <a
                    href={project.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white px-4 py-2 rounded-xl transition-all duration-300"
                  >
                    <Twitter className="w-4 h-4" />
                    <span>Twitter</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {project.telegram && (
                  <a
                    href={project.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white px-4 py-2 rounded-xl transition-all duration-300"
                  >
                    <Send className="w-4 h-4" />
                    <span>Telegram</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-600">
            <div className="text-center">
              <h3 className="text-gray-400 text-sm font-medium mb-2">
                Contract Address
              </h3>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-white font-mono text-sm break-all">
                  {project.contract_address || "N/A"}
                </p>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-gray-400 text-sm font-medium mb-2">
                Creator
              </h3>
              <div className="flex items-center justify-center gap-2">
                {project.user?.avatar ? (
                  <img
                    src={`${constants.backend_url}/assets/${project.user.avatar}`}
                    alt={project.user.first_name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {project.user?.first_name?.charAt(0)?.toUpperCase() ||
                        "U"}
                    </span>
                  </div>
                )}
                <span className="text-white font-medium">
                  {project.user?.first_name || "Unknown"}
                </span>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-gray-400 text-sm font-medium mb-2">
                Launch Date
              </h3>
              <p className="text-white font-medium">
                {project.date_created
                  ? new Date(project.date_created).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-gradient-to-br from-[#192630] to-[#1a2332] rounded-2xl border border-gray-700">
          <Comments projectId={project.id} />
        </div>
      </div>
    </div>
  );
};

export default SingleProject;
