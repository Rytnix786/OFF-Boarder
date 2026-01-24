"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Avatar,
  TextField,
  Button,
  Divider,
  Chip,
  CircularProgress,
  IconButton,
  alpha,
  useTheme,
  Paper,
} from "@mui/material";
import { stitchTokens } from "@/theme/tokens";
import { getTaskComments, createTaskComment } from "@/lib/actions/comments";
import { formatDistanceToNow } from "date-fns";
import SendIcon from "@mui/icons-material/Send";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";

const t = stitchTokens;

interface Comment {
  id: string;
  content: string;
  authorType: "ADMIN" | "ORG_USER" | "EMPLOYEE";
  createdAt: Date;
  user?: {
    name: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
  employee?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadComments() {
    setLoading(true);
    setError(null);
    try {
      const data = await getTaskComments(taskId);
      setComments(data as any);
    } catch (err: any) {
      console.error("Failed to load comments:", err);
      setError(err.message || "Failed to load comments. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComments();
  }, [taskId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const result = await createTaskComment(taskId, newComment);
      if (result.success && result.comment) {
        setComments([...comments, result.comment as any]);
        setNewComment("");
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const getAuthorDisplay = (comment: Comment) => {
    if (comment.authorType === "EMPLOYEE" && comment.employee) {
      return {
        name: `${comment.employee.firstName} ${comment.employee.lastName}`,
        initials: `${comment.employee.firstName[0]}${comment.employee.lastName[0]}`,
        badge: "Employee",
        color: t.colors.status.success,
        bg: t.colors.status.successBg,
        border: t.colors.status.successBorder,
      };
    }
    
    const name = comment.user?.name || comment.user?.email || "Unknown User";
    return {
      name,
      initials: name[0].toUpperCase(),
      badge: comment.authorType === "ADMIN" ? "Admin" : "Team",
      color: comment.authorType === "ADMIN" ? t.colors.status.error : t.colors.primary.main,
      bg: comment.authorType === "ADMIN" ? t.colors.status.errorBg : alpha(t.colors.primary.main, 0.1),
      border: comment.authorType === "ADMIN" ? t.colors.status.errorBorder : alpha(t.colors.primary.main, 0.2),
    };
  };

  return (
    <Box sx={{ mt: 4, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1 }}>
        <ChatBubbleOutlineIcon sx={{ fontSize: 20, color: "text.secondary" }} />
        <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: t.typography.fontSize.xs }}>
          Collaboration & Comments
        </Typography>
        <Box sx={{ flex: 1, height: 1, bgcolor: isDark ? t.colors.border.subtle : t.colors.border.light, ml: 1 }} />
      </Box>

      <Paper
        elevation={0}
        sx={{
          bgcolor: isDark ? alpha(t.colors.background.surfaceLight, 0.3) : "#F8FAFC",
          borderRadius: t.borderRadius.xl,
          border: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 300,
          maxHeight: 500,
        }}
      >
        <Box
          ref={scrollRef}
          sx={{
            flex: 1,
            overflowY: "auto",
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-thumb": { bgcolor: isDark ? alpha("#fff", 0.1) : alpha("#000", 0.1), borderRadius: 3 },
          }}
        >
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
                <CircularProgress size={24} thickness={5} />
              </Box>
            ) : error ? (
              <Box sx={{ py: 8, textAlign: "center", color: t.colors.status.error }}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {error}
                </Typography>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => loadComments()}
                  sx={{ 
                    color: t.colors.status.error, 
                    borderColor: alpha(t.colors.status.error, 0.5),
                    "&:hover": {
                      borderColor: t.colors.status.error,
                      bgcolor: alpha(t.colors.status.error, 0.05),
                    }
                  }}
                >
                  Retry
                </Button>
              </Box>
            ) : comments.length === 0 ? (

            <Box sx={{ py: 8, textAlign: "center", opacity: 0.5 }}>
              <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                No comments yet. Start the conversation.
              </Typography>
            </Box>
          ) : (
            comments.map((comment) => {
              const author = getAuthorDisplay(comment);
              return (
                <Box key={comment.id} sx={{ display: "flex", gap: 2 }}>
                  <Avatar
                    src={comment.user?.avatarUrl || undefined}
                    sx={{
                      width: 36,
                      height: 36,
                      fontSize: 14,
                      fontWeight: 600,
                      bgcolor: author.bg,
                      color: author.color,
                      border: `1px solid ${author.border}`,
                    }}
                  >
                    {author.initials}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: t.typography.fontSize.sm }}>
                        {author.name}
                      </Typography>
                      <Chip
                        label={author.badge}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          bgcolor: author.bg,
                          color: author.color,
                          border: `1px solid ${author.border}`,
                          "& .MuiChip-label": { px: 1 },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: isDark ? "#E2E8F0" : t.colors.text.primary.light,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        fontSize: t.typography.fontSize.sm,
                      }}
                    >
                      {comment.content}
                    </Typography>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>

        <Divider sx={{ borderColor: isDark ? t.colors.border.subtle : t.colors.border.light }} />

        <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, bgcolor: isDark ? alpha(t.colors.background.surface, 0.5) : "#fff" }}>
          <Box sx={{ position: "relative" }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={submitting}
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: t.typography.fontSize.sm,
                  bgcolor: isDark ? alpha("#fff", 0.03) : "#F8FAFC",
                  borderRadius: t.borderRadius.lg,
                  pr: 6,
                  "& fieldset": { borderColor: isDark ? t.colors.border.subtle : t.colors.border.light },
                  "&:hover fieldset": { borderColor: isDark ? t.colors.border.default : alpha(t.colors.primary.main, 0.5) },
                },
              }}
            />
            <IconButton
              type="submit"
              disabled={!newComment.trim() || submitting}
              sx={{
                position: "absolute",
                right: 8,
                bottom: 8,
                color: t.colors.primary.main,
                "&.Mui-disabled": { opacity: 0.5 },
              }}
            >
              {submitting ? <CircularProgress size={20} /> : <SendIcon sx={{ fontSize: 20 }} />}
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, ml: 1, fontSize: "0.65rem", opacity: 0.7 }}>
            Press Enter to post, Shift + Enter for new line.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
