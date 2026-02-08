"use client";

import React, { useState, useEffect, useRef, use } from "react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  CircularProgress,
  IconButton,
  alpha,
  useTheme,
  Divider,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface Message {
  id: string;
  content: string;
  senderType: "EXTERNAL_VISITOR" | "ORG_USER" | "PLATFORM_ADMIN";
  createdAt: string;
}

interface Conversation {
  id: string;
  subject: string;
  status: "OPEN" | "CLOSED";
  contactName: string;
  messages: Message[];
}

export default function PublicMessagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchConversation = async () => {
    try {
      const res = await fetch(`/api/enterprise/conversation/public?token=${token}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load conversation");
      setConversation(data.conversation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversation();
    const interval = setInterval(fetchConversation, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/enterprise/conversation/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, content: newMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      
      setConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, data.message]
      } : null);
      setNewMessage("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !conversation) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", p: 3 }}>
        <Paper sx={{ p: 4, maxWidth: 400, textAlign: "center", borderRadius: 2 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: theme.palette.error.main, marginBottom: 16 }}>
            error
          </span>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Link Invalid
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {error || "We couldn't find this conversation. It may have expired or been removed."}
          </Typography>
          <Button variant="contained" href="/" fullWidth sx={{ textTransform: "none", borderRadius: 1.5 }}>
            Return to Landing Page
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: isDark ? "#05070A" : "#F8FAFC" }}>
      {/* Header */}
      <Box sx={{ 
        position: "sticky", 
        top: 0, 
        zIndex: 10,
        bgcolor: isDark ? alpha("#0B0F1A", 0.8) : alpha("#fff", 0.8),
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid",
        borderColor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.08),
        py: 2
      }}>
        <Container maxWidth="md">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar sx={{ bgcolor: "primary.main" }}>
                <span className="material-symbols-outlined">shield</span>
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                  OffboardHQ Security Team
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Conversation with {conversation.contactName}
                </Typography>
              </Box>
            </Box>
            <ThemeToggle size="small" />
          </Box>
        </Container>
      </Box>

      {/* Chat Area */}
      <Container maxWidth="md" sx={{ py: 4, height: "calc(100vh - 160px)", display: "flex", flexDirection: "column" }}>
        <Box 
          ref={scrollRef}
          sx={{ 
            flex: 1, 
            overflowY: "auto", 
            mb: 3, 
            display: "flex", 
            flexDirection: "column", 
            gap: 2,
            pr: 1,
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-thumb": { 
              bgcolor: isDark ? alpha("#fff", 0.1) : alpha("#000", 0.1),
              borderRadius: 3
            }
          }}
        >
          {conversation.messages.map((msg, i) => {
            const isVisitor = msg.senderType === "EXTERNAL_VISITOR";
            return (
              <Box 
                key={msg.id}
                sx={{ 
                  alignSelf: isVisitor ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                }}
              >
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2,
                  bgcolor: isVisitor 
                    ? "primary.main" 
                    : (isDark ? alpha("#fff", 0.05) : "#fff"),
                  color: isVisitor ? "#fff" : "text.primary",
                  border: isVisitor ? "none" : "1px solid",
                  borderColor: isDark ? alpha("#fff", 0.1) : alpha("#000", 0.08),
                  boxShadow: isVisitor ? "none" : "0 2px 4px rgba(0,0,0,0.02)"
                }}>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {msg.content}
                  </Typography>
                </Box>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    mt: 0.5, 
                    display: "block", 
                    textAlign: isVisitor ? "right" : "left",
                    color: "text.secondary",
                    opacity: 0.7
                  }}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Input Area */}
        {conversation.status === "OPEN" ? (
          <Paper sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: isDark ? alpha("#fff", 0.1) : alpha("#000", 0.08) }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder="Type your reply..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                variant="outlined"
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                    bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#000", 0.01)
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleSend}
                disabled={sending || !newMessage.trim()}
                sx={{ 
                  borderRadius: 1.5, 
                  px: 3, 
                  textTransform: "none",
                  fontWeight: 700
                }}
              >
                {sending ? <CircularProgress size={20} color="inherit" /> : "Send"}
              </Button>
            </Box>
          </Paper>
        ) : (
          <Paper sx={{ p: 3, textAlign: "center", bgcolor: alpha(theme.palette.warning.main, 0.05), border: "1px dashed", borderColor: "warning.main" }}>
            <Typography variant="body2" color="warning.main" fontWeight={600}>
              This conversation has been closed.
            </Typography>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
