import React from "react";
import { ExternalLink, Globe, Twitter, Copy } from "lucide-react";
import { toast } from "react-toastify";
import constants from "../constants";

const ProjectCard = ({ project }) => {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const socialLinks = [
    { url: project.website, icon: Globe, label: "Website" },
    { url: project.twitter, icon: Twitter, label: "Twitter" },
    {
      url: project.telegram,
      icon: () => (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
      label: "Telegram",
    },
  ].filter((link) => link.url);

  return (
    <div className="bg-[#192630] rounded-2xl p-6 border border-gray-700">
      {/* Project Info */}
      <div className="text-center mb-6">
        {project.logo ? (
          <img
            src={`${constants.backend_url}/assets/${project.logo}`}
            alt={project.name}
            className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4"
          />
        ) : (
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">
              {project.name?.charAt(0)?.toUpperCase() || "?"}
            </span>
          </div>
        )}

        <h3 className="text-xl font-bold text-white mb-2">
          {project.name || "Unnamed Project"}
        </h3>

        <p className="text-gray-400 text-sm leading-relaxed">
          {project.description || "No description available for this project."}
        </p>
      </div>

      {/* Contract Address */}
      {project.contract_address && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Contract Address
          </label>
          <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-3">
            <code className="flex-1 text-white font-mono text-sm">
              {formatAddress(project.contract_address)}
            </code>
            <button
              onClick={() => copyToClipboard(project.contract_address)}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
            <a
              href={`https://solscan.io/token/${project.contract_address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Social Links */}
      {socialLinks.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-3">
            Links
          </label>
          <div className="space-y-2">
            {socialLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors group"
                >
                  <Icon className="w-4 h-4 text-gray-400 group-hover:text-white" />
                  <span className="text-gray-300 group-hover:text-white text-sm">
                    {link.label}
                  </span>
                  <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-gray-400 ml-auto" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCard;
