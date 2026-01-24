"use client";

import { useState } from "react";
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

  const handleOpenUpload = (assetReturn: AssetReturnWithRelations) => {
    setSelectedAssetReturn(assetReturn);
    setUploadDialogOpen(true);
    setProofType("TRACKING_NUMBER");
    setTrackingNumber("");
    setDescription("");
    setError(null);
  };

  const handleUploadProof = async () => {
    if (!selectedAssetReturn) return;

    setLoading(true);
    setError(null);

    try {
      const result = await uploadAssetReturnProof(selectedAssetReturn.id, proofType, {
        trackingNumber: proofType === "TRACKING_NUMBER" ? trackingNumber : undefined,
        description,
      });

      if (!result.success) {
        setError(result.error || "Failed to upload proof");
      } else {
        setUploadDialogOpen(false);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
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
                    <Typography variant="body2">
                      {proof.type.replace("_", " ")}
                      {proof.trackingNumber && `: ${proof.trackingNumber}`}
                      {proof.description && ` - ${proof.description}`}
                    </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                        {new Date(proof.uploadedAt).toLocaleDateString("en-US")}
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
              onChange={(e) => setProofType(e.target.value as AssetProofType)}
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
            disabled={loading || (proofType === "TRACKING_NUMBER" && !trackingNumber)}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? "Uploading..." : "Upload Proof"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
