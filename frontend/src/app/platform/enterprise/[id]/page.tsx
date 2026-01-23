import React, { use, useState, useEffect } from "react";
import { Box, Typography, IconButton, Skeleton } from "@mui/material";
import Link from "next/link";
import { SecurityThread } from "@/components/app/SecurityThread";

export default function PlatformEnterpriseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [metadata, setMetadata] = useState<{ orgName: string; subject: string } | null>(null);

  useEffect(() => {
    fetch(`/api/platform/enterprise/conversations/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.orgName) setMetadata(data);
      })
      .catch(console.error);
  }, [id]);

  return (
    <Box sx={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      <Box sx={{ mb: 4, display: "flex", alignItems: "center", gap: 2 }}>
        <Link href="/platform/enterprise" passHref style={{ textDecoration: "none" }}>
          <IconButton sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </IconButton>
        </Link>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -1 }}>
            {metadata ? metadata.subject : <Skeleton width={300} />}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {metadata ? `${metadata.orgName} • Security Thread` : <Skeleton width={200} />}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <SecurityThread isAdmin={true} conversationId={id} />
      </Box>
    </Box>
  );
}
