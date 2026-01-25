"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Alert,
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
  Paper,
  Stack,
  Fade,
  Card,
  CardContent,
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
        }
      }
    }
  }, [initialAssetId, assignedAssets, assetReturns]);

  const pendingReturns = assetReturns.filter((ar) => ar.status !== "RETURNED");
  const completedReturns = assetReturns.filter((ar) => ar.status === "RETURNED");

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "LAPTOP": return "laptop";
      case "PHONE": return "smartphone";
      case "TABLET": return "tablet";
      case "MONITOR": return "desktop_windows";
      case "KEYBOARD":
      case "MOUSE": return "keyboard";
      case "HEADSET": return "headset_mic";
      case "ACCESS_CARD": return "badge";
      case "KEYS": return "key";
      case "VEHICLE": return "directions_car";
      default: return "devices_other";
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Box sx={{ mb: 6, textAlign: "center" }}>
        <Typography 
          variant="h3" 
          fontWeight={800} 
          gutterBottom
          sx={{ 
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            mb: 1
          }}
        >
          My Assets
        </Typography>
        <Typography variant="h6" color="text.secondary" fontWeight={400}>
          Unified management of your company-issued equipment
        </Typography>
      </Box>

      <Stack spacing={6}>
        {/* Returns Section - Only shown if there are pending returns */}
        {pendingReturns.length > 0 && (
          <Fade in timeout={800}>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                <Box 
                  sx={{ 
                    p: 1, 
                    borderRadius: 2, 
                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                    color: theme.palette.warning.main,
                    display: "flex"
                  }}
                >
                  <span className="material-symbols-outlined">assignment_return</span>
                </Box>
                <Typography variant="h5" fontWeight={700}>
                  Returns Required
                </Typography>
                <Chip 
                  label={`${pendingReturns.length} Pending`} 
                  color="warning" 
                  size="small" 
                  sx={{ fontWeight: 700 }}
                />
              </Box>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 0, 
                  borderRadius: 4, 
                  overflow: "hidden",
                  border: "2px solid",
                  borderColor: alpha(theme.palette.warning.main, 0.2),
                  bgcolor: alpha(theme.palette.warning.main, 0.02)
                }}
              >
                <AssetsList assetReturns={pendingReturns} />
              </Paper>
            </Box>
          </Fade>
        )}

        {/* Assigned Equipment Section */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Box 
              sx={{ 
                p: 1, 
                borderRadius: 2, 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                display: "flex"
              }}
            >
              <span className="material-symbols-outlined">inventory_2</span>
            </Box>
            <Typography variant="h5" fontWeight={700}>
              Assigned Equipment
            </Typography>
            <Chip 
              label={`${assignedAssets.length} Assets`} 
              variant="outlined" 
              size="small" 
              sx={{ fontWeight: 600 }}
            />
          </Box>

          {assignedAssets.length === 0 ? (
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 8, 
                textAlign: "center", 
                borderRadius: 4,
                bgcolor: alpha(theme.palette.action.hover, 0.5),
                borderStyle: "dashed"
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.3 }}>devices</span>
              <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                No active equipment assigned to you
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {assignedAssets.map((asset) => (
                <Grid item xs={12} sm={6} md={4} key={asset.id}>
                  <Card
                    variant="outlined"
                    onClick={() => {
                      setDetailAsset(asset);
                      setDetailOpen(true);
                    }}
                    sx={{
                      height: "100%",
                      borderRadius: 4,
                      cursor: "pointer",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      border: "1px solid",
                      borderColor: "divider",
                      position: "relative",
                      overflow: "hidden",
                      "&:hover": {
                        borderColor: theme.palette.primary.main,
                        boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.1)}`,
                        transform: "translateY(-4px)",
                        bgcolor: alpha(theme.palette.primary.main, 0.01),
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                        <Box
                          sx={{
                            width: 56,
                            height: 56,
                            borderRadius: 3,
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            color: theme.palette.primary.main,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 32 }}>
                            {getAssetIcon(asset.type)}
                          </span>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ mb: 0.5 }}>
                            {asset.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ textTransform: "capitalize" }}>
                            {asset.type.toLowerCase().replace("_", " ")}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.disabled" }}>
                          {asset.assetTag || asset.serialNumber || "No Tag"}
                        </Typography>
                        <Chip 
                          size="small" 
                          label="Active" 
                          sx={{ 
                            height: 20, 
                            fontSize: 10, 
                            fontWeight: 700,
                            bgcolor: alpha(theme.palette.success.main, 0.1),
                            color: theme.palette.success.main
                          }} 
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* History Section */}
        {completedReturns.length > 0 && (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <Box 
                sx={{ 
                  p: 1, 
                  borderRadius: 2, 
                  bgcolor: alpha(theme.palette.text.secondary, 0.1),
                  color: "text.secondary",
                  display: "flex"
                }}
              >
                <span className="material-symbols-outlined">history</span>
              </Box>
              <Typography variant="h5" fontWeight={700}>
                Return History
              </Typography>
              <Chip 
                label={`${completedReturns.length} Completed`} 
                variant="outlined" 
                size="small" 
                sx={{ fontWeight: 600, opacity: 0.7 }}
              />
            </Box>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 0, 
                borderRadius: 4, 
                overflow: "hidden",
                opacity: 0.8,
                bgcolor: alpha(theme.palette.action.disabledBackground, 0.05)
              }}
            >
              <AssetsList assetReturns={completedReturns} />
            </Paper>
          </Box>
        )}
      </Stack>

      {/* Premium Asset Detail Dialog */}
      <Dialog 
        open={detailOpen} 
        onClose={() => setDetailOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 6,
            overflow: "hidden"
          }
        }}
      >
        {detailAsset && (
          <>
            <Box sx={{ 
              p: 4, 
              pb: 3, 
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 100%)`,
              position: "relative"
            }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: 4,
                    bgcolor: theme.palette.primary.main,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 40 }}>
                    {getAssetIcon(detailAsset.type)}
                  </span>
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={900}>
                    {detailAsset.name}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                    <Chip 
                      size="small" 
                      label={detailAsset.type} 
                      sx={{ fontWeight: 700, height: 20, fontSize: 10 }} 
                    />
                    <Typography variant="caption" color="text.secondary">
                      Asset ID: {detailAsset.id.slice(0, 8)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
            
            <DialogContent sx={{ p: 4, pt: 0 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Serial Number
                  </Typography>
                  <Typography variant="body1" fontWeight={600} sx={{ fontFamily: "monospace" }}>
                    {detailAsset.serialNumber || "Not Recorded"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Asset Tag
                  </Typography>
                  <Typography variant="body1" fontWeight={600} sx={{ fontFamily: "monospace" }}>
                    {detailAsset.assetTag || "Not Recorded"}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip 
                      size="small" 
                      label={detailAsset.status} 
                      color="success" 
                      sx={{ fontWeight: 700 }} 
                    />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Assigned On
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {new Date(detailAsset.createdAt).toLocaleDateString("en-US", { 
                      month: "long", day: "numeric", year: "numeric" 
                    })}
                  </Typography>
                </Grid>

                {detailAsset.description && (
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.action.hover, 0.5) }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: "block", mb: 0.5 }}>
                        Description
                      </Typography>
                      <Typography variant="body2">{detailAsset.description}</Typography>
                    </Box>
                  </Grid>
                )}

                {detailAsset.notes && (
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, borderRadius: 3, border: "1px dashed", borderColor: "divider" }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: "block", mb: 0.5 }}>
                        Assignment Notes
                      </Typography>
                      <Typography variant="body2" fontStyle="italic">"{detailAsset.notes}"</Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            
            <DialogActions sx={{ p: 3, pt: 1 }}>
              <Button 
                onClick={() => setDetailOpen(false)} 
                variant="contained" 
                fullWidth
                sx={{ 
                  borderRadius: 3, 
                  py: 1.5,
                  fontWeight: 700,
                  boxShadow: theme.shadows[4]
                }}
              >
                Done
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
