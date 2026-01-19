"use client";

import { useState, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  LinearProgress,
  IconButton,
} from "@mui/material";
import { uploadAssetReturnProof } from "@/lib/actions/employee-portal";
import type { Asset, AssetReturn, AssetReturnProof, AssetProofType } from "@prisma/client";

type AssetReturnWithRelations = AssetReturn & {
  asset: Asset;
  proofs: AssetReturnProof[];
};

interface AssetsListProps {
  assetReturns: AssetReturnWithRelations[];
}

export default function AssetsList({ assetReturns }: AssetsListProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedAssetReturn, setSelectedAssetReturn] = useState<AssetReturnWithRelations | null>(null);
  const [proofType, setProofType] = useState<AssetProofType>("TRACKING_NUMBER");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenUpload = (assetReturn: AssetReturnWithRelations) => {
    setSelectedAssetReturn(assetReturn);
    setUploadDialogOpen(true);
    setProofType("TRACKING_NUMBER");
    setTrackingNumber("");
    setDescription("");
    setSelectedFile(null);
    setUploadProgress(0);
    setError(null);
  };

  const handleUploadProof = async () => {
    if (!selectedAssetReturn) return;

    setLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      let fileUrl: string | undefined;
      let fileName: string | undefined;

      if ((proofType === "PHOTO" || proofType === "SHIPPING_RECEIPT") && selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedFile);
        uploadFormData.append("assetReturnId", selectedAssetReturn.id);

        setUploadProgress(10);
        const uploadResponse = await fetch("/api/upload/asset-proof", {
          method: "POST",
          body: uploadFormData,
        });

        setUploadProgress(60);
        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok || uploadResult.error) {
          setError(uploadResult.error || "Failed to upload file");
          setLoading(false);
          return;
        }

        setUploadProgress(80);
        fileUrl = uploadResult.fileUrl;
        fileName = uploadResult.fileName;
      }

      const result = await uploadAssetReturnProof(selectedAssetReturn.id, proofType, {
        trackingNumber: proofType === "TRACKING_NUMBER" ? trackingNumber : undefined,
        fileUrl,
        fileName,
        description,
      });

      setUploadProgress(100);

      if (!result.success) {
        setError(result.error || "Failed to upload proof");
      } else {
        setUploadDialogOpen(false);
        setSelectedFile(null);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RETURNED":
        return "success";
      case "PENDING":
        return "warning";
      case "LOST":
      case "DAMAGED":
        return "error";
      default:
        return "default";
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "LAPTOP":
        return "laptop";
      case "PHONE":
        return "smartphone";
      case "TABLET":
        return "tablet";
      case "MONITOR":
        return "desktop_windows";
      case "KEYBOARD":
      case "MOUSE":
        return "keyboard";
      case "HEADSET":
        return "headset_mic";
      case "ACCESS_CARD":
        return "badge";
      case "KEYS":
        return "key";
      case "VEHICLE":
        return "directions_car";
      default:
        return "devices_other";
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {assetReturns.map((ar) => (
        <Paper key={ar.id} sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                  {getAssetIcon(ar.asset.type)}
                </span>
              </Box>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {ar.asset.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={ar.status.replace("_", " ")}
                    color={getStatusColor(ar.status) as "success" | "warning" | "error" | "default"}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {ar.asset.type.replace("_", " ")}
                  {ar.asset.serialNumber && ` • S/N: ${ar.asset.serialNumber}`}
                  {ar.asset.assetTag && ` • Tag: ${ar.asset.assetTag}`}
                </Typography>
                {ar.asset.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    {ar.asset.description}
                  </Typography>
                )}
              </Box>
            </Box>

            {ar.status !== "RETURNED" && (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => handleOpenUpload(ar)}
                startIcon={
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    upload
                  </span>
                }
              >
                Upload Proof
              </Button>
            )}
          </Box>

          {ar.proofs.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Submitted Proofs
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {ar.proofs.map((proof) => (
                    <Box
                      key={proof.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        p: 1,
                        bgcolor: "action.hover",
                        borderRadius: 1,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        {proof.type === "TRACKING_NUMBER"
                          ? "local_shipping"
                          : proof.type === "SHIPPING_RECEIPT"
                          ? "receipt"
                          : proof.type === "PHOTO"
                          ? "photo"
                          : "description"}
                      </span>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">
                          {proof.type.replace("_", " ")}
                          {proof.trackingNumber && `: ${proof.trackingNumber}`}
                          {proof.description && ` - ${proof.description}`}
                        </Typography>
                        {proof.fileUrl && (
                          <Typography
                            component="a"
                            href={proof.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              fontSize: "0.75rem",
                              color: "primary.main",
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              "&:hover": { textDecoration: "underline" },
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                              download
                            </span>
                            {proof.fileName || "View File"}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(proof.uploadedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  ))}
              </Box>
            </>
          )}
        </Paper>
      ))}

      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Return Proof</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {selectedAssetReturn && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Uploading proof for: <strong>{selectedAssetReturn.asset.name}</strong>
            </Typography>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Proof Type</InputLabel>
              <Select
                value={proofType}
                label="Proof Type"
                onChange={(e) => {
                  setProofType(e.target.value as AssetProofType);
                  setSelectedFile(null);
                }}
              >
                <MenuItem value="TRACKING_NUMBER">Tracking Number</MenuItem>
                <MenuItem value="SHIPPING_RECEIPT">Shipping Receipt</MenuItem>
                <MenuItem value="PHOTO">Photo</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>

            {proofType === "TRACKING_NUMBER" && (
              <TextField
                fullWidth
                label="Tracking Number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                sx={{ mb: 2 }}
                placeholder="Enter shipping tracking number"
              />
            )}

            {(proofType === "PHOTO" || proofType === "SHIPPING_RECEIPT") && (
              <Box sx={{ mb: 2 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 50 * 1024 * 1024) {
                        setError("File size exceeds 50MB limit");
                        return;
                      }
                      setSelectedFile(file);
                      setError(null);
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => fileInputRef.current?.click()}
                  startIcon={
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      upload_file
                    </span>
                  }
                  sx={{ 
                    py: 2, 
                    borderStyle: "dashed",
                    borderColor: selectedFile ? "success.main" : undefined,
                    bgcolor: selectedFile ? "rgba(34, 197, 94, 0.05)" : undefined,
                  }}
                >
                  {selectedFile ? selectedFile.name : proofType === "PHOTO" ? "Upload Photo" : "Upload Receipt"}
                </Button>
                {selectedFile && (
                  <Box sx={{ display: "flex", alignItems: "center", mt: 1, gap: 1 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#22c55e" }}>
                      check_circle
                    </span>
                    <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", flex: 1 }}>
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => setSelectedFile(null)}
                      sx={{ width: 24, height: 24 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                    </IconButton>
                  </Box>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 1 }} />
                )}
                <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", mt: 1 }}>
                  Supported: Images and PDFs (max 50MB)
                </Typography>
              </Box>
            )}

            <TextField
            fullWidth
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
            placeholder="Add any additional details about the return"
          />
        </DialogContent>
          <DialogActions>
            <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleUploadProof}
              disabled={loading || (proofType === "TRACKING_NUMBER" && !trackingNumber) || ((proofType === "PHOTO" || proofType === "SHIPPING_RECEIPT") && !selectedFile)}
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              {loading ? "Uploading..." : "Upload Proof"}
            </Button>
          </DialogActions>
      </Dialog>
    </Box>
  );
}
