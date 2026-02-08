"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  alpha,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { useRouter } from "next/navigation";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export default function PlatformNotificationCenter() {
  const theme = useTheme();
  const router = useRouter();
  const isDark = theme.palette.mode === "dark";
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const open = Boolean(anchorEl);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkRead = async (id: string, link: string | null) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      
      if (link) {
        router.push(link);
        handleClose();
      }
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "security_alert": return "security";
      case "enterprise_inquiry": return "business_center";
      case "system_update": return "system_update_alt";
      case "error_report": return "error_outline";
      default: return "notifications";
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "security_alert": return theme.palette.error.main;
      case "enterprise_inquiry": return theme.palette.primary.main;
      case "system_update": return theme.palette.info.main;
      case "error_report": return theme.palette.warning.main;
      default: return theme.palette.text.secondary;
    }
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          color: isDark ? "#94a3b8" : "#64748b",
          bgcolor: isDark ? alpha("#ffffff", 0.05) : alpha("#000000", 0.03),
          "&:hover": {
            bgcolor: isDark ? alpha("#ffffff", 0.1) : alpha("#000000", 0.06),
            color: isDark ? "#ffffff" : "#0f172a",
          },
        }}
      >
        <Badge 
          badgeContent={unreadCount} 
          color="primary"
          sx={{
            "& .MuiBadge-badge": {
              fontSize: "0.625rem",
              height: 16,
              minWidth: 16,
              fontWeight: 700,
            }
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
            notifications
          </span>
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 480,
            mt: 1.5,
            borderRadius: 3,
            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
            bgcolor: isDark ? "#121214" : "#ffffff",
            border: "1px solid",
            borderColor: isDark ? "#1f1f23" : "#f1f5f9",
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllRead} sx={{ fontSize: "0.75rem", fontWeight: 600 }}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />
        
        {loading && notifications.length === 0 ? (
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ py: 0 }}>
            {notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => handleMarkRead(notification.id, notification.link)}
                sx={{
                  py: 1.5,
                  px: 2,
                  whiteSpace: "normal",
                  bgcolor: notification.read ? "transparent" : alpha(theme.palette.primary.main, 0.04),
                  borderBottom: "1px solid",
                  borderColor: isDark ? alpha("#ffffff", 0.05) : alpha("#000000", 0.03),
                  "&:last-child": { borderBottom: 0 },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      bgcolor: alpha(getColor(notification.type), 0.1),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18, color: getColor(notification.type) }}
                    >
                      {getIcon(notification.type)}
                    </span>
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={notification.read ? 500 : 700}>
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      {notification.message}
                    </Typography>
                  }
                />
                {!notification.read && (
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      ml: 1,
                    }}
                  />
                )}
              </MenuItem>
            ))}
          </List>
        )}
        
        <Divider />
        <Box sx={{ p: 1, textAlign: "center" }}>
          <Button fullWidth size="small" onClick={handleClose} sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
            Close
          </Button>
        </Box>
      </Menu>
    </>
  );
}
