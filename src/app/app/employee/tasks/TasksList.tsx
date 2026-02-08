"use client";

import { useState, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Collapse,
  Tooltip,
  alpha,
  LinearProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { completeEmployeeTask, addEmployeeTaskEvidence, deleteEmployeeTaskEvidence } from "@/lib/actions/employee-portal";
import { useRouter } from "next/navigation";
import type { OffboardingTask, TaskEvidence, EvidenceRequirement } from "@prisma/client";
import { TaskComments } from "@/components/offboarding/TaskComments";
import MessageIcon from "@mui/icons-material/Message";
import CloseIcon from "@mui/icons-material/Close";

type TaskWithEvidence = OffboardingTask & {
  evidence: TaskEvidence[];
};

interface TasksListProps {
  tasks: TaskWithEvidence[];
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function TasksList({ tasks }: TasksListProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [commentTaskId, setCommentTaskId] = useState<string | null>(null);
    const [addEvidenceTaskId, setAddEvidenceTaskId] = useState<string | null>(null);

  const [evidenceType, setEvidenceType] = useState<"NOTE" | "LINK" | "FILE">("NOTE");
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleCompleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.evidenceRequirement === "REQUIRED" && task.evidence.length === 0) {
      setError("Evidence is required before completing this task. Please add at least one evidence item.");
      return;
    }

    setLoadingTaskId(taskId);
    setError(null);

    try {
      const result = await completeEmployeeTask(taskId);
      if (!result.success) {
        setError(result.error || "Failed to complete task");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setEvidenceError("File size exceeds 50MB limit");
        return;
      }
      setSelectedFile(file);
      setEvidenceError(null);
    }
  };

  const handleAddEvidence = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!addEvidenceTaskId) return;

    setEvidenceLoading(true);
    setEvidenceError(null);
    setUploadProgress(0);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const noteContent = formData.get("noteContent") as string;
    const linkUrl = formData.get("linkUrl") as string;
    const description = formData.get("description") as string;

    try {
      let result;
      if (evidenceType === "NOTE") {
        if (!noteContent) {
          setEvidenceError("Note content is required");
          setEvidenceLoading(false);
          return;
        }
        result = await addEmployeeTaskEvidence(addEvidenceTaskId, {
          type: "NOTE",
          title: title || "Attestation Note",
          description,
          noteContent,
        });
      } else if (evidenceType === "LINK") {
        if (!linkUrl) {
          setEvidenceError("URL is required");
          setEvidenceLoading(false);
          return;
        }
        result = await addEmployeeTaskEvidence(addEvidenceTaskId, {
          type: "LINK",
          title: title || "Evidence Link",
          description,
          linkUrl,
        });
      } else if (evidenceType === "FILE") {
        if (!selectedFile) {
          setEvidenceError("Please select a file");
          setEvidenceLoading(false);
          return;
        }

        setUploadProgress(10);
        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedFile);
        uploadFormData.append("taskId", addEvidenceTaskId);

        const uploadRes = await fetch("/api/upload/employee-evidence", {
          method: "POST",
          body: uploadFormData,
        });

        setUploadProgress(70);

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          setEvidenceError(errorData.error || "Failed to upload file");
          setEvidenceLoading(false);
          return;
        }

        const uploadData = await uploadRes.json();
        setUploadProgress(90);

        result = await addEmployeeTaskEvidence(addEvidenceTaskId, {
          type: "FILE",
          title: title || selectedFile.name,
          description,
          fileName: uploadData.fileName,
          fileUrl: uploadData.fileUrl,
          fileSize: uploadData.fileSize,
          mimeType: uploadData.mimeType,
        });
        setUploadProgress(100);
      }

      if (result && !result.success) {
        setEvidenceError(result.error || "Failed to add evidence");
      } else {
        setAddEvidenceTaskId(null);
        setSelectedFile(null);
        setEvidenceType("NOTE");
        router.refresh();
      }
    } catch {
      setEvidenceError("An unexpected error occurred");
    } finally {
      setEvidenceLoading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!confirm("Are you sure you want to delete this evidence?")) return;

    const result = await deleteEmployeeTaskEvidence(evidenceId);
    if (!result.success) {
      setError(result.error || "Failed to delete evidence");
    } else {
      router.refresh();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "success";
      case "IN_PROGRESS":
        return "warning";
      case "PENDING":
        return "default";
      case "BLOCKED":
        return "error";
      default:
        return "default";
    }
  };

  const getEvidenceRequirementLabel = (requirement: EvidenceRequirement) => {
    switch (requirement) {
      case "REQUIRED":
        return { label: "Evidence Required", color: "error" as const };
      case "OPTIONAL":
        return { label: "Evidence Optional", color: "info" as const };
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {tasks.map((task) => {
        const evidenceReq = getEvidenceRequirementLabel(task.evidenceRequirement);
        const isExpanded = expandedTaskId === task.id;
        const hasEvidence = task.evidence.length > 0;
        const canComplete = task.evidenceRequirement !== "REQUIRED" || hasEvidence;

        return (
          <Paper key={task.id} sx={{ p: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {task.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={task.status.replace("_", " ")}
                    color={getStatusColor(task.status) as "success" | "warning" | "default" | "error"}
                  />
                  {task.category && (
                    <Chip size="small" label={task.category} variant="outlined" />
                  )}
                  {evidenceReq && (
                    <Chip size="small" label={evidenceReq.label} color={evidenceReq.color} variant="outlined" />
                  )}
                </Box>
                {task.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {task.description}
                  </Typography>
                )}
                  <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                    {task.dueDate && (
                      <Typography variant="caption" color="text.secondary">
                        Due: {new Date(task.dueDate).toLocaleDateString("en-US")}
                      </Typography>
                    )}
                      {task.completedAt && (
                        <Typography variant="caption" color="success.main">
                          Completed: {new Date(task.completedAt).toLocaleDateString("en-US")}
                        </Typography>
                      )}
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentTaskId(commentTaskId === task.id ? null : task.id);
                      }}
                      color={commentTaskId === task.id ? "primary" : "default"}
                      sx={{ ml: 1, p: 0.5 }}
                    >
                      {commentTaskId === task.id ? <CloseIcon sx={{ fontSize: 18 }} /> : <MessageIcon sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </Box>


                {(task.evidenceRequirement === "REQUIRED" || task.evidenceRequirement === "OPTIONAL") && (
                  <Box sx={{ mt: 2 }}>
                    <Box
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        cursor: "pointer",
                        p: 1,
                        borderRadius: 1,
                        bgcolor: task.evidenceRequirement === "REQUIRED" && !hasEvidence
                          ? alpha(theme.palette.error.main, isDark ? 0.08 : 0.04)
                          : isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                        border: "1px solid",
                        borderColor: task.evidenceRequirement === "REQUIRED" && !hasEvidence
                          ? alpha(theme.palette.error.main, 0.2)
                          : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                        "&:hover": {
                          bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                        },
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: 16,
                          color: task.evidenceRequirement === "REQUIRED" && !hasEvidence
                            ? theme.palette.error.main
                            : isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                        }}
                      >
                        {isExpanded ? "expand_less" : "expand_more"}
                      </span>
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: 16,
                          color: hasEvidence
                            ? theme.palette.success.main
                            : task.evidenceRequirement === "REQUIRED"
                              ? theme.palette.error.main
                              : isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                        }}
                      >
                        folder_open
                      </span>
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          flex: 1,
                          color: task.evidenceRequirement === "REQUIRED" && !hasEvidence ? "error.main" : "text.secondary",
                        }}
                      >
                        Evidence ({task.evidence.length})
                      </Typography>
                      {task.evidenceRequirement === "REQUIRED" && !hasEvidence && (
                        <Tooltip title="Evidence required for completion">
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 16, color: theme.palette.error.main }}
                          >
                            warning
                          </span>
                        </Tooltip>
                      )}
                    </Box>

                    <Collapse in={isExpanded}>
                      <Box sx={{ pt: 1.5, pl: 1 }}>
                        {task.evidenceRequirement === "REQUIRED" && !hasEvidence && (
                          <Alert severity="warning" sx={{ mb: 1.5, py: 0.5 }}>
                            <Typography sx={{ fontSize: "0.75rem" }}>
                              Evidence required. Task cannot be completed without evidence.
                            </Typography>
                          </Alert>
                        )}

                        {task.evidence.length === 0 ? (
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
                            {task.evidence.map((item) => (
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
                                      color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
                                    }}
                                  >
                                    {item.type === "NOTE" ? "description" : item.type === "FILE" ? "attach_file" : "link"}
                                  </span>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                                      {item.title || (item.type === "NOTE" ? "Note" : item.type === "FILE" ? "File" : "Link")}
                                    </Typography>
                                    {item.isImmutable && (
                                      <Tooltip title="Sealed evidence">
                                        <span
                                          className="material-symbols-outlined"
                                          style={{ fontSize: 14, color: theme.palette.warning.main }}
                                        >
                                          lock
                                        </span>
                                      </Tooltip>
                                    )}
                                  </Box>
                                  {item.type === "FILE" && item.fileUrl && (
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.25 }}>
                                      <Typography
                                        component="a"
                                        href={item.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{
                                          fontSize: "0.7rem",
                                          color: "primary.main",
                                          "&:hover": { textDecoration: "underline" },
                                        }}
                                      >
                                        {item.fileName || "Download file"}
                                      </Typography>
                                      {item.fileSize && (
                                        <Typography sx={{ fontSize: "0.65rem", color: "text.secondary" }}>
                                          ({formatFileSize(item.fileSize)})
                                        </Typography>
                                      )}
                                      </Box>
                                    )}
                                    {item.linkUrl && item.type !== "FILE" && (
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
                                {!item.isImmutable && task.status !== "COMPLETED" && (
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteEvidence(item.id)}
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

                        {task.status !== "COMPLETED" && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setAddEvidenceTaskId(task.id)}
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
                    </Box>
                  )}

                  <Box sx={{ width: "100%", mt: 1 }}>
                    <Collapse in={commentTaskId === task.id}>
                      <Box sx={{ mb: 2 }}>
                        <TaskComments taskId={task.id} />
                      </Box>
                    </Collapse>
                  </Box>
                </Box>

                {task.status !== "COMPLETED" && (

                <Tooltip title={!canComplete ? "Add required evidence first" : ""}>
                  <span>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={loadingTaskId === task.id || !canComplete}
                      onClick={() => handleCompleteTask(task.id)}
                      startIcon={
                        loadingTaskId === task.id ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                            check_circle
                          </span>
                        )
                      }
                    >
                      {loadingTaskId === task.id ? "Completing..." : "Mark Complete"}
                    </Button>
                  </span>
                </Tooltip>
              )}
            </Box>
          </Paper>
        );
      })}

      <Dialog
        open={!!addEvidenceTaskId}
        onClose={() => !evidenceLoading && setAddEvidenceTaskId(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <form onSubmit={handleAddEvidence}>
          <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Add Evidence</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", mb: 2 }}>
              Add evidence or attestation for this task.
            </Typography>

            {evidenceError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {evidenceError}
              </Alert>
            )}

              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                {(["NOTE", "LINK", "FILE"] as const).map((type) => (
                  <Button
                    key={type}
                    variant={evidenceType === type ? "contained" : "outlined"}
                    size="small"
                    onClick={() => {
                      setEvidenceType(type);
                      if (type !== "FILE") setSelectedFile(null);
                    }}
                    startIcon={
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        {type === "NOTE" ? "description" : type === "FILE" ? "attach_file" : "link"}
                      </span>
                    }
                    sx={{ flex: 1 }}
                  >
                    {type === "NOTE" ? "Attestation" : type === "FILE" ? "File" : "Link"}
                  </Button>
                ))}
              </Box>

              <TextField
                fullWidth
                label="Title"
                name="title"
                placeholder={evidenceType === "NOTE" ? "Attestation Statement" : evidenceType === "FILE" ? "Document name" : "Evidence Link"}
                sx={{ mb: 2 }}
              />

              {evidenceType === "LINK" && (
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

              {evidenceType === "NOTE" && (
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

              {evidenceType === "FILE" && (
                <Box sx={{ mb: 2 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                  />
                  <Box
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      border: "2px dashed",
                      borderColor: selectedFile ? "primary.main" : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                      borderRadius: 2,
                      p: 3,
                      textAlign: "center",
                      cursor: "pointer",
                      bgcolor: selectedFile
                        ? alpha(theme.palette.primary.main, 0.05)
                        : isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                      "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                      },
                    }}
                  >
                    {selectedFile ? (
                      <Box>
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 32, color: theme.palette.primary.main }}
                        >
                          check_circle
                        </span>
                        <Typography sx={{ fontWeight: 600, mt: 1 }}>
                          {selectedFile.name}
                        </Typography>
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                          {formatFileSize(selectedFile.size)}
                        </Typography>
                      </Box>
                    ) : (
                      <Box>
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 32, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}
                        >
                          cloud_upload
                        </span>
                        <Typography sx={{ mt: 1, color: "text.secondary" }}>
                          Click to select a file
                        </Typography>
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                          Images, PDFs, Word docs, text files (max 50MB)
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress variant="determinate" value={uploadProgress} />
                      <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.5, textAlign: "center" }}>
                        Uploading... {uploadProgress}%
                      </Typography>
                    </Box>
                  )}
                </Box>
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
            <Button onClick={() => setAddEvidenceTaskId(null)} disabled={evidenceLoading} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={evidenceLoading}>
              {evidenceLoading ? <CircularProgress size={20} /> : "Add Evidence"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
