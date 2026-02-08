"use client";

import { useState } from "react";
import { Button, CircularProgress, Alert } from "@mui/material";
import { exportEmployeeData } from "@/lib/actions/employee-portal";

export default function ExportButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const data = await exportEmployeeData();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `offboarding-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccess(true);
    } catch {
      setError("Failed to export data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          Data exported successfully! Check your downloads folder.
        </Alert>
      )}

      <Button
        variant="contained"
        color="primary"
        size="large"
        disabled={loading}
        onClick={handleExport}
        startIcon={
          loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <span className="material-symbols-outlined">download</span>
          )
        }
        fullWidth
      >
        {loading ? "Preparing Export..." : "Download My Data"}
      </Button>
    </>
  );
}
