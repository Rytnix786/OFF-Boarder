"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  alpha,
  Collapse,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { addTaskEvidence, deleteTaskEvidence } from "@/lib/actions/task-evidence";
import { useRouter } from "next/navigation";

type EvidenceItem = {
  id: string;
  type: "FILE" | "LINK" | "NOTE" | "SYSTEM_PROOF";
  title: string | null;
  description: string | null;
  fileName: string | null;
  fileUrl: string | null;
  linkUrl: string | null;
  noteContent: string | null;
  systemProof: unknown;
  createdAt: Date;
  isImmutable: boolean;
};

interface TaskEvidencePanelProps {
  taskId: string;
  taskName: string;
  evidenceRequirement: "REQUIRED" | "OPTIONAL" | "NONE";
  evidence: EvidenceItem[];
  taskCompleted: boolean;
  offboardingCompleted: boolean;
  canEdit: boolean;
}

export function TaskEvidencePanel({
  taskId,
  taskName,
  evidenceRequirement,
  evidence,
  taskCompleted,
  offboardingCompleted,
  canEdit,
}: TaskEvidencePanelProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<"LINK" | "NOTE">("NOTE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (evidenceRequirement === "NONE") {
    return null;
  }

  const isRequired = evidenceRequirement === "REQUIRED";
  const hasEvidence = evidence.length > 0;
  const isCompliant = !isRequired || hasEvidence;
  const canAddEvidence = canEdit && !(taskCompleted && offboardingCompleted);

  const handleAddEvidence = async (formData: FormData) => {
    setLoading(true);
    setError(null);

    try {
      const type = formData.get("type") as "LINK" | "NOTE";
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;

      let result;
      if (type === "LINK") {
        const linkUrl = formData.get("linkUrl") as string;
        if (!linkUrl) {
          setError("URL is required");
          setLoading(false);
          return;
        }
        result = await addTaskEvidence(taskId, {
          type: "LINK",
          title: title || "Link Evidence",
          description,
          linkUrl,
        });
      } else if (type === "NOTE") {
        const noteContent = formData.get("noteContent") as string;
        if (!noteContent) {
          setError("Note content is required");
          setLoading(false);
          return;
        }
        result = await addTaskEvidence(taskId, {
          type: "NOTE",
          title: title || "Attestation Note",
          description,
          noteContent,
        });
      } else {
        setError("Unsupported evidence type");
        setLoading(false);
        return;
      }

      if (result.error) {
        setError(result.error);
      } else {
        setAddDialogOpen(false);
        router.refresh();
      }
    } catch (err) {
      setError("Failed to add evidence");
    }
    setLoading(false);
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!confirm("Are you sure you want to delete this evidence?")) return;
    setLoading(true);
    const result = await deleteTaskEvidence(evidenceId);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setLoading(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "FILE":
        return "attach_file";
      case "LINK":
        return "link";
      case "NOTE":
        return "description";
      case "SYSTEM_PROOF":
        return "verified";
      default:
        return "inventory_2";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "FILE":
        return "File";
      case "LINK":
        return "Link";
      case "NOTE":
        return "Attestation";
      case "SYSTEM_PROOF":
        return "System Proof";
      default:
        return type;
    }
  };

  return (
    <Box sx={{ mt: 1.5 }}>
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: "pointer",
          p: 1,
          borderRadius: 1,
          bgcolor: isRequired && !hasEvidence
            ? alpha(theme.palette.error.main, isDark ? 0.08 : 0.04)
            : isDark
            ? "rgba(255,255,255,0.02)"
            : "rgba(0,0,0,0.02)",
          border: "1px solid",
          borderColor: isRequired && !hasEvidence
            ? alpha(theme.palette.error.main, 0.2)
            : isDark
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.06)",
          "&:hover": {
            bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
          },
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 16,
            color: isRequired && !hasEvidence
              ? theme.palette.error.main
              : isDark
              ? "rgba(255,255,255,0.5)"
              : "rgba(0,0,0,0.5)",
          }}
        >
          {expanded ? "expand_less" : "expand_more"}
        </span>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 16,
            color: isRequired && !hasEvidence
              ? theme.palette.error.main
              : hasEvidence
              ? theme.palette.success.main
              : isDark
              ? "rgba(255,255,255,0.5)"
              : "rgba(0,0,0,0.5)",
          }}
        >
          folder_open
        </span>
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 600,
            flex: 1,
            color: isRequired && !hasEvidence ? "error.main" : "text.secondary",
          }}
        >
          Evidence ({evidence.length})
        </Typography>
        <Chip
          label={isRequired ? "Required" : "Optional"}
          size="small"
          sx={{
            height: 18,
            fontSize: "0.65rem",
            fontWeight: 600,
            bgcolor: isRequired
              ? alpha(theme.palette.error.main, isDark ? 0.15 : 0.1)
              : alpha(theme.palette.info.main, isDark ? 0.15 : 0.1),
            color: isRequired ? "error.main" : "info.main",
            border: "none",
          }}
        />
        {isRequired && !hasEvidence && (
          <Tooltip title="Evidence required for compliance">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16, color: theme.palette.error.main }}
            >
              warning
            </span>
          </Tooltip>
        )}
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ pt: 1.5, pl: 1 }}>
          {isRequired && !hasEvidence && (
            <Alert severity="warning" sx={{ mb: 1.5, py: 0.5 }}>
              <Typography sx={{ fontSize: "0.75rem" }}>
                Evidence required for compliance. Task cannot be completed without evidence.
              </Typography>
            </Alert>
          )}

          {evidence.length === 0 ? (
            <Typography
              sx={{
                fontSize: "0.75rem",
                color: "text.secondary",
                fontStyle: "italic",
                mb: 1,
              }}
            >
              No evidence attached yet.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 1.5 }}>
              {evidence.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                    border: "1px solid",
                    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 18,
                      color: item.type === "SYSTEM_PROOF"
                        ? theme.palette.success.main
                        : isDark
                        ? "rgba(255,255,255,0.6)"
                        : "rgba(0,0,0,0.5)",
                    }}
                  >
                    {getTypeIcon(item.type)}
                  </span>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                        {item.title || getTypeLabel(item.type)}
                      </Typography>
                      <Chip
                        label={getTypeLabel(item.type)}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: "0.6rem",
                          bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                        }}
                      />
                      {item.isImmutable && (
                        <Tooltip title="Evidence is sealed and cannot be modified">
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 14, color: theme.palette.warning.main }}
                          >
                            lock
                          </span>
                        </Tooltip>
                      )}
                    </Box>
                    {item.description && (
                      <Typography
                        sx={{
                          fontSize: "0.7rem",
                          color: "text.secondary",
                          mt: 0.25,
                        }}
                      >
                        {item.description}
                      </Typography>
                    )}
                    {item.linkUrl && (
                      <Typography
                        component="a"
                        href={item.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontSize: "0.7rem",
                          color: "primary.main",
                          display: "block",
                          mt: 0.25,
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        {item.linkUrl}
                      </Typography>
                    )}
                    {item.noteContent && (
                      <Typography
                        sx={{
                          fontSize: "0.7rem",
                          color: "text.secondary",
                          mt: 0.5,
                          p: 1,
                          borderRadius: 0.5,
                          bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {item.noteContent}
                      </Typography>
                    )}
                    <Typography
                      sx={{
                        fontSize: "0.65rem",
                        color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)",
                        mt: 0.5,
                      }}
                    >
                      {new Date(item.createdAt).toLocaleString("en-US")}
                    </Typography>
                  </Box>
                  {canEdit && !item.isImmutable && !taskCompleted && (
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteEvidence(item.id)}
                      disabled={loading}
                      sx={{ width: 24, height: 24, opacity: 0.6, "&:hover": { opacity: 1 } }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        delete
                      </span>
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {canAddEvidence && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setAddDialogOpen(true)}
              startIcon={
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  add
                </span>
              }
              sx={{
                fontSize: "0.7rem",
                py: 0.5,
                borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                color: "text.secondary",
              }}
            >
              Add Evidence
            </Button>
          )}
        </Box>
      </Collapse>

      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddEvidence(new FormData(e.currentTarget));
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Add Evidence</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", mb: 2 }}>
              Adding evidence to: <strong>{taskName}</strong>
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              {(["NOTE", "LINK"] as const).map((type) => (
                <Button
                  key={type}
                  variant={addType === type ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setAddType(type)}
                  startIcon={
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      {getTypeIcon(type)}
                    </span>
                  }
                  sx={{ flex: 1 }}
                >
                  {getTypeLabel(type)}
                </Button>
              ))}
            </Box>

            <input type="hidden" name="type" value={addType} />

            <TextField
              fullWidth
              label="Title"
              name="title"
              placeholder={addType === "NOTE" ? "Attestation Statement" : "Evidence Link"}
              sx={{ mb: 2 }}
            />

            {addType === "LINK" && (
              <TextField
                fullWidth
                label="URL"
                name="linkUrl"
                type="url"
                placeholder="https://..."
                required
                sx={{ mb: 2 }}
              />
            )}

            {addType === "NOTE" && (
              <TextField
                fullWidth
                label="Attestation / Note"
                name="noteContent"
                multiline
                rows={4}
                placeholder="Enter attestation statement or compliance note..."
                required
                sx={{ mb: 2 }}
              />
            )}

            <TextField
              fullWidth
              label="Description (optional)"
              name="description"
              multiline
              rows={2}
              placeholder="Additional context..."
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={() => setAddDialogOpen(false)} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={20} /> : "Add Evidence"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
