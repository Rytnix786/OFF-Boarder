"use client";

import { Button, Typography, Box } from "@mui/material";
import { createClient, clearRememberMe } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    clearRememberMe();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Need to sign in with a different account?
      </Typography>
      <Button variant="outlined" color="inherit" onClick={handleSignOut}>
        Sign Out
      </Button>
    </Box>
  );
}
