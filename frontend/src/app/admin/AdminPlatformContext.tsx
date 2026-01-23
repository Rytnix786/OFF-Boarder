"use client";

import React, { createContext, useContext, useState } from "react";

export type PlatformContextType = {
  incidentMode: boolean;
  setIncidentMode: (mode: boolean) => void;
  platformStatus: "OPERATIONAL" | "DEGRADED" | "INCIDENT" | "MAINTENANCE";
  refreshData: () => void;
};

export const PlatformContext = createContext<PlatformContextType>({
  incidentMode: false,
  setIncidentMode: () => {},
  platformStatus: "OPERATIONAL",
  refreshData: () => {},
});

export const usePlatformContext = () => useContext(PlatformContext);

export const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: "monitoring" },
  { href: "/admin/organizations", label: "Organizations", icon: "corporate_fare" },
  { href: "/admin/support-tickets", label: "Support Tickets", icon: "support_agent" },
  { href: "/admin/enterprise", label: "Enterprise Messages", icon: "shield" },
  { href: "/admin/policies", label: "Global Policies", icon: "gavel" },
  { href: "/admin/signals", label: "Signals", icon: "notifications_active" },
  { href: "/admin/audit", label: "Audit Log", icon: "history" },
  { href: "/admin/users", label: "Users", icon: "people" },
  { href: "/admin/ip-blocking", label: "IP Blocking", icon: "block" },
];
