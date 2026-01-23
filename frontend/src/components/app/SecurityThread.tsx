"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  Divider,
  CircularProgress,
  alpha,
  useTheme,
  Skeleton,
} from "@mui/material";

interface Message {
  id: string;
  senderId: string | null;
  senderType: "ORG_USER" | "PLATFORM_ADMIN" | "EXTERNAL_VISITOR";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  subject: string;
  status: "OPEN" | "CLOSED";
  messages: Message[];
}

interface SecurityThreadProps {
  isAdmin?: boolean;
  conversationId?: string; // Only needed for admin view
}

export function SecurityThread({ isAdmin = false, conversationId }: SecurityThreadProps) {
  const theme = useTheme();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchConversation = async () => {
      try {
        const url = isAdmin 
          ? `/api/platform/enterprise/conversations/${conversationId}`
          : `/api/enterprise/conversation`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load thread");
        
        const data = await res.json();
        
        if (isAdmin) {
          const msgRes = await fetch(`/api/platform/enterprise/conversations/${conversationId}/messages`);
          const messages = await msgRes.json();
          setConversation({
            ...data,
            messages
          });
        } else {
          setConversation(data);
        }
      } catch (err) {
        setError("Unable to load security thread. Please try again.");
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchConversation();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const url = isAdmin
        ? `/api/platform/enterprise/conversations/${conversationId}/messages`
        : `/api/enterprise/conversation`;
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const sentMsg = await res.json();
      setConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, sentMsg]
      } : null);
      setNewMessage("");
    } catch (err) {
      setError("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Skeleton variant="text" width="40%" height={40} sx={{ mb: 4 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} variant="rounded" width={i % 2 === 0 ? "70%" : "60%"} height={80} sx={{ alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start' }} />
          ))}
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 6, textAlign: "center" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: theme.palette.error.main, opacity: 0.5, marginBottom: 16 }}>
          error
        </span>
        <Typography variant="h6" gutterBottom>{error}</Typography>
        <Button variant="outlined" onClick={() => { setLoading(true); setError(null); fetchConversation(); }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.paper", borderRadius: 4, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: "1px solid", borderColor: "divider", bgcolor: alpha(theme.palette.background.default, 0.5) }}>
        <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: -0.5 }}>
          {conversation?.subject}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: conversation?.status === "OPEN" ? "success.main" : "text.disabled" }} />
          {conversation?.status === "OPEN" ? "Secure In-Platform Thread Active" : "Thread Closed"}
        </Typography>
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {conversation?.messages.length === 0 ? (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0.5, py: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 16 }}>
              shield_lock
            </span>
            <Typography variant="body2" fontWeight={500}>
              Start a secure thread with our security team.
            </Typography>
            <Typography variant="caption">
              Messages are immutable and internally auditable.
            </Typography>
          </Box>
        ) : (
          conversation?.messages.map((msg) => {
              const isMe = isAdmin ? msg.senderType === "PLATFORM_ADMIN" : msg.senderType === "ORG_USER";
              const senderLabel = msg.senderType === "PLATFORM_ADMIN" 
                ? "Platform Admin" 
                : msg.senderType === "EXTERNAL_VISITOR" 
                  ? "External Visitor" 
                  : "Organization";
              
              return (

              <Box
                key={msg.id}
                sx={{
                  alignSelf: isMe ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isMe ? "flex-end" : "flex-start",
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: isMe ? "primary.main" : alpha(theme.palette.text.primary, 0.05),
                    color: isMe ? "white" : "text.primary",
                    border: !isMe ? "1px solid" : "none",
                    borderColor: "divider",
                    boxShadow: isMe ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}` : "none",
                  }}
                >
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                    {msg.content}
                  </Typography>
                </Box>
                    <Typography variant="caption" sx={{ mt: 0.75, color: "text.secondary", fontSize: "0.7rem", fontWeight: 600 }}>
                      {senderLabel} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>

              </Box>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box sx={{ p: 2.5, borderTop: "1px solid", borderColor: "divider", bgcolor: alpha(theme.palette.background.default, 0.5) }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end" }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Type your secure message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending || conversation?.status === "CLOSED"}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                bgcolor: "background.paper",
                fontSize: "0.9rem",
              }
            }}
          />
          <Button
            variant="contained"
            disabled={!newMessage.trim() || sending || conversation?.status === "CLOSED"}
            onClick={handleSendMessage}
            sx={{
              minWidth: 50,
              width: 50,
              height: 50,
              borderRadius: "50%",
              p: 0,
              boxShadow: "none",
            }}
          >
            {sending ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <span className="material-symbols-outlined">send</span>
            )}
          </Button>
        </Box>
        <Typography variant="caption" sx={{ display: "block", mt: 1.5, textAlign: "center", opacity: 0.5, fontWeight: 500 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 12, verticalAlign: "middle", marginRight: 4 }}>
            lock
          </span>
          End-to-end encrypted in-platform security communication
        </Typography>
      </Box>
    </Box>
  );
}
