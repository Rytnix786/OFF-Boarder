"use client";

import React, { useContext, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Divider,
  Tooltip,
  alpha,
  useTheme,
} from "@mui/material";
import Link from "next/link";
import { ColorModeContext } from "@/theme/ThemeRegistry";
import { motion } from "framer-motion";
import { RiskRadarAnimation } from "@/components/ui/RiskRadarAnimation";

import { EnterpriseContactModal } from "@/components/EnterpriseContactModal";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const MotionBox = motion.create(Box);
const MotionTypography = motion.create(Typography);

export default function LandingPage() {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const isDark = theme.palette.mode === "dark";
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");

  const handleContactClick = (message: string = "") => {
    setInitialMessage(message);
    setContactModalOpen(true);
  };

    const cardStyle = {
      height: "100%",
      borderRadius: 1.5,
      borderColor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.08),
    bgcolor: isDark ? alpha("#0B0F1A", 0.6) : "#fff",
    backdropFilter: "blur(10px)",
    transition: "all 350ms cubic-bezier(0.22, 1, 0.36, 1)",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: isDark 
      ? `0 4px 20px ${alpha("#000", 0.4)}, inset 0 1px 1px ${alpha("#fff", 0.08)}`
      : `0 4px 20px ${alpha("#000", 0.05)}, inset 0 1px 1px ${alpha("#fff", 0.8)}`,
    "&:hover": {
      borderColor: alpha(theme.palette.primary.main, 0.4),
      transform: "translateY(-6px)",
      bgcolor: isDark ? alpha("#0B0F1A", 0.8) : "#fff",
      boxShadow: isDark
        ? `0 30px 60px -12px ${alpha("#000", 0.7)}, 0 0 30px ${alpha(theme.palette.primary.main, 0.2)}, inset 0 1px 1px ${alpha("#fff", 0.15)}`
        : `0 30px 60px -12px ${alpha("#000", 0.15)}, 0 0 30px ${alpha(theme.palette.primary.main, 0.1)}, inset 0 1px 1px ${alpha("#fff", 1)}`,
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <EnterpriseContactModal 
        open={contactModalOpen} 
        onClose={() => setContactModalOpen(false)} 
        initialMessage={initialMessage}
      />

      <Box
        component="nav"
        sx={{
          position: "sticky",
          top: 16,
          mx: { xs: 2, md: 4 },
          zIndex: 1000,
            bgcolor: isDark ? alpha("#0B0F1A", 0.72) : alpha("#fff", 0.8),
            backdropFilter: "blur(20px) saturate(180%)",
            borderRadius: 1,
            border: "1px solid",
            borderColor: isDark ? alpha("#fff", 0.1) : alpha("#000", 0.08),
            boxShadow: isDark 
              ? `0 12px 32px -4px rgba(0, 0, 0, 0.6), inset 0 1px 1px ${alpha("#fff", 0.05)}`
              : `0 12px 32px -4px rgba(0, 0, 0, 0.08), inset 0 1px 1px ${alpha("#fff", 0.8)}`,
            transition: "all 300ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <Container maxWidth="lg">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 1.2,
              }}
            >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  bgcolor: "primary.main",
                  borderRadius: 1.5,
                  p: 1,
                  display: "flex",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: "white", fontSize: 24 }}
                >
                  shield_person
                </span>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
                OffboardHQ
              </Typography>
            </Box>

            <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 4 }}>
              {["Platform", "Security", "Compliance", "Pricing"].map((item) => (
                <Typography
                  key={item}
                  component="a"
                  href={`#${item.toLowerCase()}`}
                  sx={{
                    color: "text.secondary",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    transition: "all 200ms ease",
                    position: "relative",
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      bottom: -4,
                      left: 0,
                      width: 0,
                      height: 2,
                      bgcolor: "primary.main",
                      transition: "width 200ms ease",
                    },
                    "&:hover": { 
                      color: "text.primary",
                      "&::after": { width: "100%" }
                    },
                  }}
                >
                  {item}
                </Typography>
              ))}
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <ThemeToggle size="small" />
              <Link href="/login" passHref style={{ textDecoration: "none" }}>
                <Button sx={{ fontWeight: 600, color: "text.primary" }}>Sign In</Button>
              </Link>
              <Link href="/register" passHref style={{ textDecoration: "none" }}>
                <Button
                  variant="contained"
                  sx={{
                    fontWeight: 600,
                    px: 2.5,
                    borderRadius: 1.5,
                    fontSize: "0.85rem",
                    textTransform: "none",
                  }}
                >
                  Start Trial
                </Button>
              </Link>
            </Box>
          </Box>
        </Container>
      </Box>

      <Box
        sx={{
          pt: { xs: 10, md: 14 },
          pb: { xs: 12, md: 18 },
          background: isDark
            ? `radial-gradient(circle at 50% -20%, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 70%),
               radial-gradient(circle at 0% 0%, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 40%),
               radial-gradient(circle at 100% 100%, ${alpha(theme.palette.secondary.main, 0.05)} 0%, transparent 40%),
               #05070A`
            : `radial-gradient(circle at 50% -20%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 70%),
               radial-gradient(circle at 0% 0%, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 40%),
               radial-gradient(circle at 100% 100%, ${alpha(theme.palette.secondary.main, 0.03)} 0%, transparent 40%),
               #F8FAFC`,
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            opacity: isDark ? 0.03 : 0.02,
            pointerEvents: "none",
            mixBlendMode: isDark ? "overlay" : "multiply",
          }
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={8} alignItems="center">
            <Grid size={{ xs: 12, lg: 6 }}>
              <MotionBox initial="initial" animate="animate" variants={stagger}>
                <MotionBox variants={fadeInUp}>
                  <Typography
                    variant="overline"
                    sx={{
                      display: "inline-block",
                      color: "primary.main",
                      fontWeight: 700,
                      letterSpacing: 1.5,
                      mb: 3,
                      fontSize: "0.75rem",
                    }}
                  >
                    THE SYSTEM OF RECORD FOR SECURE OFFBOARDING
                  </Typography>
                </MotionBox>

                <MotionTypography
                  variant="h1"
                  variants={fadeInUp}
                  sx={{
                    fontSize: { xs: "2.5rem", md: "3.5rem" },
                    fontWeight: 800,
                    letterSpacing: -2,
                    lineHeight: 1.08,
                    mb: 3,
                  }}
                >
                  Every employee exit verified.
                  <br />
                  Every access revoked.
                  <br />
                  <Box
                    component="span"
                    sx={{
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Every audit defensible.
                  </Box>
                </MotionTypography>

                <MotionTypography
                  variant="h6"
                  variants={fadeInUp}
                  sx={{
                    color: "text.secondary",
                    fontWeight: 400,
                    mb: 4,
                    lineHeight: 1.7,
                    fontSize: "1.05rem",
                    maxWidth: 460,
                  }}
                >
                  We enforce offboarding so no accounts linger, no assets disappear, and no audit becomes a fire drill.
                </MotionTypography>

                <MotionBox variants={fadeInUp} sx={{ mb: 4 }}>
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => handleContactClick("I'd like to book a 15-min Offboarding Risk Check.")}
                      sx={{
                        fontWeight: 700,
                        px: 4,
                        py: 1.75,
                        borderRadius: 1.5,
                        fontSize: "0.95rem",
                        minWidth: 200,
                        height: 52,
                        boxShadow: `0 4px 15px ${alpha(theme.palette.primary.main, 0.25)}`,
                        textTransform: "none",
                        position: "relative",
                        overflow: "hidden",
                        transition: "all 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: "-100%",
                          width: "100%",
                          height: "100%",
                          background: `linear-gradient(90deg, transparent, ${alpha("#ffffff", 0.3)}, transparent)`,
                          transition: "none",
                        },
                        "&:hover": {
                          boxShadow: `0 12px 30px ${alpha(theme.palette.primary.main, 0.5)}`,
                          transform: "translateY(-3px)",
                          "&::before": {
                            left: "100%",
                            transition: "left 700ms ease-in-out"
                          }
                        },
                        "&:active": {
                          transform: "translateY(0)",
                          boxShadow: `0 2px 10px ${alpha(theme.palette.primary.main, 0.3)}`
                        },
                      }}
                    >
                      Book a 15-min Offboarding Risk Check
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => document.getElementById("platform")?.scrollIntoView({ behavior: "smooth" })}
                      sx={{
                        fontWeight: 600,
                        px: 3.5,
                        py: 1.75,
                        borderRadius: 1.5,
                        fontSize: "0.95rem",
                        height: 52,
                        color: "text.primary",
                        textTransform: "none",
                        position: "relative",
                        borderColor: isDark ? alpha("#fff", 0.18) : alpha("#000", 0.18),
                        borderWidth: 1.5,
                        transition: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)",
                        backgroundColor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.01),
                        "&:hover": {
                          borderColor: theme.palette.primary.main,
                          backgroundColor: isDark ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.05),
                          transform: "translateY(-1px)",
                          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`
                        },
                        "&:active": {
                          transform: "translateY(0)",
                          boxShadow: `0 2px 6px ${alpha(theme.palette.primary.main, 0.1)}`
                        }
                      }}
                      endIcon={
                        <span className="material-symbols-outlined" style={{ fontSize: 18, opacity: 0.7 }}>
                          play_circle
                        </span>
                      }
                    >
                      Explore How It Works
                    </Button>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      ml: 0.5,
                    }}
                  >
                    <span>No commitment</span>
                    <span style={{ opacity: 0.4 }}>•</span>
                    <span>No install required</span>
                  </Typography>
                </MotionBox>

                <MotionBox variants={fadeInUp}>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1.5,
                    }}
                  >
                    {TRUST_BADGES.map((badge) => (
                      <Box
                        key={badge.label}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.25,
                          px: 2.5,
                          py: 1.25,
                          borderRadius: 1.5,
                          bgcolor: isDark ? alpha("#fff", 0.04) : alpha("#000", 0.02),
                          border: "1.5px solid",
                          borderColor: isDark ? alpha("#fff", 0.12) : alpha("#000", 0.1),
                          transition: "all 200ms cubic-bezier(0.22, 1, 0.36, 1)",
                          cursor: "pointer",
                          position: "relative",
                          overflow: "hidden",
                          "&:hover": {
                            bgcolor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.04),
                            borderColor: alpha(theme.palette.primary.main, 0.5),
                            transform: "translateY(-2px)",
                            boxShadow: `0 6px 15px ${alpha(theme.palette.primary.main, 0.15)}`
                          }
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 18, color: theme.palette.primary.main }}
                        >
                          {badge.icon}
                        </span>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontWeight: 700, 
                            color: "text.primary",
                            fontSize: "0.8rem",
                            letterSpacing: 0.2,
                            position: "relative",
                            zIndex: 1
                          }}
                        >
                          {badge.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </MotionBox>
              </MotionBox>
            </Grid>

            <Grid size={{ xs: 12, lg: 6 }}>
              <MotionBox
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                sx={{ position: "relative" }}
              >
                <Box
                  sx={{
                    position: "relative",
                    zIndex: 1,
                    borderRadius: 1.5,
                    overflow: "hidden",
                    border: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#000", 0.08)}`,
                  }}
                >
                  <RiskRadarAnimation autoplay={true} loop={false} />
                </Box>
              </MotionBox>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box
        sx={{
          py: 5,
          borderTop: "1px solid",
          borderBottom: "1px solid",
          borderColor: isDark ? alpha("#fff", 0.06) : alpha("#000", 0.06),
          bgcolor: isDark ? alpha("#fff", 0.01) : alpha("#000", 0.01),
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography
              variant="overline"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
                letterSpacing: 1.5,
                fontSize: "0.7rem",
              }}
            >
              DESIGNED FOR CISOS, IT, AND COMPLIANCE LEADERS
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: { xs: 3, md: 6 },
              flexWrap: "wrap",
            }}
          >
            {["SOC 2", "ISO 27001", "GDPR", "HIPAA Ready", "Zero Trust"].map((badge) => (
              <Box
                key={badge}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18, color: theme.palette.primary.main }}
                >
                  check_circle
                </span>
                <Typography
                  sx={{
                    fontWeight: 600,
                    color: "text.secondary",
                    fontSize: "0.9rem",
                  }}
                >
                  {badge}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      <Box id="platform" sx={{ py: { xs: 14, md: 20 } }}>
        <Container maxWidth="lg">
          <MotionBox
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true, margin: "-100px" }}
            sx={{ textAlign: "center", mb: 10 }}
          >
      <Typography
        variant="overline"
        sx={{
          color: "primary.main",
          fontWeight: 800,
          letterSpacing: 2.5,
          mb: 2.5,
          display: "block",
          fontSize: "0.85rem",
          opacity: 0.9,
        }}
      >
        THE RISK
      </Typography>
      <Typography
        variant="h2"
        sx={{
          fontWeight: 900,
          letterSpacing: -2,
          mb: 3.5,
          fontSize: { xs: "2.5rem", md: "4rem" },
          lineHeight: 1.1,
        }}
      >
        Employee exits are your biggest
        <br />
        hidden security risk
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: "text.secondary",
          maxWidth: 720,
          mx: "auto",
          lineHeight: 1.8,
          fontSize: "1.25rem",
          fontWeight: 500,
          mb: 6,
        }}
      >
        Most companies assume offboarding is handled.
      </Typography>
      <Box 
        sx={{ 
          textAlign: "left", 
          maxWidth: 520, 
          mx: "auto",
          bgcolor: isDark ? alpha("#fff", 0.04) : alpha("#000", 0.02),
          p: { xs: 5, md: 7 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.08),
          boxShadow: isDark 
            ? `0 32px 64px -16px rgba(0, 0, 0, 0.6), inset 0 1px 1px ${alpha("#fff", 0.05)}`
            : `0 32px 64px -16px rgba(0, 0, 0, 0.1), inset 0 1px 1px ${alpha("#fff", 0.8)}`,
        }}
      >
        <Typography 
          variant="subtitle1" 
          fontWeight={800} 
          sx={{ 
            mb: 4, 
            fontSize: "1.1rem",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: "text.primary" 
          }}
        >
          In reality:
        </Typography>
        {[
          "Access removal is manual and inconsistent",
          "Ownership is unclear between HR and IT",
          "There’s no proof when audits happen"
        ].map((item, i) => (
          <Box key={i} sx={{ display: "flex", gap: 3, mb: 3 }}>
            <Box 
              sx={{ 
                width: 10, 
                height: 10, 
                borderRadius: "50%", 
                bgcolor: "primary.main", 
                mt: 1, 
                flexShrink: 0,
                boxShadow: `0 0 12px ${alpha(theme.palette.primary.main, 0.6)}` 
              }} 
            />
            <Typography variant="body1" color="text.secondary" fontWeight={600} sx={{ fontSize: "1.05rem" }}>
              {item}
            </Typography>
          </Box>
        ))}
        <Box sx={{ mt: 5, pt: 4, borderTop: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#000", 0.08)}` }}>
          <Typography 
            variant="body1" 
            color="text.primary" 
            fontWeight={800} 
            sx={{ 
              textAlign: "center",
              fontSize: "1.15rem",
              letterSpacing: -0.2
            }}
          >
            All it takes is one missed account.
          </Typography>
        </Box>
      </Box>
          </MotionBox>
        </Container>
      </Box>

      <Box
        id="security"
        sx={{
          py: { xs: 14, md: 20 },
          bgcolor: isDark ? alpha("#fff", 0.01) : "#FAFBFC",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 10 }}>
            <Typography
              variant="overline"
              sx={{
                color: "primary.main",
                fontWeight: 700,
                letterSpacing: 1.5,
                mb: 2,
                display: "block",
                fontSize: "0.75rem",
              }}
            >
              THE CONTROL
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                letterSpacing: -1.5,
                mb: 3,
                fontSize: { xs: "2rem", md: "2.75rem" },
              }}
            >
              We make offboarding boring — and safe
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "text.secondary",
                maxWidth: 600,
                mx: "auto",
                lineHeight: 1.8,
                fontSize: "1.05rem",
              }}
            >
              Offboarding should be predictable, enforced, and provable.
              We don’t rely on memory, spreadsheets, or good intentions.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {CONTROL_FEATURES.map((feature, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                <MotionBox
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  sx={{ height: "100%" }}
                >
                  <Card variant="outlined" sx={cardStyle}>
                    <CardContent sx={{ p: 3.5 }}>
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: 1,
                          bgcolor: isDark ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.08),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mb: 3,
                          position: "relative",
                          border: `1px solid ${isDark ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.1)}`,
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ 
                            fontSize: 24, 
                            color: theme.palette.primary.main,
                          }}
                        >
                          {feature.icon}
                        </span>
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, fontSize: "1.1rem", color: isDark ? "#FFFFFF" : "#0F172A" }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: isDark ? "#E2E8F0" : "#475569", lineHeight: 1.7, fontSize: "0.95rem" }}>
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box id="compliance" sx={{ py: { xs: 14, md: 20 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 10 }}>
            <Typography
              variant="overline"
              sx={{
                color: "primary.main",
                fontWeight: 700,
                letterSpacing: 1.5,
                mb: 2,
                display: "block",
                fontSize: "0.75rem",
              }}
            >
              THE OUTCOME
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                letterSpacing: -1.5,
                mb: 3,
                fontSize: { xs: "2rem", md: "2.75rem" },
              }}
            >
              What breaks without enforcement
            </Typography>
          </Box>

          <Grid container spacing={3}>
              {[
                { 
                  icon: "block", 
                  text: "Accounts stay active", 
                  desc: "Ghost accounts linger for months, providing a backdoor to your sensitive data.",
                  xs: 12, md: 8,
                  color: "#EF4444" // theme.palette.error.main
                },
                { 
                  icon: "inventory_2", 
                  text: "Assets go missing", 
                  desc: "Laptops and hardware disappear into the void without a verified chain of custody.",
                  xs: 12, md: 4,
                  color: "#F59E0B" // theme.palette.warning.main
                },
                { 
                  icon: "description", 
                  text: "Audits turn into guesswork", 
                  desc: "Scrambling for proof during SOC2 audits because steps weren't documented.",
                  xs: 12, md: 12,
                  color: "#3B82F6" // theme.palette.info.main
                }
              ].map((item, i) => (
                <Grid size={{ xs: item.xs, md: item.md }} key={i}>
                  <MotionBox
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    sx={{ height: "100%" }}
                  >
                    <Card 
                      variant="outlined"
                      sx={{ 
                        ...cardStyle,
                        p: 3.5,
                        "&:hover": {
                          ...cardStyle["&:hover"],
                          borderColor: alpha(item.color, 0.4),
                        }
                      }}
                    >
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span 
                        className="material-symbols-outlined" 
                        style={{ 
                          color: item.color, 
                          fontSize: 32 
                        }}
                      >
                        {item.icon}
                      </span>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, letterSpacing: -0.5 }}>
                          {item.text}
                        </Typography>
                        <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.6, maxWidth: 500 }}>
                          {item.desc}
                        </Typography>
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: -20,
                        right: -20,
                        opacity: 0.03,
                        transform: "rotate(-15deg)",
                        pointerEvents: "none"
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 160 }}>
                        {item.icon}
                      </span>
                    </Box>
                  </Card>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box id="pricing" sx={{ py: { xs: 14, md: 20 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 8 }}>
            <MotionBox
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2,
                  py: 0.75,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: "primary.main",
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  mb: 3,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
                <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>
                  14-Day Free Trial Available
                </Typography>
              </MotionBox>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                letterSpacing: -1.5,
                mb: 2,
                fontSize: { xs: "2rem", md: "2.5rem" },
              }}
            >
              Pricing that doesn’t penalize headcount
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "text.secondary",
                maxWidth: 480,
                mx: "auto",
                fontSize: "1rem",
                lineHeight: 1.7,
              }}
            >
              Pricing reflects organizational complexity — not how many people you employ.
            </Typography>
          </Box>

          <Grid container spacing={2.5} justifyContent="center">
            {PRICING.map((plan, index) => (
              <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={index}>
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.4 }}
                  viewport={{ once: true }}
                  sx={{ height: "100%" }}
                >
                        <Card
                          variant="outlined"
                          sx={{
                            ...cardStyle,
                            "&:hover": {
                              ...cardStyle["&:hover"],
                              ...(plan.name === "Free Trial" && {
                                background: isDark
                                  ? `linear-gradient(165deg, ${alpha(theme.palette.primary.main, 0.18)} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`
                                  : `linear-gradient(165deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                                borderColor: theme.palette.primary.main,
                                boxShadow: isDark
                                  ? `0 25px 50px -12px ${alpha("#000", 0.7)}, 0 0 30px ${alpha(theme.palette.primary.main, 0.3)}`
                                  : `0 25px 50px -12px ${alpha("#000", 0.1)}, 0 0 30px ${alpha(theme.palette.primary.main, 0.2)}`,
                              }),
                              ...(plan.popular && {
                                background: isDark
                                  ? `linear-gradient(165deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`
                                  : `linear-gradient(165deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.main, 0.01)} 100%)`,
                                borderColor: theme.palette.primary.main,
                                boxShadow: isDark
                                  ? `0 30px 60px -12px ${alpha("#000", 0.7)}, 0 0 40px ${alpha(theme.palette.primary.main, 0.25)}`
                                  : `0 30px 60px -12px ${alpha("#000", 0.15)}, 0 0 40px ${alpha(theme.palette.primary.main, 0.15)}`,
                              })
                            }
                          }}
                        >
                      {plan.popular && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 4,
                            background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}, transparent)`,
                          }}
                        />
                      )}
                      <CardContent sx={{ p: 4, flex: 1, display: "flex", flexDirection: "column" }}>
                        <Box sx={{ mb: 3 }}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                            <Typography 
                              variant="overline" 
                              sx={{ 
                                fontWeight: 800, 
                                fontSize: "0.8rem",
                                letterSpacing: 1.8,
                                color: plan.popular ? "primary.main" : isDark ? "#E2E8F0" : "#475569",
                              }}
                            >
                              {plan.name}
                            </Typography>
                            {plan.popular && (
                              <Box
                                sx={{
                                  px: 1.5,
                                  py: 0.5,
                                  borderRadius: 1.5,
                                  bgcolor: "primary.main",
                                  color: "white",
                                  fontWeight: 800,
                                  fontSize: "0.65rem",
                                  letterSpacing: 0.5,
                                  textTransform: "uppercase",
                                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                                }}
                              >
                                Popular
                              </Box>
                            )}
                          </Box>
                        <Typography variant="body2" sx={{ color: isDark ? "#E2E8F0" : "#475569", fontSize: "0.95rem", lineHeight: 1.6, minHeight: "3rem" }}>
                          {plan.description}
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 5, minHeight: "4.5rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <Box sx={{ display: "flex", alignItems: "baseline" }}>
                          <Typography sx={{ fontSize: "3rem", fontWeight: 800, lineHeight: 1, letterSpacing: -2, color: isDark ? "#FFFFFF" : "#0F172A" }}>
                            {plan.price}
                          </Typography>
                          {plan.period && (
                            <Typography sx={{ color: isDark ? "#E2E8F0" : "#64748B", ml: 1, fontSize: "1rem", fontWeight: 600 }}>
                              /{plan.period}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ color: isDark ? "#E2E8F0" : "#64748B", mt: 1.5, display: "flex", alignItems: "center", gap: 0.5, fontWeight: 600, fontSize: "0.75rem" }}>
                          {plan.isTrial ? (
                            <>
                              <span className="material-symbols-outlined" style={{ fontSize: 16, color: theme.palette.primary.main }}>schedule</span>
                              14-day free trial
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_today</span>
                              Billed monthly
                            </>
                          )}
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 4 }}>
                            <Button
                              fullWidth
                              variant="outlined"
                              onClick={() => {
                                if (plan.name === "Enterprise") {
                                  handleContactClick("I'm interested in the Enterprise plan.");
                                } else {
                                  const params = new URLSearchParams();
                                  params.set("plan", plan.name.toLowerCase());
                                  if (plan.isTrial) params.set("trial", "true");
                                  window.location.href = `/register?${params.toString()}`;
                                }
                              }}
                                sx={{
                                  fontWeight: 800,
                                  py: 2,
                                  borderRadius: 1.5,
                                  fontSize: "0.95rem",
                                  textTransform: "none",
                                  transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                                  borderColor: isDark ? alpha("#fff", 0.15) : alpha("#000", 0.15),
                                  color: "text.primary",
                                  borderWidth: 2,
                                  ...(plan.name === "Free Trial" && {
                                    background: "transparent",
                                    borderColor: theme.palette.primary.main,
                                    color: "primary.main",
                                    "&:hover": {
                                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                                      borderColor: "transparent",
                                      color: "white",
                                      boxShadow: `0 15px 30px ${alpha(theme.palette.primary.main, 0.5)}`,
                                      transform: "scale(1.04) translateY(-2px)",
                                    }
                                  }),
                                  ...(plan.name !== "Free Trial" && {
                                    "&:hover": {
                                      bgcolor: theme.palette.primary.main,
                                      borderColor: theme.palette.primary.main,
                                      color: "white",
                                      boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                                      transform: "scale(1.02)",
                                    }
                                  }),
                                }}
                            >
                          {plan.cta}
                        </Button>
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            display: "block", 
                            mb: 2, 
                            fontWeight: 700, 
                            color: isDark ? "#E2E8F0" : "#475569",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            fontSize: "0.65rem"
                          }}
                        >
                          Key Features
                        </Typography>
                        {plan.features.map((feature, idx) => {
                          const isObject = typeof feature === "object";
                          const text = isObject ? feature.text : feature;
                          const tooltip = isObject ? feature.tooltip : null;
                          
                          return (
                            <Box key={idx} sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, mb: 1.5 }}>
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: 16, color: theme.palette.primary.main, marginTop: 1 }}
                              >
                                check_circle
                              </span>
                              <Typography variant="body2" sx={{ fontSize: "0.9rem", lineHeight: 1.5, display: "flex", alignItems: "center", gap: 0.5, fontWeight: 500, color: isDark ? "#E2E8F0" : "#475569" }}>
                                {text}
                                {tooltip && (
                                  <Tooltip title={tooltip} arrow placement="top">
                                    <span className="material-symbols-outlined" style={{ fontSize: 16, opacity: 0.4, cursor: "help" }}>help</span>
                                  </Tooltip>
                                )}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </CardContent>
                  </Card>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          py: 8,
          borderTop: "1px solid",
          borderColor: isDark ? alpha("#fff", 0.06) : alpha("#000", 0.06),
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    bgcolor: "primary.main",
                    borderRadius: 1.5,
                    p: 1,
                    display: "flex",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: "white", fontSize: 24 }}
                  >
                    shield_person
                  </span>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  OffboardHQ
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 280 }}>
                The system of record for secure employee offboarding.
                Built for security and compliance teams.
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Platform</Typography>
              {["Missed Access Detection", "Workflows", "Integrations", "API"].map((item) => (
                <Typography key={item} variant="body2" sx={{ color: "text.secondary", mb: 1.5, cursor: "pointer" }}>{item}</Typography>
              ))}
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Company</Typography>
              {["About", "Security", "Careers", "Contact"].map((item) => (
                <Typography
                  key={item}
                  variant="body2"
                  onClick={() => item === "Contact" && handleContactClick("General inquiry.")}
                  sx={{ color: "text.secondary", mb: 1.5, cursor: "pointer", "&:hover": { color: "primary.main" } }}
                >
                  {item}
                </Typography>
              ))}
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Resources</Typography>
              {["Documentation", "Compliance", "Status", "Support"].map((item) => (
                <Typography key={item} variant="body2" sx={{ color: "text.secondary", mb: 1.5, cursor: "pointer" }}>{item}</Typography>
              ))}
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Legal</Typography>
              {["Privacy", "Terms", "Security", "DPA"].map((item) => (
                <Typography key={item} variant="body2" sx={{ color: "text.secondary", mb: 1.5, cursor: "pointer" }}>{item}</Typography>
              ))}
            </Grid>
          </Grid>
          <Divider sx={{ my: 5 }} />
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              © 2026 OffboardHQ. All rights reserved.
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {["language", "mail"].map((icon) => (
                <IconButton key={icon} size="small" sx={{ color: "text.secondary" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
                </IconButton>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

const fadeInUp = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const TRUST_BADGES = [
  { icon: "security", label: "Enterprise Security" },
  { icon: "verified_user", label: "Compliance Guaranteed" },
  { icon: "analytics", label: "Audit Trails" },
];

const CONTROL_FEATURES = [
  { icon: "key", title: "Missed Access Detection", description: "Instantly detect and revoke lingering access across all SaaS and cloud providers." },
  { icon: "inventory_2", title: "Verified Asset Return", description: "Enforce physical hardware recovery with automated tracking and verification." },
  { icon: "rule", title: "Clear Ownership Between HR & IT", description: "Eliminate ambiguity with defined approval chains and enforced handoffs." },
  { icon: "history_edu", title: "No Steps Skipped, Ever", description: "Every action is logged and verified, creating a defensible audit trail by default." },
];

  const PRICING = [
    {
      name: "Free Trial",
      description: "Try OffboardHQ risk-free for 14 days.",
      price: "$0",
      period: "mo",
      cta: "Start Free Trial",
      features: ["1 Admin", "5 Employees", "14-day free trial", "Core features included"],
      isTrial: true
    },
    {
      name: "Starter",
      description: "Essential offboarding for small teams.",
      price: "$9.99",
      period: "mo",
      cta: "Choose Starter",
      features: [
        { text: "Up to 30 Employees", tooltip: "Employees are individuals tracked via Employee Portal." },
        { text: "Up to 5 Org Users", tooltip: "Org users manage the platform." },
        "Core access revocation",
        "Email support"
      ],
      isTrial: true
    },
    {
      name: "Growth",
      description: "Scale your security and compliance workflows.",
      price: "$29.99",
      period: "mo",
      cta: "Choose Growth",
      popular: true,
      isTrial: true,
      features: ["Higher limits", "Full asset tracking", "Priority support", "Audit logs"]
    },
    {
      name: "Enterprise",
      description: "Complete control for large organizations.",
      price: "Custom",
      cta: "Contact Security Team",
      features: ["Custom limits", "SSO integration", "Dedicated success manager", "Custom workflows"]
    }
  ];
