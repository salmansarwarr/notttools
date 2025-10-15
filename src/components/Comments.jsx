import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUnifiedWallet } from "../hooks/useUnifiedWallet";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useGlobalState } from "../hooks/useGlobalState";
import axios from "axios";
import constants from "../constants";
import {
  Send,
  MessageCircle,
  LogIn,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const Comments = ({ projectId }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [newComment, setNewComment] = useState("");
  const [allComments, setAllComments] = useState([]);
  const [commentError, setCommentError] = useState(null);
  const [commentSuccess, setCommentSuccess] = useState(false);
  const commentsPerPage = 10;
  const { connected } = useUnifiedWallet();
  const { globalState } = useGlobalState();
  const queryClient = useQueryClient();

  const isLoggedIn = connected && globalState.authToken;
  const isConnectedButNotLoggedIn = connected && !globalState.authToken;

  // Fetch comments with pagination
  const {
    data: commentsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["comments", projectId, currentPage],
    queryFn: async () => {
      const { data } = await axios.get(
        `${constants.backend_url}/items/comments`,
        {
          params: {
            fields: [
              "id",
              "comment",
              "date_created",
              "user_created.id",
              "user_created.first_name",
              "user_created.avatar",
            ].join(","),
            filter: JSON.stringify({ project_id: { _eq: projectId } }),
            sort: "-date_created",
            limit: commentsPerPage,
            offset: (currentPage - 1) * commentsPerPage,
            meta: "filter_count",
          },
        }
      );
      return data;
    },
  });

  // Update allComments when new data comes
  useEffect(() => {
    if (commentsData?.data) {
      if (currentPage === 1) {
        setAllComments(commentsData.data);
      } else {
        setAllComments((prev) => [...prev, ...commentsData.data]);
      }
    }
  }, [commentsData, currentPage]);

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (commentText) => {
      const { data } = await axios.post(
        `${constants.backend_url}/items/comments`,
        {
          comment: commentText,
          project_id: projectId,
        },
        {
          headers: {
            Authorization: `Bearer ${globalState.authToken}`,
          },
        }
      );
      return data.data;
    },
    onSuccess: () => {
      // Reset to first page and refresh
      setCurrentPage(1);
      setAllComments([]);
      queryClient.invalidateQueries(["comments", projectId]);
      setNewComment("");
      setCommentError(null);
      setCommentSuccess(true);
      // Hide success message after 5 seconds
      setTimeout(() => setCommentSuccess(false), 5000);
    },
    onError: (error) => {
      console.error("Add comment error:", error);
      setCommentError("Failed to add comment. Please try again.");
      setCommentSuccess(false);
    },
  });

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      setCommentError("Please enter a comment");
      return;
    }
    setCommentError(null);
    addCommentMutation.mutate(newComment.trim());
  };

  const handleLogin = () => {
    // Login logic - you might want to trigger login modal or redirect
    console.log("Login needed");
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInMonths = Math.floor(diffInDays / 30);

    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 30) return `${diffInDays}d ago`;
    if (diffInMonths < 12) return `${diffInMonths}mo ago`;
    return date.toLocaleDateString();
  };

  const hasMoreComments =
    commentsData?.meta?.filter_count > currentPage * commentsPerPage;

  if (isLoading && currentPage === 1) {
    return (
      <div className="bg-[#192630] rounded-2xl p-8 border border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-bold text-white">Comments</h3>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-2">Loading comments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#192630] rounded-2xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-gray-800/50 to-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Discussion</h3>
            <p className="text-gray-400 text-sm">
              {commentsData?.meta?.filter_count || 0} comments
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Comments List */}
        {error ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-red-400 text-lg font-medium">
              Failed to load comments
            </p>
            <p className="text-gray-500 text-sm mt-1">Please try again later</p>
          </div>
        ) : !allComments.length ? (
          <div className="text-center py-16 mb-8">
            <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">
              No comments yet
            </h4>
            <p className="text-gray-400 text-lg">
              Be the first to share your thoughts!
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Start a conversation about this project
            </p>
          </div>
        ) : (
          <div className="space-y-6 mb-8">
            {allComments.map((comment, index) => (
              <div
                key={comment.id}
                className={`group hover:bg-gray-800/30 rounded-xl p-4 transition-all duration-200 ${
                  index !== allComments.length - 1
                    ? "border-b border-gray-700/50"
                    : ""
                }`}
              >
                {/* Comment Header */}
                <div className="flex items-start gap-4">
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    {comment.user_created?.avatar ? (
                      <img
                        src={`${constants.backend_url}/assets/${comment.user_created.avatar}`}
                        alt={comment.user_created.first_name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-700 group-hover:ring-gray-600 transition-all"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-gray-700 group-hover:ring-gray-600 transition-all">
                        <span className="text-white text-lg font-bold">
                          {comment.user_created?.first_name
                            ?.charAt(0)
                            ?.toUpperCase() || "U"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Comment Content */}
                  <div className="flex-1 min-w-0">
                    {/* User Info and Date */}
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white font-semibold">
                        {comment.user_created?.first_name || "Anonymous"}
                      </h4>
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <span>•</span>
                        <span>{getTimeAgo(comment.date_created)}</span>
                      </div>
                    </div>

                    {/* Comment Text */}
                    <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {comment.comment}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {hasMoreComments && (
              <div className="text-center pt-6 border-t border-gray-700">
                <button
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={isLoading}
                  className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700/50 text-white px-8 py-3 rounded-lg transition-colors disabled:cursor-not-allowed font-medium"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Loading...
                    </div>
                  ) : (
                    "Load More Comments"
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add Comment Section - Always at the bottom */}
        {isLoggedIn ? (
          <div className="border-t border-gray-700 pt-6">
            {/* Success Message */}
            {commentSuccess && (
              <div className="mb-4 flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-3 text-green-400">
                <CheckCircle size={20} />
                <span className="font-medium">
                  Comment posted successfully! 🎉
                </span>
              </div>
            )}

            {/* Error Message */}
            {commentError && (
              <div className="mb-4 flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-red-400">
                <AlertCircle size={20} />
                <span className="font-medium">{commentError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitComment} className="space-y-4">
              <div className="relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts about this project..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  disabled={addCommentMutation.isPending}
                />
                <div className="absolute bottom-3 right-3 text-gray-500 text-sm">
                  {newComment.length}/500
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <p className="text-gray-400 text-sm order-2 sm:order-1">
                  Be respectful and constructive in your comments
                </p>
                <button
                  type="submit"
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-6 py-2 rounded-lg transition-colors disabled:cursor-not-allowed order-1 sm:order-2"
                >
                  {addCommentMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {addCommentMutation.isPending ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </form>
          </div>
        ) : isConnectedButNotLoggedIn ? (
          <div className="border-t border-gray-700 pt-6">
            <div className="p-6 bg-gray-800/30 rounded-xl border border-gray-600 text-center">
              <LogIn className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">
                Sign In to Comment
              </h4>
              <p className="text-gray-400 mb-4">
                Your wallet is connected, but you need to sign in to participate
                in discussions
              </p>
              <button
                onClick={handleLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                Sign In with Wallet
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-700 pt-6">
            <div className="p-6 bg-gray-800/30 rounded-xl border border-gray-600 text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">
                Join the Discussion
              </h4>
              <p className="text-gray-400 mb-4">
                Connect your wallet to share your thoughts and engage with the
                community
              </p>
              <WalletMultiButton className="!bg-blue-600 !hover:bg-blue-700" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Comments;
