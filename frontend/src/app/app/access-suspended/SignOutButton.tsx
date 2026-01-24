"use client";

import { Button } from "@mui/material";
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
    <Button 
      variant="outlined" 
      color="inherit" 
      fullWidth 
      sx={{ fontWeight: 700 }}
      onClick={handleSignOut}
    >
      Sign Out
    </Button>
  );
}
