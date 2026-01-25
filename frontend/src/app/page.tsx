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

// UI Polish complete
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
    borderRadius: 2,
    borderColor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.08),
    bgcolor: isDark ? alpha("#0B0F1A", 0.4) : "#fff",
    backdropFilter: "blur(12px)",
    transition: "all 400ms cubic-bezier(0.22, 1, 0.36, 1)",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: isDark 
      ? `0 4px 24px ${alpha("#000", 0.3)}, inset 0 1px 1px ${alpha("#fff", 0.05)}`
      : `0 4px 24px ${alpha("#000", 0.04)}, inset 0 1px 1px ${alpha("#fff", 0.8)}`,
    "&:hover": {
      borderColor: alpha(theme.palette.primary.main, 0.3),
      transform: "translateY(-4px)",
      bgcolor: isDark ? alpha("#0B0F1A", 0.6) : "#fff",
      boxShadow: isDark
        ? `0 32px 64px -12px ${alpha("#000", 0.8)}, 0 0 24px ${alpha(theme.palette.primary.main, 0.15)}, inset 0 1px 1px ${alpha("#fff", 0.1)}`
        : `0 32px 64px -12px ${alpha("#000", 0.12)}, 0 0 24px ${alpha(theme.palette.primary.main, 0.08)}, inset 0 1px 1px ${alpha("#fff", 1)}`,
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
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
          bgcolor: isDark ? alpha("#05070A", 0.8) : alpha("#fff", 0.85),
          backdropFilter: "blur(24px) saturate(160%)",
          borderRadius: 2,
          border: "1px solid",
            borderColor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.08),
            boxShadow: isDark 
              ? `0 16px 40px -8px rgba(0, 0, 0, 0.7), inset 0 1px 1px ${alpha("#fff", 0.04)}`
              : `0 16px 40px -8px rgba(0, 0, 0, 0.06), inset 0 1px 1px ${alpha("#fff", 0.8)}`,
            transition: "all 400ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        >
          <Container maxWidth="lg">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 1.5,
              }}
            >
              <Box 
                component={motion.div}
                initial="initial"
                whileHover="hover"
                sx={{ display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer" }}
              >
                <Box
                  component={motion.div}
                  variants={{
                    initial: { scale: 1 },
                    hover: { 
                      scale: 1.1,
                      rotate: [0, -10, 10, 0],
                      transition: { duration: 0.5 }
                    }
                  }}
                  sx={{
                    bgcolor: "primary.main",
                    borderRadius: 1.5,
                    p: 0.8,
                    display: "flex",
                    boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: "white", fontSize: 22 }}
                  >
                    shield_person
                  </span>
                </Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 900, 
                    letterSpacing: -0.8, 
                    fontSize: "1.35rem",
                    background: isDark 
                      ? "linear-gradient(to right, #fff, rgba(255,255,255,0.7))"
                      : "linear-gradient(to right, #000, rgba(0,0,0,0.6))",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  OffboardHQ
                </Typography>
              </Box>

              <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 4.5 }}>
                {["Platform", "Security", "Compliance", "Pricing"].map((item, index) => (
                  <Box
                    key={item}
                    component={motion.div}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                    sx={{ position: "relative" }}
                  >
                    <Typography
                      component="a"
                      href={`#${item.toLowerCase()}`}
                      sx={{
                        color: "text.secondary",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        transition: "all 250ms ease",
                        letterSpacing: 0.2,
                        display: "block",
                        "&:hover": { 
                          color: "text.primary",
                          "& + .nav-underline": {
                            width: "100%",
                            opacity: 1,
                          }
                        },
                      }}
                    >
                      {item}
                    </Typography>
                    <Box 
                      className="nav-underline"
                      sx={{
                        position: "absolute",
                        bottom: -4,
                        left: "50%",
                        width: "0%",
                        height: "2px",
                        bgcolor: "primary.main",
                        borderRadius: "2px",
                        opacity: 0,
                        transform: "translateX(-50%)",
                        transition: "all 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                        pointerEvents: "none",
                      }}
                    />
                  </Box>
                ))}
              </Box>

              <Box 
                component={motion.div}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                sx={{ display: "flex", alignItems: "center", gap: 2.5 }}
              >
                <ThemeToggle size="small" />
                <Link href="/login" passHref style={{ textDecoration: "none" }}>
                  <Button 
                    component={motion.button}
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    sx={{ 
                      fontWeight: 700, 
                      color: "text.primary", 
                      fontSize: "0.875rem",
                      textTransform: "none",
                    }}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" passHref style={{ textDecoration: "none" }}>
                  <Button
                    variant="contained"
                    component={motion.button}
                    whileHover={{ 
                      scale: 1.05, 
                      y: -2,
                      boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                    }}
                    whileTap={{ scale: 0.98 }}
                    sx={{
                      fontWeight: 800,
                      px: 3,
                      borderRadius: 1.5,
                      fontSize: "0.875rem",
                      textTransform: "none",
                      boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                      position: "relative",
                      overflow: "hidden",
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: "-100%",
                        width: "100%",
                        height: "100%",
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                        transition: "all 0.6s ease",
                      },
                      "&:hover::after": {
                        left: "100%",
                      }
                    }}
                  >
                    Start Free Trial
                  </Button>
                </Link>
              </Box>
            </Box>
          </Container>
        </Box>

      <Box
        sx={{
          pt: { xs: 12, md: 18 },
          pb: { xs: 14, md: 24 },
          background: isDark
            ? `radial-gradient(circle at 50% -20%, ${alpha(theme.palette.primary.main, 0.18)} 0%, transparent 70%),
               radial-gradient(circle at 10%, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 40%),
               #05070A`
            : `radial-gradient(circle at 50% -20%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%),
               radial-gradient(circle at 10%, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 40%),
               #F8FAFC`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={10} alignItems="center">
            <Grid size={{ xs: 12, lg: 6 }}>
              <MotionBox initial="initial" animate="animate" variants={stagger}>
                <MotionBox variants={fadeInUp}>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 2,
                      py: 0.8,
                      borderRadius: 1,
                      bgcolor: isDark ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.primary.main, 0.08),
                      border: "1px solid",
                      borderColor: alpha(theme.palette.primary.main, 0.2),
                      mb: 4,
                    }}
                  >
                    <span 
                      className="material-symbols-outlined" 
                      style={{ fontSize: 16, color: theme.palette.primary.main, fontWeight: "bold" }}
                    >
                      verified
                    </span>
                    <Typography
                      variant="overline"
                      sx={{
                        color: "primary.main",
                        fontWeight: 900,
                        letterSpacing: 1.2,
                        fontSize: "0.75rem",
                        lineHeight: 1,
                      }}
                    >
                      Infrastructure-grade compliance
                    </Typography>
                  </Box>
                </MotionBox>

                <MotionTypography
                  variant="h1"
                  variants={fadeInUp}
                  sx={{
                    fontSize: { xs: "2.75rem", md: "4.25rem" },
                    fontWeight: 900,
                    letterSpacing: -2.5,
                    lineHeight: 1.05,
                    mb: 3.5,
                    color: "text.primary",
                  }}
                >
                  Every exit verified.
                  <br />
                  Every audit
                  <br />
                  <Box
                    component="span"
                    sx={{
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      display: "inline-block",
                    }}
                  >
                    defensible.
                  </Box>
                </MotionTypography>

                <MotionTypography
                  variant="h6"
                  variants={fadeInUp}
                  sx={{
                    color: "text.secondary",
                    fontWeight: 500,
                    mb: 5,
                    lineHeight: 1.6,
                    fontSize: "1.2rem",
                    maxWidth: 480,
                  }}
                >
                  We enforce offboarding protocol so no accounts linger, no assets disappear, and no security audit is left to chance.
                </MotionTypography>

                <MotionBox variants={fadeInUp} sx={{ mb: 6 }}>
                  <Box sx={{ display: "flex", gap: 2.5, flexWrap: "wrap", mb: 2.5 }}>
                    <Button
                      variant="contained"
                      onClick={() => handleContactClick("I'd like to book a 15-min Offboarding Risk Check.")}
                      sx={{
                        fontWeight: 800,
                        px: 4.5,
                        py: 2,
                        borderRadius: 1.5,
                        fontSize: "1rem",
                        minWidth: 220,
                        height: 58,
                        boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.35)}`,
                        textTransform: "none",
                        position: "relative",
                        overflow: "hidden",
                        transition: "all 400ms cubic-bezier(0.22, 1, 0.36, 1)",
                        "&:hover": {
                          boxShadow: `0 16px 40px ${alpha(theme.palette.primary.main, 0.5)}`,
                          transform: "translateY(-3px)",
                        },
                        "&:active": {
                          transform: "translateY(0)",
                        },
                      }}
                    >
                      Book an Audit Risk Check
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => document.getElementById("platform")?.scrollIntoView({ behavior: "smooth" })}
                      sx={{
                        fontWeight: 700,
                        px: 4,
                        py: 2,
                        borderRadius: 1.5,
                        fontSize: "1rem",
                        height: 58,
                        color: "text.primary",
                        textTransform: "none",
                        borderColor: isDark ? alpha("#fff", 0.15) : alpha("#000", 0.15),
                        borderWidth: 1.5,
                        transition: "all 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                        backgroundColor: "transparent",
                        "&:hover": {
                          borderColor: theme.palette.primary.main,
                          backgroundColor: isDark ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.primary.main, 0.04),
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      Explore the Platform
                    </Button>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      ml: 0.5,
                      opacity: 0.8,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bolt</span>
                      <span>No implementation required</span>
                    </Box>
                    <span style={{ opacity: 0.3 }}>|</span>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock</span>
                      <span>SOC2 Compliant</span>
                    </Box>
                  </Typography>
                </MotionBox>

                  <MotionBox 
                    variants={stagger}
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 2,
                    }}
                  >
                    {TRUST_BADGES.map((badge, index) => (
                      <MotionBox
                        key={badge.label}
                        variants={fadeInUp}
                        whileHover={{ 
                          y: -4,
                          borderColor: alpha(theme.palette.primary.main, 0.3),
                          bgcolor: isDark ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.primary.main, 0.04),
                          boxShadow: `0 12px 24px -8px ${alpha(theme.palette.primary.main, 0.15)}`,
                        }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          px: 3,
                          py: 1.5,
                          borderRadius: 1.5,
                          bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#000", 0.02),
                          border: "1px solid",
                          borderColor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.08),
                          cursor: "default",
                        }}
                      >
                        <motion.span
                          className="material-symbols-outlined"
                          animate={{ 
                            opacity: [0.7, 1, 0.7],
                            scale: [0.98, 1, 0.98]
                          }}
                          transition={{ 
                            duration: 4, 
                            repeat: Infinity, 
                            ease: "linear",
                            delay: index * 0.5 
                          }}
                          style={{ fontSize: 20, color: theme.palette.primary.main }}
                        >
                          {badge.icon}
                        </motion.span>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontWeight: 800, 
                            color: "text.secondary",
                            fontSize: "0.8rem",
                            letterSpacing: 0.5,
                            textTransform: "uppercase",
                          }}
                        >
                          {badge.label}
                        </Typography>
                      </MotionBox>
                    ))}
                  </MotionBox>
              </MotionBox>
            </Grid>

            <Grid size={{ xs: 12, lg: 6 }}>
              <MotionBox
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                sx={{ position: "relative" }}
              >
                <Box
                  sx={{
                    position: "relative",
                    zIndex: 1,
                    borderRadius: 3,
                    overflow: "hidden",
                    border: `1px solid ${isDark ? alpha("#fff", 0.1) : alpha("#000", 0.1)}`,
                    boxShadow: isDark 
                      ? `0 40px 100px -20px rgba(0, 0, 0, 0.8), 0 0 40px ${alpha(theme.palette.primary.main, 0.1)}`
                      : `0 40px 100px -20px rgba(0, 0, 0, 0.15), 0 0 40px ${alpha(theme.palette.primary.main, 0.05)}`,
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
          py: 7,
          borderTop: "1px solid",
          borderBottom: "1px solid",
          borderColor: isDark ? alpha("#fff", 0.05) : alpha("#000", 0.05),
          bgcolor: isDark ? alpha("#fff", 0.01) : alpha("#000", 0.01),
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 5 }}>
            <Typography
              variant="overline"
              sx={{
                color: "text.secondary",
                fontWeight: 800,
                letterSpacing: 2,
                fontSize: "0.75rem",
                opacity: 0.6,
              }}
            >
              ENGINEERED FOR MODERN ENTERPRISE STANDARDS
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: { xs: 4, md: 8 },
              flexWrap: "wrap",
            }}
          >
            {["SOC 2 Type II", "ISO 27001", "GDPR", "HIPAA Ready", "Zero Trust Architecture"].map((badge) => (
              <Box
                key={badge}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 20, color: theme.palette.primary.main, opacity: 0.8 }}
                >
                  verified_user
                </span>
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: "text.secondary",
                    fontSize: "0.95rem",
                    letterSpacing: -0.2,
                  }}
                >
                  {badge}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      <Box id="platform" sx={{ py: { xs: 16, md: 24 } }}>
        <Container maxWidth="lg">
          <MotionBox
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true, margin: "-100px" }}
            sx={{ textAlign: "center", mb: 12 }}
          >
            <Typography
              variant="overline"
              sx={{
                color: "primary.main",
                fontWeight: 900,
                letterSpacing: 3,
                mb: 3,
                display: "block",
                fontSize: "0.85rem",
              }}
            >
              THE CORE RISK
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 900,
                letterSpacing: -2.5,
                mb: 4,
                fontSize: { xs: "2.75rem", md: "4.5rem" },
                lineHeight: 1.05,
                color: "text.primary",
              }}
            >
              Employee exits are your
              <br />
              largest security blindspot
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "text.secondary",
                maxWidth: 760,
                mx: "auto",
                lineHeight: 1.7,
                fontSize: "1.35rem",
                fontWeight: 500,
                mb: 8,
              }}
            >
              Inconsistent offboarding creates a permanent back door to your company's most sensitive infrastructure.
            </Typography>
            <Box 
              sx={{ 
                textAlign: "left", 
                maxWidth: 580, 
                mx: "auto",
                bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#000", 0.01),
                p: { xs: 6, md: 8 },
                borderRadius: 4,
                border: "1px solid",
                borderColor: isDark ? alpha("#fff", 0.06) : alpha("#000", 0.06),
                boxShadow: isDark 
                  ? `0 40px 80px -20px rgba(0, 0, 0, 0.7), inset 0 1px 1px ${alpha("#fff", 0.03)}`
                  : `0 40px 80px -20px rgba(0, 0, 0, 0.08), inset 0 1px 1px ${alpha("#fff", 0.8)}`,
              }}
            >
              <Typography 
                variant="subtitle1" 
                fontWeight={900} 
                sx={{ 
                  mb: 5, 
                  fontSize: "1.2rem",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: "text.primary",
                  opacity: 0.9,
                }}
              >
                The Infrastructure Gap:
              </Typography>
              {[
                "Access revocation is manual, delayed, and porous",
                "Zero chain-of-custody for physical hardware",
                "No immutable evidence for security audits"
              ].map((item, i) => (
                <Box key={i} sx={{ display: "flex", gap: 3.5, mb: 4 }}>
                  <Box 
                    sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: "50%", 
                      bgcolor: "primary.main", 
                      mt: 1.2, 
                      flexShrink: 0,
                      boxShadow: `0 0 15px ${alpha(theme.palette.primary.main, 0.6)}` 
                    }} 
                  />
                  <Typography variant="body1" color="text.secondary" fontWeight={600} sx={{ fontSize: "1.15rem", lineHeight: 1.5 }}>
                    {item}
                  </Typography>
                </Box>
              ))}
              <Box sx={{ mt: 6, pt: 5, borderTop: `1px solid ${isDark ? alpha("#fff", 0.08) : alpha("#000", 0.08)}` }}>
                <Typography 
                  variant="body1" 
                  color="text.primary" 
                  fontWeight={900} 
                  sx={{ 
                    textAlign: "center",
                    fontSize: "1.3rem",
                    letterSpacing: -0.5,
                    color: "primary.main"
                  }}
                >
                  A single missed account is a breach.
                </Typography>
              </Box>
            </Box>
          </MotionBox>
        </Container>
      </Box>

      <Box
        id="security"
        sx={{
          py: { xs: 16, md: 24 },
          bgcolor: isDark ? alpha("#fff", 0.01) : "#FAFBFC",
          borderTop: "1px solid",
          borderBottom: "1px solid",
          borderColor: isDark ? alpha("#fff", 0.05) : alpha("#000", 0.05),
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 12 }}>
            <Typography
              variant="overline"
              sx={{
                color: "primary.main",
                fontWeight: 900,
                letterSpacing: 3,
                mb: 3,
                display: "block",
                fontSize: "0.85rem",
              }}
            >
              THE SOLUTION
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 900,
                letterSpacing: -2,
                mb: 4,
                fontSize: { xs: "2.5rem", md: "3.5rem" },
                color: "text.primary",
              }}
            >
              Absolute control over every exit
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "text.secondary",
                maxWidth: 680,
                mx: "auto",
                lineHeight: 1.6,
                fontSize: "1.15rem",
                fontWeight: 500,
              }}
            >
              We automate the enforcement of your offboarding policies, ensuring
              every requirement is met and every action is recorded.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {CONTROL_FEATURES.map((feature, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                <MotionBox
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  viewport={{ once: true }}
                  sx={{ height: "100%" }}
                >
                  <Card variant="outlined" sx={cardStyle}>
                    <CardContent sx={{ p: 4.5 }}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 1.5,
                          bgcolor: isDark ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.08),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mb: 4,
                          position: "relative",
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ 
                            fontSize: 26, 
                            color: theme.palette.primary.main,
                            fontWeight: "bold",
                          }}
                        >
                          {feature.icon}
                        </span>
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, fontSize: "1.2rem", letterSpacing: -0.5 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.65, fontSize: "1rem", fontWeight: 500 }}>
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

      <Box id="compliance" sx={{ py: { xs: 16, md: 24 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 12 }}>
            <Typography
              variant="overline"
              sx={{
                color: "primary.main",
                fontWeight: 900,
                letterSpacing: 3,
                mb: 3,
                display: "block",
                fontSize: "0.85rem",
              }}
            >
              THE EVIDENCE
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 900,
                letterSpacing: -2,
                mb: 4,
                fontSize: { xs: "2.5rem", md: "3.5rem" },
                color: "text.primary",
              }}
            >
              Built for the most rigorous audits
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {[
              { 
                icon: "verified", 
                text: "Automated Evidence Vault", 
                desc: "Every revocation, asset return, and sign-off is automatically timestamped and archived for audit readiness.",
                xs: 12, md: 7,
                color: theme.palette.primary.main
              },
              { 
                icon: "account_tree", 
                text: "Immutable Chain of Custody", 
                desc: "A complete, unalterable history of asset ownership and access rights for every single employee.",
                xs: 12, md: 5,
                color: theme.palette.secondary.main
              },
              { 
                icon: "description", 
                text: "Defensible Compliance Reports", 
                desc: "Generate SOC2 and ISO-ready reports in seconds, showing 100% enforcement of your security controls.",
                xs: 12, md: 12,
                color: theme.palette.info.main
              }
            ].map((item, i) => (
              <Grid size={{ xs: item.xs, md: item.md }} key={i}>
                <MotionBox
                  initial={{ opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.7 }}
                  viewport={{ once: true }}
                  sx={{ height: "100%" }}
                >
                  <Card 
                    variant="outlined"
                    sx={{ 
                      ...cardStyle,
                      p: 5,
                      "&:hover": {
                        ...cardStyle["&:hover"],
                        borderColor: alpha(item.color, 0.4),
                        boxShadow: isDark 
                          ? `0 40px 80px -20px ${alpha("#000", 0.8)}, 0 0 40px ${alpha(item.color, 0.1)}`
                          : `0 40px 80px -20px ${alpha("#000", 0.08)}, 0 0 40px ${alpha(item.color, 0.05)}`,
                      }
                    }}
                  >
                    <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 4, alignItems: "center" }}>
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: 2,
                          bgcolor: alpha(item.color, 0.1),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span 
                          className="material-symbols-outlined" 
                          style={{ 
                            color: item.color, 
                            fontSize: 40,
                            fontWeight: "bold",
                          }}
                        >
                          {item.icon}
                        </span>
                      </Box>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 900, mb: 1.5, letterSpacing: -0.8, fontSize: "1.65rem" }}>
                          {item.text}
                        </Typography>
                        <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.6, fontSize: "1.1rem", fontWeight: 500 }}>
                          {item.desc}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box id="pricing" sx={{ py: { xs: 16, md: 24 }, bgcolor: isDark ? alpha("#fff", 0.005) : alpha("#000", 0.005) }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 10 }}>
            <MotionBox
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 2.5,
                py: 1,
                borderRadius: 1,
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: "primary.main",
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                mb: 4,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontWeight: "bold" }}>auto_awesome</span>
              <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase" }}>
                Institutional Security. Transparent Pricing.
              </Typography>
            </MotionBox>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 900,
                letterSpacing: -2.5,
                mb: 3,
                fontSize: { xs: "2.5rem", md: "3.75rem" },
                color: "text.primary",
              }}
            >
              Enterprise protection for every stage
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "text.secondary",
                maxWidth: 580,
                mx: "auto",
                fontSize: "1.15rem",
                lineHeight: 1.6,
                fontWeight: 500,
              }}
            >
              Headcount-neutral pricing designed for growing infrastructure.
              Choose the plan that fits your security requirements.
            </Typography>
          </Box>

            <Grid container spacing={3.5} justifyContent="center">
              {PRICING.map((plan, index) => {
                const isFreeTrial = plan.name === "Free Trial";
                
                return (
                  <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={index}>
                    <MotionBox
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      viewport={{ once: true }}
                      sx={{ height: "100%", position: "relative" }}
                    >
                      {isFreeTrial && (
                        <Box
                          component={motion.div}
                          animate={{
                            opacity: [0.3, 0.6, 0.3],
                          }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          sx={{
                            position: "absolute",
                            inset: -2,
                            borderRadius: 3.5,
                            padding: "2px",
                            background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0)}, ${alpha(theme.palette.primary.main, 0.5)}, ${alpha(theme.palette.primary.main, 0)})`,
                            backgroundSize: "200% 200%",
                            zIndex: 0,
                            filter: "blur(8px)",
                            pointerEvents: "none",
                          }}
                        />
                      )}
                      <Card
                        variant="outlined"
                        sx={{
                          ...cardStyle,
                          borderRadius: 3,
                          zIndex: 1,
                          borderColor: plan.popular 
                            ? alpha(theme.palette.primary.main, 0.4) 
                            : isFreeTrial
                              ? alpha(theme.palette.primary.main, 0.2)
                              : alpha(isDark ? "#fff" : "#000", 0.08),
                          background: isFreeTrial && isDark
                            ? `linear-gradient(165deg, ${alpha("#0B1224", 0.9)} 0%, ${alpha("#05070A", 0.95)} 100%)`
                            : undefined,
                          "&:hover": {
                            ...cardStyle["&:hover"],
                            borderColor: plan.popular || isFreeTrial ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.3),
                            ...(isFreeTrial && {
                              background: isDark
                                ? `linear-gradient(165deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`
                                : `linear-gradient(165deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                            }),
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
                              height: 6,
                              background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}, transparent)`,
                            }}
                          />
                        )}
                        <CardContent sx={{ p: 5, flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
                          <Box sx={{ mb: 4 }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
                              <Typography 
                                variant="overline" 
                                sx={{ 
                                  fontWeight: 900, 
                                  fontSize: "0.85rem",
                                  letterSpacing: 2,
                                  color: plan.popular || isFreeTrial ? "primary.main" : "text.secondary",
                                  opacity: plan.popular || isFreeTrial ? 1 : 0.8,
                                }}
                              >
                                {plan.name}
                              </Typography>
                              {plan.popular && (
                                <Box
                                  sx={{
                                    px: 1.8,
                                    py: 0.6,
                                    borderRadius: 1,
                                    bgcolor: "primary.main",
                                    color: "white",
                                    fontWeight: 900,
                                    fontSize: "0.7rem",
                                    letterSpacing: 1,
                                    textTransform: "uppercase",
                                    boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                                  }}
                                >
                                  RECOMMENDED
                                </Box>
                              )}
                              {isFreeTrial && (
                                <Box
                                  component={motion.div}
                                  animate={{ scale: [1, 1.05, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                  sx={{
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: 1,
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                    color: "primary.main",
                                    fontWeight: 900,
                                    fontSize: "0.65rem",
                                    letterSpacing: 1,
                                    textTransform: "uppercase",
                                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                                  }}
                                >
                                  MOST POPULAR START
                                </Box>
                              )}
                            </Box>
                            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "1rem", lineHeight: 1.5, minHeight: "3rem", fontWeight: 500 }}>
                              {plan.description}
                            </Typography>
                          </Box>
  
                          <Box sx={{ mb: 6, minHeight: "5rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                            <Box sx={{ display: "flex", alignItems: "baseline" }}>
                              <Typography 
                                component={motion.span}
                                sx={{ 
                                  fontSize: "3.5rem", 
                                  fontWeight: 900, 
                                  lineHeight: 1, 
                                  letterSpacing: -3, 
                                  color: "text.primary",
                                  ...(isFreeTrial && {
                                    background: `linear-gradient(135deg, ${theme.palette.text.primary} 30%, ${theme.palette.primary.main} 100%)`,
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                  })
                                }}
                              >
                                {plan.price}
                              </Typography>
                              {plan.period && (
                                <Typography sx={{ color: "text.secondary", ml: 1.5, fontSize: "1.1rem", fontWeight: 700 }}>
                                  /{plan.period}
                                </Typography>
                              )}
                            </Box>
                            <Typography variant="caption" sx={{ color: "text.secondary", mt: 2, display: "flex", alignItems: "center", gap: 0.8, fontWeight: 700, fontSize: "0.8rem", opacity: 0.8 }}>
                              {plan.isTrial ? (
                                <>
                                  <motion.span 
                                    className="material-symbols-outlined" 
                                    animate={isFreeTrial ? { rotate: [0, 360] } : {}}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                    style={{ fontSize: 18, color: theme.palette.primary.main }}
                                  >
                                    verified
                                  </motion.span>
                                  No credit card required
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>history_toggle_off</span>
                                  Billed per month, cancel anytime
                                </>
                              )}
                            </Typography>
                          </Box>
  
                          <Box sx={{ mb: 5 }}>
                            <Button
                              fullWidth
                              variant={plan.popular || isFreeTrial ? "contained" : "outlined"}
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
                                fontWeight: 900,
                                py: 2.2,
                                borderRadius: 1.5,
                                fontSize: "1rem",
                                textTransform: "none",
                                transition: "all 400ms cubic-bezier(0.22, 1, 0.36, 1)",
                                position: "relative",
                                overflow: "hidden",
                                ...(plan.popular || isFreeTrial ? {
                                  boxShadow: `0 12px 30px ${alpha(theme.palette.primary.main, 0.4)}`,
                                  "&:hover": {
                                    boxShadow: `0 20px 48px ${alpha(theme.palette.primary.main, 0.6)}`,
                                    transform: "translateY(-3px)",
                                  },
                                  "&::after": isFreeTrial ? {
                                    content: '""',
                                    position: "absolute",
                                    top: 0,
                                    left: "-100%",
                                    width: "100%",
                                    height: "100%",
                                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                                    animation: "shimmer 3s infinite",
                                  } : {},
                                  "@keyframes shimmer": {
                                    "0%": { left: "-100%" },
                                    "100%": { left: "100%" }
                                  }
                                } : {
                                  borderColor: isDark ? alpha("#fff", 0.15) : alpha("#000", 0.15),
                                  borderWidth: 2,
                                  "&:hover": {
                                    borderColor: theme.palette.primary.main,
                                    bgcolor: isDark ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.05),
                                    transform: "translateY(-2px)",
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
                                mb: 2.5, 
                                fontWeight: 900, 
                                color: "text.primary",
                                textTransform: "uppercase",
                                letterSpacing: 1.5,
                                fontSize: "0.75rem",
                                opacity: 0.9,
                              }}
                            >
                              Protocol Scope
                            </Typography>
                            {plan.features.map((feature, idx) => {
                              const isObject = typeof feature === "object";
                              const text = isObject ? feature.text : feature;
                              const tooltip = isObject ? feature.tooltip : null;
                              
                              return (
                                <Box 
                                  key={idx} 
                                  component={motion.div}
                                  initial={isFreeTrial ? { opacity: 0, x: -10 } : {}}
                                  whileInView={isFreeTrial ? { opacity: 1, x: 0 } : {}}
                                  transition={{ delay: 0.5 + idx * 0.1 }}
                                  sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2 }}
                                >
                                  <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: 18, color: theme.palette.primary.main, marginTop: 1, fontWeight: "bold" }}
                                  >
                                    check
                                  </span>
                                  <Typography variant="body2" sx={{ fontSize: "0.95rem", lineHeight: 1.4, display: "flex", alignItems: "center", gap: 0.8, fontWeight: 600, color: "text.secondary" }}>
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
                );
              })}
            </Grid>
          </Container>
        </Box>

      <Box
        component="footer"
        sx={{
          py: 10,
          borderTop: "1px solid",
          borderColor: isDark ? alpha("#fff", 0.06) : alpha("#000", 0.06),
          bgcolor: isDark ? alpha("#05070A", 0.5) : alpha("#F8FAFC", 0.5),
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={8}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                <Box
                  sx={{
                    bgcolor: "primary.main",
                    borderRadius: 1.5,
                    p: 0.8,
                    display: "flex",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: "white", fontSize: 22 }}
                  >
                    shield_person
                  </span>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: -0.8 }}>
                  OffboardHQ
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 300, lineHeight: 1.7, fontWeight: 500 }}>
                The system of record for secure employee offboarding.
                Enforcing infrastructure-grade security protocols for the modern enterprise.
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 3, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.75rem" }}>Platform</Typography>
              {["Audit Radar", "Enforcement", "Integrations", "API Docs"].map((item) => (
                <Typography key={item} variant="body2" sx={{ color: "text.secondary", mb: 1.8, cursor: "pointer", fontWeight: 600, "&:hover": { color: "primary.main" } }}>{item}</Typography>
              ))}
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 3, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.75rem" }}>Company</Typography>
              {["Security", "Compliance", "Trust Center", "Contact"].map((item) => (
                <Typography
                  key={item}
                  variant="body2"
                  onClick={() => item === "Contact" && handleContactClick("General inquiry.")}
                  sx={{ color: "text.secondary", mb: 1.8, cursor: "pointer", fontWeight: 600, "&:hover": { color: "primary.main" } }}
                >
                  {item}
                </Typography>
              ))}
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 3, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.75rem" }}>Resources</Typography>
              {["SOC2 Guide", "ISO 27001", "Help Center", "Status"].map((item) => (
                <Typography key={item} variant="body2" sx={{ color: "text.secondary", mb: 1.8, cursor: "pointer", fontWeight: 600, "&:hover": { color: "primary.main" } }}>{item}</Typography>
              ))}
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 3, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.75rem" }}>Legal</Typography>
              {["Privacy", "Terms", "Security", "DPA"].map((item) => (
                <Typography key={item} variant="body2" sx={{ color: "text.secondary", mb: 1.8, cursor: "pointer", fontWeight: 600, "&:hover": { color: "primary.main" } }}>{item}</Typography>
              ))}
            </Grid>
          </Grid>
          <Divider sx={{ my: 6, opacity: 0.5 }} />
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.8rem" }}>
              © 2026 OffboardHQ. All rights reserved. Built for security-first organizations.
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {["language", "mail"].map((icon) => (
                <IconButton key={icon} size="small" sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}>
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
