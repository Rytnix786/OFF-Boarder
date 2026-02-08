"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  alpha,
  useTheme,
  Skeleton,
} from "@mui/material";
import Link from "next/link";

interface EnterpriseConversation {
  id: string;
  organizationId: string | null;
  orgName: string;
  orgSlug: string;
  subject: string;
  status: "OPEN" | "CLOSED";
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  isExternal: boolean;
  contactName?: string;
  contactEmail?: string;
  source?: string;
}

export default function PlatformEnterprisePage() {
  const theme = useTheme();
  const [conversations, setConversations] = useState<EnterpriseConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch("/api/platform/enterprise/conversations");
        if (!res.ok) throw new Error("Failed to load conversations");
        const data = await res.json();
        setConversations(data);
      } catch (err) {
        setError("Error loading conversations.");
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, []);

  return (
    <Box>
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -1, mb: 1 }}>
          Enterprise Messages
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Manage secure in-platform security threads for enterprise organizations.
        </Typography>
      </Box>

      {loading ? (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="text" width="60%" /></TableCell>
                  <TableCell><Skeleton variant="text" width="40%" /></TableCell>
                  <TableCell><Skeleton variant="rounded" width={60} height={24} /></TableCell>
                  <TableCell><Skeleton variant="text" width="50%" /></TableCell>
                  <TableCell><Skeleton variant="circular" width={32} height={32} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : error ? (
        <Box sx={{ p: 10, textAlign: "center", bgcolor: alpha(theme.palette.error.main, 0.05), borderRadius: 4 }}>
          <Typography color="error" fontWeight={600}>{error}</Typography>
        </Box>
      ) : conversations.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 10, textAlign: "center", borderRadius: 4, bgcolor: "background.paper" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.2, marginBottom: 16 }}>
            shield
          </span>
          <Typography variant="body1" fontWeight={600} color="text.secondary">
            No enterprise messages yet.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Table>
            <TableHead sx={{ bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Origin</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Subject</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Last Message</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>Actions</TableCell>
                </TableRow>

            </TableHead>
            <TableBody>
              {conversations.map((c) => (
                <TableRow key={c.id} sx={{ "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={700}>{c.orgName}</Typography>
                      {c.isExternal && (
                        <Chip 
                          label="External" 
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            height: 18, 
                            fontSize: "0.6rem", 
                            fontWeight: 700, 
                            color: "primary.main", 
                            borderColor: alpha(theme.palette.primary.main, 0.3) 
                          }} 
                        />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {c.isExternal ? c.contactEmail : c.orgSlug}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{c.subject}</Typography>
                    <Typography variant="caption" color="text.secondary">{c.messageCount} messages</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={c.status}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.65rem",
                        bgcolor: c.status === "OPEN" ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.text.disabled, 0.1),
                        color: c.status === "OPEN" ? "success.main" : "text.secondary",
                        borderRadius: 1,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                      {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString() : "No messages"}
                    </Typography>
                    {c.lastMessageAt && (
                      <Typography variant="caption" color="text.secondary">
                        {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    <Link href={`/admin/enterprise/${c.id}`} passHref style={{ textDecoration: "none" }}>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          borderColor: alpha(theme.palette.divider, 1),
                          color: "text.primary",
                          "&:hover": {
                            borderColor: theme.palette.primary.main,
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                          }
                        }}
                      >
                        View Thread
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
