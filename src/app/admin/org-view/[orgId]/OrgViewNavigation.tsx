"use client";

import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, alpha } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  icon: string;
  href: string;
}

interface OrgViewNavigationProps {
  navItems: NavItem[];
}

export function OrgViewNavigation({ navItems }: OrgViewNavigationProps) {
  const pathname = usePathname();

  return (
    <List sx={{ px: 2, py: 2 }}>
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              href={item.href}
              sx={{
                borderRadius: 2,
                bgcolor: isActive ? alpha("#6366f1", 0.1) : "transparent",
                color: isActive ? "#4f46e5" : "#64748b",
                "&:hover": {
                  bgcolor: isActive ? alpha("#6366f1", 0.15) : "#f8fafc",
                  color: isActive ? "#4f46e5" : "#0f172a",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
                <span className="material-symbols-outlined">{item.icon}</span>
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: "0.875rem",
                  fontWeight: isActive ? 600 : 500,
                }}
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
}
