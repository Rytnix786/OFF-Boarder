"use client";

import { PaletteMode, ThemeOptions, alpha } from "@mui/material/styles";
import { stitchTokens } from "./tokens";

const t = stitchTokens;

export const getThemePalette = (mode: PaletteMode): ThemeOptions => {
  const isDark = mode === "dark";

  return {
    palette: {
      mode,
      primary: {
        main: t.colors.primary.main,
        light: t.colors.primary.light,
        dark: t.colors.primary.dark,
        contrastText: t.colors.primary.contrast,
      },
      secondary: {
        main: t.colors.accent.teal,
        light: t.colors.accent.cyan,
        dark: "#0D9488",
        contrastText: "#FFFFFF",
      },
      success: {
        main: t.colors.status.success,
        light: "#4ADE80",
        dark: "#16A34A",
        contrastText: "#FFFFFF",
      },
      warning: {
        main: t.colors.status.warning,
        light: "#FBBF24",
        dark: "#D97706",
        contrastText: "#000000",
      },
      error: {
        main: t.colors.status.error,
        light: "#F87171",
        dark: "#DC2626",
        contrastText: "#FFFFFF",
      },
      info: {
        main: t.colors.status.info,
        light: "#60A5FA",
        dark: "#2563EB",
        contrastText: "#FFFFFF",
      },
      background: {
        default: isDark ? t.colors.background.void : t.colors.background.light,
        paper: isDark ? t.colors.background.surface : t.colors.background.lightPaper,
      },
      text: {
        primary: isDark ? t.colors.text.primary.dark : t.colors.text.primary.light,
        secondary: isDark ? t.colors.text.secondary.dark : t.colors.text.secondary.light,
        disabled: isDark ? t.colors.text.disabled.dark : t.colors.text.disabled.light,
      },
      divider: isDark ? t.colors.border.subtle : t.colors.border.light,
      action: {
        active: isDark ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.54)",
        hover: isDark ? t.colors.glass.hover : "rgba(0, 0, 0, 0.04)",
        selected: isDark ? t.colors.glass.active : "rgba(0, 0, 0, 0.08)",
        disabled: isDark ? "rgba(255, 255, 255, 0.26)" : "rgba(0, 0, 0, 0.26)",
        disabledBackground: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
      },
    },
    typography: {
      fontFamily: t.typography.fontFamily.body,
      h1: {
        fontFamily: t.typography.fontFamily.display,
        fontWeight: t.typography.fontWeight.semibold,
        fontSize: t.typography.fontSize.display,
        lineHeight: t.typography.lineHeight.tight,
        letterSpacing: t.typography.letterSpacing.tight,
      },
      h2: {
        fontFamily: t.typography.fontFamily.display,
        fontWeight: t.typography.fontWeight.semibold,
        fontSize: t.typography.fontSize["4xl"],
        lineHeight: t.typography.lineHeight.tight,
        letterSpacing: t.typography.letterSpacing.tight,
      },
      h3: {
        fontFamily: t.typography.fontFamily.display,
        fontWeight: t.typography.fontWeight.semibold,
        fontSize: t.typography.fontSize["3xl"],
        lineHeight: t.typography.lineHeight.snug,
        letterSpacing: t.typography.letterSpacing.tight,
      },
      h4: {
        fontFamily: t.typography.fontFamily.display,
        fontWeight: t.typography.fontWeight.semibold,
        fontSize: t.typography.fontSize["2xl"],
        lineHeight: t.typography.lineHeight.snug,
      },
      h5: {
        fontFamily: t.typography.fontFamily.display,
        fontWeight: t.typography.fontWeight.semibold,
        fontSize: t.typography.fontSize.xl,
        lineHeight: t.typography.lineHeight.snug,
      },
      h6: {
        fontFamily: t.typography.fontFamily.display,
        fontWeight: t.typography.fontWeight.semibold,
        fontSize: t.typography.fontSize.lg,
        lineHeight: t.typography.lineHeight.snug,
      },
      subtitle1: {
        fontWeight: t.typography.fontWeight.medium,
        fontSize: t.typography.fontSize.md,
        lineHeight: t.typography.lineHeight.normal,
      },
      subtitle2: {
        fontWeight: t.typography.fontWeight.medium,
        fontSize: t.typography.fontSize.base,
        lineHeight: t.typography.lineHeight.normal,
      },
      body1: {
        fontSize: t.typography.fontSize.base,
        fontWeight: t.typography.fontWeight.normal,
        lineHeight: t.typography.lineHeight.relaxed,
      },
      body2: {
        fontSize: t.typography.fontSize.sm,
        fontWeight: t.typography.fontWeight.normal,
        lineHeight: t.typography.lineHeight.normal,
      },
      caption: {
        fontSize: t.typography.fontSize.xs,
        fontWeight: t.typography.fontWeight.medium,
        lineHeight: t.typography.lineHeight.normal,
        letterSpacing: t.typography.letterSpacing.wide,
      },
      overline: {
        fontSize: t.typography.fontSize.xs,
        fontWeight: t.typography.fontWeight.semibold,
        letterSpacing: t.typography.letterSpacing.widest,
        textTransform: "uppercase" as const,
        lineHeight: t.typography.lineHeight.normal,
      },
      button: {
        textTransform: "none" as const,
        fontWeight: t.typography.fontWeight.semibold,
        fontSize: t.typography.fontSize.sm,
        letterSpacing: t.typography.letterSpacing.normal,
      },
    },
    shape: {
      borderRadius: 8,
    },
    shadows: [
      "none",
      t.shadows.sm,
      t.shadows.default,
      t.shadows.default,
      t.shadows.md,
      t.shadows.md,
      t.shadows.md,
      t.shadows.lg,
      t.shadows.lg,
      t.shadows.lg,
      t.shadows.lg,
      t.shadows.xl,
      t.shadows.xl,
      t.shadows.xl,
      t.shadows.xl,
      t.shadows.xl,
      t.shadows["2xl"],
      t.shadows["2xl"],
      t.shadows["2xl"],
      t.shadows["2xl"],
      t.shadows["2xl"],
      t.shadows["2xl"],
      t.shadows["2xl"],
      t.shadows["2xl"],
      t.shadows["2xl"],
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            textRendering: "optimizeLegibility",
          },
          body: {
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            textRendering: "optimizeLegibility",
            fontSize: t.typography.fontSize.base,
            lineHeight: t.typography.lineHeight.relaxed,
            scrollbarColor: isDark ? `${t.colors.border.default} ${t.colors.background.void}` : undefined,
            "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
              width: 8,
              height: 8,
            },
            "&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track": {
              background: isDark ? t.colors.background.void : "#F1F5F9",
            },
            "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
              background: isDark ? t.colors.border.default : "#CBD5E1",
              borderRadius: 4,
            },
            "&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover": {
              background: isDark ? t.colors.primary.main : "#94A3B8",
            },
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: {
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: t.borderRadius.lg,
            padding: "10px 20px",
            fontWeight: t.typography.fontWeight.semibold,
            fontSize: t.typography.fontSize.sm,
            transition: t.transitions.default,
            "&:hover": {
              transform: "translateY(-1px)",
            },
            "&:active": {
              transform: "translateY(0)",
            },
          },
          contained: {
            boxShadow: "none",
            "&:hover": {
              boxShadow: t.shadows.md,
            },
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${t.colors.primary.main} 0%, ${t.colors.primary.dark} 100%)`,
            "&:hover": {
              background: `linear-gradient(135deg, ${t.colors.primary.light} 0%, ${t.colors.primary.main} 100%)`,
              boxShadow: t.shadows.neon,
            },
          },
          outlined: {
            borderColor: isDark ? t.colors.border.subtle : t.colors.border.light,
            backgroundColor: isDark ? t.colors.background.surfaceLight : "transparent",
            "&:hover": {
              borderColor: t.colors.primary.main,
              backgroundColor: isDark ? alpha(t.colors.primary.main, 0.08) : alpha(t.colors.primary.main, 0.04),
            },
          },
          text: {
            "&:hover": {
              backgroundColor: isDark ? t.colors.glass.hover : alpha(t.colors.primary.main, 0.04),
            },
          },
          sizeSmall: {
            padding: "6px 14px",
            fontSize: t.typography.fontSize.xs,
          },
          sizeLarge: {
            padding: "14px 28px",
            fontSize: t.typography.fontSize.base,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: isDark ? t.colors.background.surfaceLight : t.colors.background.lightPaper,
            borderRadius: t.borderRadius["2xl"],
            border: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`,
            boxShadow: isDark ? "none" : t.shadows.default,
            transition: t.transitions.default,
            "&:hover": {
              borderColor: isDark ? t.colors.border.default : alpha(t.colors.primary.main, 0.2),
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: isDark ? t.colors.background.surfaceLight : t.colors.background.lightPaper,
            borderRadius: t.borderRadius.xl,
          },
          outlined: {
            borderColor: isDark ? t.colors.border.subtle : t.colors.border.light,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: t.typography.fontWeight.medium,
            fontSize: t.typography.fontSize.xs,
            borderRadius: t.borderRadius.md,
          },
          sizeSmall: {
            fontSize: t.typography.fontSize.xs,
            height: 24,
          },
          sizeMedium: {
            fontSize: t.typography.fontSize.xs,
            height: 28,
          },
          filled: {
            backgroundColor: isDark ? t.colors.glass.active : alpha(t.colors.primary.main, 0.08),
          },
          outlined: {
            borderColor: isDark ? t.colors.border.subtle : t.colors.border.light,
          },
          colorSuccess: {
            backgroundColor: t.colors.status.successBg,
            color: t.colors.status.success,
            border: `1px solid ${t.colors.status.successBorder}`,
          },
          colorWarning: {
            backgroundColor: t.colors.status.warningBg,
            color: t.colors.status.warning,
            border: `1px solid ${t.colors.status.warningBorder}`,
          },
          colorError: {
            backgroundColor: t.colors.status.errorBg,
            color: t.colors.status.error,
            border: `1px solid ${t.colors.status.errorBorder}`,
          },
          colorInfo: {
            backgroundColor: t.colors.status.infoBg,
            color: t.colors.status.info,
            border: `1px solid ${t.colors.status.infoBorder}`,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: t.borderRadius.lg,
              backgroundColor: isDark ? t.colors.background.surfaceLight : "#FFFFFF",
              transition: t.transitions.default,
              fontSize: t.typography.fontSize.base,
              "& fieldset": {
                borderColor: isDark ? t.colors.border.subtle : t.colors.border.light,
                transition: t.transitions.default,
              },
              "&:hover fieldset": {
                borderColor: isDark ? t.colors.border.default : "#94A3B8",
              },
              "&.Mui-focused fieldset": {
                borderColor: t.colors.primary.main,
                borderWidth: 1,
                boxShadow: `0 0 0 3px ${alpha(t.colors.primary.main, 0.1)}`,
              },
            },
            "& .MuiInputLabel-root": {
              fontSize: t.typography.fontSize.sm,
              fontWeight: t.typography.fontWeight.medium,
            },
            "& .MuiFormHelperText-root": {
              fontSize: t.typography.fontSize.xs,
              marginTop: 6,
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: t.typography.fontSize.sm,
            fontWeight: t.typography.fontWeight.medium,
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            fontSize: t.typography.fontSize.xs,
            fontWeight: t.typography.fontWeight.normal,
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: t.borderRadius.lg,
            fontSize: t.typography.fontSize.base,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: isDark ? t.colors.border.subtle : t.colors.border.light,
            padding: "14px 16px",
            fontSize: t.typography.fontSize.sm,
          },
          head: {
            fontWeight: t.typography.fontWeight.semibold,
            fontSize: t.typography.fontSize.xs,
            textTransform: "uppercase" as const,
            letterSpacing: t.typography.letterSpacing.wider,
            color: isDark ? t.colors.text.muted.dark : t.colors.text.muted.light,
            backgroundColor: isDark ? alpha(t.colors.background.surface, 0.5) : "#F8FAFC",
            padding: "12px 16px",
          },
          body: {
            fontSize: t.typography.fontSize.sm,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: t.transitions.fast,
            "&:hover": {
              backgroundColor: isDark ? t.colors.glass.hover : "#F8FAFC",
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: t.borderRadius["2xl"],
            border: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`,
            backgroundColor: isDark ? t.colors.background.surface : t.colors.background.lightPaper,
            boxShadow: t.shadows["2xl"],
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize: t.typography.fontSize.lg,
            fontWeight: t.typography.fontWeight.semibold,
            padding: "24px 24px 16px",
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: "16px 24px",
            fontSize: t.typography.fontSize.base,
          },
        },
      },
      MuiDialogContentText: {
        styleOverrides: {
          root: {
            fontSize: t.typography.fontSize.sm,
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: "16px 24px 24px",
            gap: 8,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: t.borderRadius.xl,
            border: `1px solid ${isDark ? t.colors.border.subtle : t.colors.border.light}`,
            backgroundColor: isDark ? t.colors.background.surfaceLight : t.colors.background.lightPaper,
            boxShadow: t.shadows.xl,
            marginTop: 8,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: t.borderRadius.md,
            margin: "2px 8px",
            padding: "10px 12px",
            fontSize: t.typography.fontSize.sm,
            transition: t.transitions.fast,
            "&:hover": {
              backgroundColor: isDark ? t.colors.glass.hover : "#F1F5F9",
            },
            "&.Mui-selected": {
              backgroundColor: isDark ? alpha(t.colors.primary.main, 0.12) : alpha(t.colors.primary.main, 0.08),
              "&:hover": {
                backgroundColor: isDark ? alpha(t.colors.primary.main, 0.16) : alpha(t.colors.primary.main, 0.12),
              },
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: t.borderRadius.lg,
            transition: t.transitions.fast,
            "&.Mui-selected": {
              backgroundColor: t.colors.primary.main,
              color: "#FFFFFF",
              "&:hover": {
                backgroundColor: t.colors.primary.dark,
              },
              "& .MuiListItemIcon-root": {
                color: "#FFFFFF",
              },
            },
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            fontSize: t.typography.fontSize.sm,
            fontWeight: t.typography.fontWeight.medium,
          },
          secondary: {
            fontSize: t.typography.fontSize.xs,
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            fontWeight: t.typography.fontWeight.semibold,
            fontSize: t.typography.fontSize.sm,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: t.borderRadius.lg,
            border: "1px solid",
            fontSize: t.typography.fontSize.sm,
          },
          message: {
            fontSize: t.typography.fontSize.sm,
          },
          standardSuccess: {
            backgroundColor: t.colors.status.successBg,
            borderColor: t.colors.status.successBorder,
            color: t.colors.status.success,
          },
          standardWarning: {
            backgroundColor: t.colors.status.warningBg,
            borderColor: t.colors.status.warningBorder,
            color: t.colors.status.warning,
          },
          standardError: {
            backgroundColor: t.colors.status.errorBg,
            borderColor: t.colors.status.errorBorder,
            color: t.colors.status.error,
          },
          standardInfo: {
            backgroundColor: t.colors.status.infoBg,
            borderColor: t.colors.status.infoBorder,
            color: t.colors.status.info,
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 44,
          },
          indicator: {
            height: 3,
            borderRadius: "3px 3px 0 0",
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 44,
            fontWeight: t.typography.fontWeight.medium,
            textTransform: "none" as const,
            fontSize: t.typography.fontSize.sm,
            padding: "12px 16px",
            transition: t.transitions.fast,
            "&.Mui-selected": {
              fontWeight: t.typography.fontWeight.semibold,
            },
          },
        },
      },
      MuiBadge: {
        styleOverrides: {
          badge: {
            fontWeight: t.typography.fontWeight.semibold,
            fontSize: t.typography.fontSize.xs,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: t.borderRadius.full,
            height: 6,
            backgroundColor: isDark ? t.colors.border.subtle : "#E2E8F0",
          },
          bar: {
            borderRadius: t.borderRadius.full,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? t.colors.background.elevated : "#1E293B",
            color: "#FFFFFF",
            fontSize: t.typography.fontSize.xs,
            fontWeight: t.typography.fontWeight.medium,
            borderRadius: t.borderRadius.md,
            padding: "8px 12px",
            boxShadow: t.shadows.lg,
          },
          arrow: {
            color: isDark ? t.colors.background.elevated : "#1E293B",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: isDark ? t.colors.border.subtle : t.colors.border.light,
          },
        },
      },
      MuiSkeleton: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? t.colors.border.subtle : "#E2E8F0",
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            width: 46,
            height: 26,
            padding: 0,
          },
          switchBase: {
            padding: 3,
            "&.Mui-checked": {
              transform: "translateX(20px)",
              "& + .MuiSwitch-track": {
                backgroundColor: t.colors.primary.main,
                opacity: 1,
              },
            },
          },
          thumb: {
            width: 20,
            height: 20,
            boxShadow: t.shadows.sm,
          },
          track: {
            borderRadius: t.borderRadius.full,
            backgroundColor: isDark ? t.colors.border.default : "#CBD5E1",
            opacity: 1,
          },
        },
      },
      MuiFormControlLabel: {
        styleOverrides: {
          label: {
            fontSize: t.typography.fontSize.sm,
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            padding: 8,
          },
        },
      },
      MuiRadio: {
        styleOverrides: {
          root: {
            padding: 8,
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          markLabel: {
            fontSize: t.typography.fontSize.xs,
          },
          valueLabel: {
            fontSize: t.typography.fontSize.xs,
          },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          option: {
            fontSize: t.typography.fontSize.sm,
          },
          noOptions: {
            fontSize: t.typography.fontSize.sm,
          },
        },
      },
      MuiPagination: {
        styleOverrides: {
          root: {
            "& .MuiPaginationItem-root": {
              fontSize: t.typography.fontSize.sm,
            },
          },
        },
      },
      MuiBreadcrumbs: {
        styleOverrides: {
          root: {
            fontSize: t.typography.fontSize.sm,
          },
          li: {
            fontSize: t.typography.fontSize.sm,
          },
        },
      },
      MuiStepLabel: {
        styleOverrides: {
          label: {
            fontSize: t.typography.fontSize.sm,
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          content: {
            fontSize: t.typography.fontSize.base,
          },
        },
      },
      MuiAccordionDetails: {
        styleOverrides: {
          root: {
            fontSize: t.typography.fontSize.sm,
          },
        },
      },
    },
  };
};

export default getThemePalette;
