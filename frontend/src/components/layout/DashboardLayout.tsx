"use client";

import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Box } from "@mui/material";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
            <Sidebar />
            <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                <Header />
                <Box component="main" sx={{ flexGrow: 1, p: { xs: 3, md: 6 } }}>
                    {children}
                </Box>
            </Box>
        </Box>
    );
}
