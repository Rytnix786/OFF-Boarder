"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Avatar,
    Divider,
    useTheme,
} from "@mui/material";

const NAV_ITEMS = [
    { label: "Dashboard", href: "/dashboard", icon: "grid_view" },
    { label: "Offboardings", href: "/dashboard", icon: "group" }, // Placeholder for now
    { label: "Workflows", href: "/dashboard", icon: "account_tree" }, // Placeholder for now
    { label: "Integrations", href: "/integrations", icon: "extension" },
    { label: "Audit Logs", href: "/audit-logs", icon: "receipt_long" },
    { label: "Security Support", href: "/app/settings/security-support", icon: "shield_lock" },
    { label: "Settings", href: "/integrations", icon: "settings" }, // Placeholder
];


export default function Sidebar() {
    const pathname = usePathname();
    const theme = useTheme();

    return (
        <Box
            component="aside"
            sx={{
                width: { xs: 80, lg: 260 },
                flexShrink: 0,
                height: "100vh",
                borderRight: "1px solid",
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                bgcolor: "background.paper",
                transition: "width 0.3s ease",
            }}
        >
            {/* Brand */}
            <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                    sx={{
                        bgcolor: "primary.main",
                        borderRadius: 1,
                        p: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <span className="material-symbols-outlined" style={{ color: "white" }}>
                        shield_person
                    </span>
                </Box>
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 800,
                        display: { xs: "none", lg: "block" },
                        letterSpacing: -0.5,
                    }}
                >
                    OffboardHQ
                </Typography>
            </Box>

            {/* Nav Items */}
            <List sx={{ px: 2, mt: 1, flex: 1 }}>
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <ListItem key={item.label} disablePadding sx={{ mb: 1 }}>
                            <Link href={item.href} passHref style={{ textDecoration: 'none', width: '100%' }}>
                                <ListItemButton
                                    sx={{
                                        borderRadius: 2,
                                        bgcolor: isActive ? "primary.main" : "transparent",
                                        color: isActive ? "white" : "text.secondary",
                                        "&:hover": {
                                            bgcolor: isActive ? "primary.dark" : "action.hover",
                                            color: isActive ? "white" : "text.primary",
                                        },
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 40,
                                            color: "inherit",
                                        }}
                                    >
                                        <span className="material-symbols-outlined icon-sidebar">{item.icon}</span>
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.label}
                                        sx={{
                                            display: { xs: "none", lg: "block" },
                                            "& .MuiTypography-root": {
                                                fontWeight: isActive ? 600 : 500,
                                                fontSize: "0.9375rem",
                                            },
                                        }}
                                    />
                                </ListItemButton>
                            </Link>
                        </ListItem>
                    );
                })}
            </List>

            {/* User Session */}
            <Divider />
            <Box sx={{ p: 2 }}>
                <ListItemButton sx={{ borderRadius: 2, py: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                        <Avatar
                            sx={{ width: 32, height: 32 }}
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDG6qmrUQyMDSLzXs4C9qgZRJpoIPmpxpY_pq9DKtXDHGESIXaBeGReenbPzxStLbdCCib0ORmgLd3S40WCXXkYS9AWbSGcNvK35Y2vANLasj3nf6wvEN5GDENa4638D4BanchD52G-xZyw2qM98PKCD_0OCKBbt_HMP1_vxTTl5xEJwaUBvfdtBm4p2RUq1r5TksJwVfznqhLzmW9yXGmVrf6QgD1JnC705yY9e8QUnyjgXK_3tn4iQ0lPWUqNbnHfCi9Fay-LkmL6"
                        />
                    </ListItemIcon>
                    <Box sx={{ display: { xs: "none", lg: "block" }, ml: 1, overflow: "hidden" }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                            Admin Console
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            v1.0.4-beta
                        </Typography>
                    </Box>
                </ListItemButton>
            </Box>
        </Box>
    );
}
