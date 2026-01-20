"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Collapse,
  CircularProgress,
} from "@mui/material";
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createJobTitle,
  updateJobTitle,
  deleteJobTitle,
  createLocation,
  updateLocation,
  deleteLocation,
  applyStructurePreset,
} from "@/lib/actions/organization";
import { useRouter } from "next/navigation";
import { getOrgTypeLabel } from "@/lib/data/organization-types";
import type { StructurePreset } from "@/lib/data/structure-presets";

type Department = { id: string; name: string; description: string | null; _count: { employees: number } };
type JobTitle = { id: string; title: string; level: number | null; _count: { employees: number } };
type Location = { id: string; name: string; city: string | null; country: string | null; _count: { employees: number } };

interface StructureClientProps {
  departments: Department[];
  jobTitles: JobTitle[];
  locations: Location[];
  canManage: boolean;
  orgType: string | null;
  preset: StructurePreset | null;
}

type DialogType = "department" | "jobTitle" | "location" | null;

export default function StructureClient({ 
  departments, 
  jobTitles, 
  locations, 
  canManage,
  orgType,
  preset,
}: StructureClientProps) {
  const router = useRouter();
  const [dialogType, setDialogType] = useState<DialogType>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editItem, setEditItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [presetSuccess, setPresetSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    let result;

    if (dialogType === "department") {
      result = editItem
        ? await updateDepartment(editItem.id, formData)
        : await createDepartment(formData);
    } else if (dialogType === "jobTitle") {
      result = editItem
        ? await updateJobTitle(editItem.id, formData)
        : await createJobTitle(formData);
    } else if (dialogType === "location") {
      result = editItem
        ? await updateLocation(editItem.id, formData)
        : await createLocation(formData);
    }

    if (result?.error) {
      setError(result.error);
    } else {
      closeDialog();
      router.refresh();
    }
    setLoading(false);
  };

  const handleDelete = async (type: "department" | "jobTitle" | "location", id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    setLoading(true);

    let result;
    if (type === "department") result = await deleteDepartment(id);
    else if (type === "jobTitle") result = await deleteJobTitle(id);
    else if (type === "location") result = await deleteLocation(id);

    if (result?.error) alert(result.error);
    router.refresh();
    setLoading(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openDialog = (type: DialogType, item?: any) => {
    setDialogType(type);
    setEditItem(item || null);
    setError(null);
  };

  const closeDialog = () => {
    setDialogType(null);
    setEditItem(null);
    setError(null);
  };

  const handleApplyPreset = async () => {
    setApplyingPreset(true);
    setPresetSuccess(null);
    setError(null);

    const result = await applyStructurePreset();

    if (result.error) {
      setError(result.error);
    } else if ('success' in result && result.success) {
      const parts = [];
      if ('departmentsAdded' in result && result.departmentsAdded > 0) parts.push(`${result.departmentsAdded} departments`);
      if ('jobTitlesAdded' in result && result.jobTitlesAdded > 0) parts.push(`${result.jobTitlesAdded} job titles`);
      if ('locationsAdded' in result && result.locationsAdded > 0) parts.push(`${result.locationsAdded} locations`);
      
      if (parts.length > 0) {
        setPresetSuccess(`Added ${parts.join(", ")}`);
      } else {
        setPresetSuccess("All recommended items already exist");
      }
      router.refresh();
    }
    setApplyingPreset(false);
  };

  const existingDeptNames = new Set(departments.map(d => d.name.toLowerCase()));
  const existingTitleNames = new Set(jobTitles.map(t => t.title.toLowerCase()));
  const existingLocNames = new Set(locations.map(l => l.name.toLowerCase()));

  const newPresetDepts = preset?.departments.filter(d => !existingDeptNames.has(d.name.toLowerCase())) || [];
  const newPresetTitles = preset?.jobTitles.filter(t => !existingTitleNames.has(t.title.toLowerCase())) || [];
  const newPresetLocs = preset?.locations.filter(l => !existingLocNames.has(l.name.toLowerCase())) || [];
  const hasNewPresetItems = newPresetDepts.length > 0 || newPresetTitles.length > 0 || newPresetLocs.length > 0;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800}>Organization Structure</Typography>
        <Typography color="text.secondary">
          Manage departments, job titles, and locations
        </Typography>
      </Box>

      {canManage && preset && orgType && (
        <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, bgcolor: "primary.50" }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ bgcolor: "primary.main", color: "white", p: 1, borderRadius: 2, display: "flex" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>auto_awesome</span>
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Recommended for {getOrgTypeLabel(orgType)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {hasNewPresetItems 
                      ? `${newPresetDepts.length} departments, ${newPresetTitles.length} job titles, ${newPresetLocs.length} locations available`
                      : "All recommended items already added"}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => setShowPresets(!showPresets)}
                >
                  {showPresets ? "Hide Preview" : "Preview"}
                </Button>
                <Button 
                  variant="contained" 
                  size="small"
                  onClick={handleApplyPreset}
                  disabled={applyingPreset || !hasNewPresetItems}
                  startIcon={applyingPreset ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {applyingPreset ? "Applying..." : "Apply Recommended Structure"}
                </Button>
              </Box>
            </Box>

            {presetSuccess && (
              <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                {presetSuccess}
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Collapse in={showPresets}>
              <Box sx={{ mt: 3 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Departments ({preset.departments.length})
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {preset.departments.map((d, i) => (
                        <Chip
                          key={i}
                          label={d.name}
                          size="small"
                          color={existingDeptNames.has(d.name.toLowerCase()) ? "default" : "primary"}
                          variant={existingDeptNames.has(d.name.toLowerCase()) ? "outlined" : "filled"}
                        />
                      ))}
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Job Titles ({preset.jobTitles.length})
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {preset.jobTitles.map((t, i) => (
                        <Chip
                          key={i}
                          label={t.title}
                          size="small"
                          color={existingTitleNames.has(t.title.toLowerCase()) ? "default" : "primary"}
                          variant={existingTitleNames.has(t.title.toLowerCase()) ? "outlined" : "filled"}
                        />
                      ))}
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Locations ({preset.locations.length})
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {preset.locations.map((l, i) => (
                        <Chip
                          key={i}
                          label={l.name}
                          size="small"
                          color={existingLocNames.has(l.name.toLowerCase()) ? "default" : "primary"}
                          variant={existingLocNames.has(l.name.toLowerCase()) ? "outlined" : "filled"}
                        />
                      ))}
                    </Box>
                  </Grid>
                </Grid>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                  Items in blue will be added. Outlined items already exist and will be skipped.
                </Typography>
              </Box>
            </Collapse>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Departments</Typography>
                {canManage && (
                  <Button size="small" startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>} onClick={() => openDialog("department")}>
                    Add
                  </Button>
                )}
              </Box>
              <List disablePadding>
                {departments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                    No departments yet
                  </Typography>
                ) : (
                  departments.map((dept) => (
                    <ListItem key={dept.id} sx={{ px: 0, borderBottom: "1px solid", borderColor: "divider" }}>
                      <ListItemText
                        primary={dept.name}
                        secondary={dept.description || `${dept._count.employees} employees`}
                        primaryTypographyProps={{ fontWeight: 600 }}
                      />
                      <ListItemSecondaryAction>
                        <Chip label={dept._count.employees} size="small" sx={{ mr: 1 }} />
                        {canManage && (
                          <>
                            <IconButton size="small" onClick={() => openDialog("department", dept)}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDelete("department", dept.id)} disabled={loading}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                            </IconButton>
                          </>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Job Titles</Typography>
                {canManage && (
                  <Button size="small" startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>} onClick={() => openDialog("jobTitle")}>
                    Add
                  </Button>
                )}
              </Box>
              <List disablePadding>
                {jobTitles.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                    No job titles yet
                  </Typography>
                ) : (
                  jobTitles.map((jt) => (
                    <ListItem key={jt.id} sx={{ px: 0, borderBottom: "1px solid", borderColor: "divider" }}>
                      <ListItemText
                        primary={jt.title}
                        secondary={jt.level ? `Level ${jt.level}` : `${jt._count.employees} employees`}
                        primaryTypographyProps={{ fontWeight: 600 }}
                      />
                      <ListItemSecondaryAction>
                        <Chip label={jt._count.employees} size="small" sx={{ mr: 1 }} />
                        {canManage && (
                          <>
                            <IconButton size="small" onClick={() => openDialog("jobTitle", jt)}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDelete("jobTitle", jt.id)} disabled={loading}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                            </IconButton>
                          </>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Locations</Typography>
                {canManage && (
                  <Button size="small" startIcon={<span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>} onClick={() => openDialog("location")}>
                    Add
                  </Button>
                )}
              </Box>
              <List disablePadding>
                {locations.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                    No locations yet
                  </Typography>
                ) : (
                  locations.map((loc) => (
                    <ListItem key={loc.id} sx={{ px: 0, borderBottom: "1px solid", borderColor: "divider" }}>
                      <ListItemText
                        primary={loc.name}
                        secondary={[loc.city, loc.country].filter(Boolean).join(", ") || `${loc._count.employees} employees`}
                        primaryTypographyProps={{ fontWeight: 600 }}
                      />
                      <ListItemSecondaryAction>
                        <Chip label={loc._count.employees} size="small" sx={{ mr: 1 }} />
                        {canManage && (
                          <>
                            <IconButton size="small" onClick={() => openDialog("location", loc)}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDelete("location", loc.id)} disabled={loading}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                            </IconButton>
                          </>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={dialogType === "department"} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle fontWeight={700}>{editItem ? "Edit" : "Add"} Department</DialogTitle>
          <DialogContent>
            {error && <Box sx={{ mb: 2, p: 2, bgcolor: "error.50", borderRadius: 2 }}><Typography color="error.main" variant="body2">{error}</Typography></Box>}
            <TextField fullWidth label="Name" name="name" required defaultValue={editItem?.name} sx={{ mt: 2, mb: 2 }} />
            <TextField fullWidth label="Description" name="description" multiline rows={2} defaultValue={editItem?.description} />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={closeDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={dialogType === "jobTitle"} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle fontWeight={700}>{editItem ? "Edit" : "Add"} Job Title</DialogTitle>
          <DialogContent>
            {error && <Box sx={{ mb: 2, p: 2, bgcolor: "error.50", borderRadius: 2 }}><Typography color="error.main" variant="body2">{error}</Typography></Box>}
            <TextField fullWidth label="Title" name="title" required defaultValue={editItem?.title} sx={{ mt: 2, mb: 2 }} />
            <TextField fullWidth label="Level" name="level" type="number" defaultValue={editItem?.level} helperText="Optional seniority level (1-10)" />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={closeDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={dialogType === "location"} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle fontWeight={700}>{editItem ? "Edit" : "Add"} Location</DialogTitle>
          <DialogContent>
            {error && <Box sx={{ mb: 2, p: 2, bgcolor: "error.50", borderRadius: 2 }}><Typography color="error.main" variant="body2">{error}</Typography></Box>}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}><TextField fullWidth label="Name" name="name" required defaultValue={editItem?.name} /></Grid>
              <Grid size={{ xs: 12 }}><TextField fullWidth label="Address" name="address" defaultValue={editItem?.address} /></Grid>
              <Grid size={{ xs: 6 }}><TextField fullWidth label="City" name="city" defaultValue={editItem?.city} /></Grid>
              <Grid size={{ xs: 6 }}><TextField fullWidth label="Country" name="country" defaultValue={editItem?.country} /></Grid>
              <Grid size={{ xs: 12 }}><TextField fullWidth label="Timezone" name="timezone" defaultValue={editItem?.timezone} placeholder="e.g., America/New_York" /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={closeDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
