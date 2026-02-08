"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  IconButton,
  Alert,
  Snackbar,
  alpha,
  Divider,
} from "@mui/material";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { markNotificationAsRead, markAllNotificationsRead } from "@/lib/actions/employee-notifications";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
};

interface NotificationsClientProps {
  notifications: Notification[];
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "task_assigned":
      return "assignment";
    case "task_completed":
      return "task_alt";
    case "offboarding_started":
      return "exit_to_app";
    case "approval_required":
      return "approval";
    case "security_alert":
      return "security";
    case "monitoring_alert":
      return "monitoring";
    default:
      return "notifications";
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "task_assigned":
      return "#f59e0b";
    case "security_alert":
      return "#ef4444";
    case "approval_required":
      return "#3b82f6";
    default:
      return "#6b7280";
  }
};

export default function NotificationsClient({ notifications }: NotificationsClientProps) {
  const router = useRouter();
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string } | null>(null);
  const [localNotifications, setLocalNotifications] = useState(notifications);

  const unreadCount = localNotifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id: string) => {
    const result = await markNotificationAsRead(id);
    if (result.success) {
      setLocalNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  };

  const handleMarkAllRead = async () => {
    const result = await markAllNotificationsRead();
    if (result.success) {
      setLocalNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setSnackbar({ open: true, message: "All notifications marked as read" });
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US");
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Notifications
          </Typography>
          <Typography color="text.secondary">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
          </Typography>
        </Box>
        {unreadCount > 0 && (
          <Button
            variant="outlined"
            size="small"
            onClick={handleMarkAllRead}
            startIcon={<span className="material-symbols-outlined">done_all</span>}
          >
            Mark All Read
          </Button>
        )}
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        {localNotifications.length === 0 ? (
          <CardContent sx={{ py: 8, textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.3 }}>
              notifications_none
            </span>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              No notifications yet
            </Typography>
          </CardContent>
        ) : (
          <List disablePadding>
            {localNotifications.map((notification, idx) => (
              <React.Fragment key={notification.id}>
                {idx > 0 && <Divider />}
                <ListItem
                  disablePadding
                  secondaryAction={
                    !notification.read && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(notification.id);
                        }}
                        title="Mark as read"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          check
                        </span>
                      </IconButton>
                    )
                  }
                >
                  <ListItemButton
                    onClick={() => {
                      if (!notification.read) handleMarkRead(notification.id);
                      if (notification.link) router.push(notification.link);
                    }}
                    sx={{
                      py: 2,
                      px: 3,
                      bgcolor: notification.read ? "transparent" : alpha("#3b82f6", 0.03),
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 48 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          bgcolor: alpha(getNotificationColor(notification.type), 0.1),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 20, color: getNotificationColor(notification.type) }}
                        >
                          {getNotificationIcon(notification.type)}
                        </span>
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography
                            variant="body2"
                            fontWeight={notification.read ? 500 : 700}
                            sx={{ flex: 1 }}
                          >
                            {notification.title}
                          </Typography>
                          {!notification.read && (
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                bgcolor: "#3b82f6",
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {formatDate(notification.createdAt)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Card>

      <Snackbar
        open={snackbar?.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar?.message}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
