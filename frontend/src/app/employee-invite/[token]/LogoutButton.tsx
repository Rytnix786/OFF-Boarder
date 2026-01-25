"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton({ 
  token,
  currentEmail 
}: { 
  token: string;
  currentEmail: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      // Redirect back to the invite page after sign out
      router.push(`/employee-invite/${token}`);
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="contained" 
      color="primary" 
      onClick={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? "Signing Out..." : "Sign Out & Try Again"}
    </Button>
  );
}
