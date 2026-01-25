"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Alert,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Grid,
  Chip,
  alpha,
  useTheme,
} from "@mui/material";
import AssetsList from "./AssetsList";
import type { Asset, AssetReturn, AssetReturnProof } from "@prisma/client";

type AssetReturnWithRelations = AssetReturn & {
  asset: Asset;
  proofs: AssetReturnProof[];
};

interface AssetsClientProps {
  assetReturns: AssetReturnWithRelations[];
  assignedAssets: Asset[];
  initialAssetId?: string;
}

export default function AssetsClient({
  assetReturns,
  assignedAssets,
  initialAssetId,
}: AssetsClientProps) {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (initialAssetId) {
      const asset = assignedAssets.find((a) => a.id === initialAssetId);
      if (asset) {
        setDetailAsset(asset);
        setDetailOpen(true);
      } else {
        const ar = assetReturns.find((ar) => ar.assetId === initialAssetId);
        if (ar) {
          setDetailAsset(ar.asset);
          setDetailOpen(true);
          setTabValue(1); // Switch to Return tab if it's there
        }
      }
    }
  }, [initialAssetId, assignedAssets, assetReturns]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const pendingReturns = assetReturns.filter((ar) => ar.status !== "RETURNED");
  const completedReturns = assetReturns.filter((ar) => ar.status === "RETURNED");

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "LAPTOP": return "laptop";
      case "PHONE": return "smartphone";
      case "TABLET": return "tablet";
      case "MONITOR": return "desktop_windows";
      default: return "devices_other";
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          My Assets
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage company equipment assigned to you.
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label={`Assigned Assets (${assignedAssets.length})`} />
          <Tab label={`Asset Returns (${assetReturns.length})`} />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Box>
          {assignedAssets.length === 0 ? (
            <Alert severity="info">No assets currently assigned to you.</Alert>
          ) : (
            <Grid container spacing={2}>
              {assignedAssets.map((asset) => (
                <Grid item xs={12} sm={6} md={4} key={asset.id}>
                  <Box
                    onClick={() => {
                      setDetailAsset(asset);
                      setDetailOpen(true);
                    }}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": {
                        borderColor: theme.palette.primary.main,
                        bgcolor: alpha(theme.palette.primary.main, 0.02),
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1.5,
                          bgcolor: "action.hover",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span className="material-symbols-outlined">{getAssetIcon(asset.type)}</span>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap>
                          {asset.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {asset.type}
                        </Typography>
                      </Box>
                      <Chip size="small" label="Active" color="success" sx={{ height: 20, fontSize: 10 }} />
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          {assetReturns.length === 0 ? (
            <Alert severity="info">No assets marked for return.</Alert>
          ) : (
            <>
              {pendingReturns.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    Pending Returns ({pendingReturns.length})
                  </Typography>
                  <AssetsList assetReturns={pendingReturns} />
                </Box>
              )}
              {completedReturns.length > 0 && (
                <Box>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    Completed Returns ({completedReturns.length})
                  </Typography>
                  <AssetsList assetReturns={completedReturns} />
                </Box>
              )}
            </>
          )}
        </Box>
      )}

      {/* Asset Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        {detailAsset && (
          <>
            <DialogTitle>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span className="material-symbols-outlined">{getAssetIcon(detailAsset.type)}</span>
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    {detailAsset.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Asset Details
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Asset Type
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {detailAsset.type}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Status
                  </Typography>
                  <Chip size="small" label={detailAsset.status} color="primary" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Serial Number
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {detailAsset.serialNumber || "N/A"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Asset Tag
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {detailAsset.assetTag || "N/A"}
                  </Typography>
                </Grid>
                {detailAsset.description && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Description
                    </Typography>
                    <Typography variant="body2">{detailAsset.description}</Typography>
                  </Grid>
                )}
                {detailAsset.notes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Notes
                    </Typography>
                    <Typography variant="body2" sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
                      {detailAsset.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}