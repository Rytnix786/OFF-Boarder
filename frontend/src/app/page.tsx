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
          borderRadius: 4,
          border: "1px solid",
          borderColor: isDark ? alpha("#fff", 0.12) : alpha("#000", 0.08),
          boxShadow: isDark 
            ? `0 8px 32px -4px rgba(0, 0, 0, 0.5), inset 0 1px 1px ${alpha("#fff", 0.1)}`
            : `0 8px 32px -4px rgba(0, 0, 0, 0.06), inset 0 1px 1px ${alpha("#fff", 0.8)}`,
          transition: "all 300ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              py: 2,
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
                                sx={
                                  theme.unstable_sx({
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
                                  })
                                }
                              >
                              Book a 15-min Offboarding Risk Check
                            </Button>
                            <Button
                              variant="outlined"
                              onClick={() => document.getElementById("platform")?.scrollIntoView({ behavior: "smooth" })}
                              sx={
                                theme.unstable_sx({
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
                                  },
                                  "&:focus-visible": {
                                    outline: "2px solid",
                                    outlineColor: theme.palette.primary.main,
                                    outlineOffset: "2px"
                                  }
                                })
                              }
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
                            sx={
                              theme.unstable_sx({
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
                                "&::before": {
                                  content: '""',
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: "100%",
                                  background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main, 0.05)}, transparent)`
                                },
                                "&:hover": {
                                  bgcolor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.04),
                                  borderColor: alpha(theme.palette.primary.main, 0.5),
                                  transform: "translateY(-2px)",
                                  boxShadow: `0 6px 15px ${alpha(theme.palette.primary.main, 0.15)}`
                                },
                                "&:focus-visible": {
                                  outline: "2px solid",
                                  outlineColor: theme.palette.primary.main,
                                  outlineOffset: "2px"
                                }
                              })
                            }
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
                    borderRadius: 4,
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
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    mb: 2,
                    display: "block",
                    fontSize: "0.75rem",
                  }}
                >
                  THE RISK
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
                  Employee exits are your biggest
                  <br />
                  hidden security risk
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: "text.secondary",
                    maxWidth: 600,
                    mx: "auto",
                    lineHeight: 1.8,
                    fontSize: "1.05rem",
                    mb: 4,
                  }}
                >
                  Most companies assume offboarding is handled.
                </Typography>
                <Box 
                  sx={{ 
                    textAlign: "left", 
                    maxWidth: 400, 
                    mx: "auto",
                    bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#000", 0.02),
                    p: 4,
                    borderRadius: 4,
                    border: "1px solid",
                    borderColor: isDark ? alpha("#fff", 0.06) : alpha("#000", 0.06),
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>In reality:</Typography>
                  {[
                    "Access removal is manual and inconsistent",
                    "Ownership is unclear between HR and IT",
                    "There’s no proof when audits happen"
                  ].map((item, i) => (
                    <Box key={i} sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "primary.main", mt: 1.2, flexShrink: 0 }} />
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>{item}</Typography>
                    </Box>
                  ))}
                  <Typography variant="body2" color="text.primary" fontWeight={700} sx={{ mt: 3, textAlign: "center" }}>
                    All it takes is one missed account.
                  </Typography>
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
                >
                    <Card
                      variant="outlined"
                      sx={
                        theme.unstable_sx({
                          height: "100%",
                          minHeight: 180,
                          borderRadius: 6,
                          borderColor: isDark ? alpha("#fff", 0.1) : alpha("#000", 0.08),
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
                            transform: "translateY(-8px)",
                            bgcolor: isDark ? alpha("#0B0F1A", 0.8) : "#fff",
                            boxShadow: isDark
                              ? `0 20px 40px -12px ${alpha("#000", 0.6)}, 0 0 20px ${alpha(theme.palette.primary.main, 0.1)}, inset 0 1px 1px ${alpha("#fff", 0.15)}`
                              : `0 20px 40px -12px ${alpha("#000", 0.1)}, 0 0 20px ${alpha(theme.palette.primary.main, 0.05)}, inset 0 1px 1px ${alpha("#fff", 1)}`,
                          },
                          "&::after": {
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: "100%",
                            background: isDark 
                              ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 50%)`
                              : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, transparent 50%)`,
                            pointerEvents: "none",
                          }
                        })
                      }
                    >
                    <CardContent sx={{ p: 3.5 }}>
                      <Box
                        sx={
                          theme.unstable_sx({
                            width: 52,
                            height: 52,
                            borderRadius: 2,
                            bgcolor: isDark ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.08),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            mb: 3,
                            position: "relative",
                            border: `1px solid ${isDark ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.1)}`,
                            transition: "all 200ms ease",
                            "&:hover": {
                              transform: "scale(1.05)",
                              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                              borderColor: alpha(theme.palette.primary.main, 0.3)
                            }
                          })
                        }
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ 
                            fontSize: 24, 
                            color: theme.palette.primary.main,
                            transition: "all 200ms ease",
                            filter: isDark ? `drop-shadow(0 1px 2px ${alpha("#000", 0.3)})` : "none"
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
                    size: { xs: 12, md: 8 },
                    color: "error.main"
                  },
                  { 
                    icon: "inventory_2", 
                    text: "Assets go missing", 
                    desc: "Laptops and hardware disappear into the void without a verified chain of custody.",
                    size: { xs: 12, md: 4 },
                    color: "warning.main"
                  },
                  { 
                    icon: "description", 
                    text: "Audits turn into guesswork", 
                    desc: "Scrambling for proof during SOC2 audits because steps weren't documented.",
                    size: { xs: 12, md: 12 },
                    color: "info.main"
                  }
                ].map((item, i) => (
                  <Grid size={item.size} key={i}>
                    <MotionBox
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <Card 
                        variant="outlined"
                        sx={{ 
                          height: "100%",
                          p: 4,
                          borderRadius: 6,
                          bgcolor: isDark ? alpha("#fff", 0.02) : "#fff",
                          borderColor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.08),
                          position: "relative",
                          overflow: "hidden",
                          transition: "all 300ms ease",
                          "&:hover": {
                            borderColor: alpha(item.color as any, 0.4),
                            bgcolor: isDark ? alpha("#fff", 0.04) : alpha("#000", 0.01),
                          }
                        }}
                      >
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span 
                            className="material-symbols-outlined" 
                            style={{ 
                              color: item.color === "error.main" ? theme.palette.error.main : 
                                     item.color === "warning.main" ? theme.palette.warning.main : 
                                     theme.palette.info.main, 
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

      <Box
        sx={{
          py: { xs: 14, md: 20 },
          bgcolor: isDark ? alpha("#fff", 0.01) : "#FAFBFC",
        }}
      >
        <Container maxWidth="md">
          <MotionBox
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true }}
            sx={{ textAlign: "center" }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 4,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 4,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 32, color: theme.palette.primary.main }}
              >
                spa
              </span>
            </Box>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                letterSpacing: -1.5,
                mb: 3,
                fontSize: { xs: "2rem", md: "2.5rem" },
              }}
            >
              Designed for Calm, Not Chaos
            </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "text.secondary",
                  maxWidth: 560,
                  mx: "auto",
                  lineHeight: 1.9,
                  fontSize: "1.1rem",
                  mb: 5,
                }}
              >
                Offboarding is a high-risk moment.
                The system handling it shouldn’t feel chaotic.
                <br /><br />
                OffboardHQ stays out of the way while enforcing what matters.
              </Typography>

              <Grid container spacing={4} sx={{ mt: 2 }}>
                {[
                  { icon: "auto_mode", label: "Quiet Enforcement", desc: "Runs without constant attention" },
                  { icon: "lock", label: "Verified Policy Execution", desc: "Policies execute automatically" },
                  { icon: "psychology", label: "Proof by Default", desc: "One dashboard, full visibility" },
                  { icon: "event_available", label: "Audit-Ready Exits", desc: "Same process, every time" },
                ].map((item, index) => (
                <Grid size={{ xs: 6, md: 3 }} key={index}>
                  <MotionBox
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    viewport={{ once: true }}
                    sx={{ textAlign: "center" }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: isDark ? alpha("#fff", 0.04) : alpha("#000", 0.03),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 2,
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 24, color: theme.palette.primary.main }}
                      >
                        {item.icon}
                      </span>
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.desc}
                    </Typography>
                  </MotionBox>
                </Grid>
              ))}
            </Grid>
          </MotionBox>
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
                  borderRadius: 100,
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
                            sx={
                              theme.unstable_sx({
                              height: "100%",
                              borderRadius: 4,
                              position: "relative",
                              overflow: "hidden",
                              borderColor: plan.isTrial || plan.popular
                                ? alpha(theme.palette.primary.main, 0.3)
                                : isDark ? alpha("#fff", 0.08) : alpha("#000", 0.08),
                              bgcolor: isDark 
                                ? `linear-gradient(180deg, ${alpha("#fff", plan.isTrial || plan.popular ? 0.04 : 0.02)} 0%, ${alpha("#000", plan.isTrial || plan.popular ? 0.01 : 0.005)} 100%)`
                                : plan.isTrial || plan.popular 
                                  ? alpha(theme.palette.primary.main, 0.02)
                                  : "#fff",
                              display: "flex",
                              flexDirection: "column",
                              transition: "all 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                              userSelect: "none",
                              boxShadow: isDark
                                ? plan.isTrial || plan.popular
                                  ? `0 20px 40px ${alpha("#000", 0.35)}`
                                  : `0 12px 24px ${alpha("#000", 0.25)}`
                                : plan.isTrial || plan.popular
                                  ? `0 20px 40px ${alpha("#000", 0.15)}`
                                  : `0 8px 16px ${alpha("#000", 0.08)}`,
                              ...( (plan.isTrial || plan.popular) && {
                                animation: "pricing-glow 4s ease-in-out infinite",
                                "@keyframes pricing-glow": {
                                  "0%, 100%": { 
                                    boxShadow: isDark
                                      ? `0 20px 40px ${alpha("#000", 0.35)}`
                                      : `0 20px 40px ${alpha("#000", 0.15)}`
                                  },
                                  "50%": { 
                                    boxShadow: isDark
                                      ? `0 28px 60px ${alpha("#000", 0.45)}`
                                      : `0 28px 60px ${alpha("#000", 0.2)}`
                                  },
                                },
                              }),
                              "&:hover": {
                                borderColor: alpha(theme.palette.primary.main, plan.isTrial || plan.popular ? 0.5 : 0.3),
                                transform: "translateY(-4px)",
                                boxShadow: isDark
                                  ? plan.isTrial || plan.popular
                                    ? `0 28px 60px ${alpha("#000", 0.45)}`
                                    : `0 20px 40px ${alpha("#000", 0.35)}`
                                  : plan.isTrial || plan.popular
                                    ? `0 28px 60px ${alpha("#000", 0.2)}`
                                    : `0 16px 32px ${alpha("#000", 0.12)}`,
                              },
                              "&:active": {
                                transform: "translateY(-2px)",
                              },
                              "&:focus-within": {
                                outline: "2px solid",
                                outlineColor: theme.palette.primary.main,
                                outlineOffset: "2px"
                              }
                            })
                          }
                        >
                          <CardContent sx={{ p: 4, flex: 1, display: "flex", flexDirection: "column" }}>
                            <Box sx={{ mb: 3 }}>
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                                <Typography 
                                  variant="overline" 
                                  sx={{ 
                                    fontWeight: 800, 
                                    fontSize: "0.8rem",
                                    letterSpacing: 1.8,
                                    color: plan.isTrial || plan.popular ? "primary.main" : isDark ? "#E2E8F0" : "#475569",
                                  }}
                                >
                                  {plan.name}
                                </Typography>
                                {plan.isTrial && (
                                  <Box sx={{ display: "flex", gap: 1 }}>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 1.5,
                                        bgcolor: alpha(theme.palette.primary.main, 0.15),
                                        color: "primary.main",
                                        fontWeight: 800,
                                        fontSize: "0.65rem",
                                        letterSpacing: 0.5,
                                        textTransform: "uppercase",
                                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                      }}
                                    >
                                      No Card
                                    </Typography>
                                  </Box>
                                )}
                                {plan.popular && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      px: 1.5,
                                      py: 0.5,
                                      borderRadius: 1.5,
                                      bgcolor: isDark ? alpha("#fff", 0.1) : alpha("#000", 0.06),
                                      color: "text.primary",
                                      fontWeight: 800,
                                      fontSize: "0.65rem",
                                      letterSpacing: 0.5,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    Popular
                                  </Typography>
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
                                  variant={plan.isTrial || plan.popular ? "contained" : "outlined"}
                                  onClick={() => {
                                    if (plan.name === "Enterprise") {
                                      handleContactClick("I'm interested in the Enterprise plan for my organization.");
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
                                    borderRadius: 3,
                                    fontSize: "0.95rem",
                                    textTransform: "none",
                                    transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                                    ...( (plan.isTrial || plan.popular) && {
                                      bgcolor: theme.palette.primary.main,
                                      "&:hover": {
                                        bgcolor: theme.palette.primary.dark,
                                        boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                                        transform: "scale(1.02)",
                                      }
                                    }),
                                    ...(!plan.isTrial && !plan.popular && {
                                      borderColor: isDark ? alpha("#fff", 0.15) : alpha("#000", 0.15),
                                      color: "text.primary",
                                      borderWidth: 2,
                                      "&:hover": {
                                        borderColor: theme.palette.primary.main,
                                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                                        borderWidth: 2,
                                      },
                                    }),
                                    "&:active": {
                                      transform: "scale(0.96)",
                                    }
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
                                      <Tooltip 
                                        title={tooltip} 
                                        arrow 
                                        placement="top"
                                        slotProps={{
                                          tooltip: {
                                            sx: {
                                              bgcolor: theme.palette.text.primary,
                                              color: theme.palette.background.default,
                                              fontSize: "0.75rem",
                                              fontWeight: 500,
                                              lineHeight: 1.4,
                                              px: 1.5,
                                              py: 1,
                                              borderRadius: 2,
                                              maxWidth: 240,
                                              boxShadow: theme.shadows[4]
                                            }
                                          }
                                        }}
                                      >
                                        <span 
                                          className="material-symbols-outlined" 
                                          style={{ fontSize: 16, opacity: 0.4, cursor: "help" }}
                                        >
                                          help
                                        </span>
                                      </Tooltip>
                                    )}
                                  </Typography>
                                </Box>
                              );
                            })}
                            {/* {plan.limitations?.map((limitation: string, idx: number) => (
                              <Box key={idx} sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, mb: 1.5, opacity: 0.6 }}>
                                <span
                                  className="material-symbols-outlined"
                                  style={{ fontSize: 16, color: theme.palette.text.disabled, marginTop: 1 }}
                                >
                                  cancel
                                </span>
                                <Typography variant="body2" sx={{ fontSize: "0.85rem", lineHeight: 1.5, color: "text.secondary", fontWeight: 400 }}>
                                  {limitation}
                                </Typography>
                              </Box>
                            ))} */}
                          </Box>
                        </CardContent>
                      </Card>
                  </MotionBox>
                </Grid>
              ))}
            </Grid>

            <Box
              sx={{
                mt: 8,
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: { xs: 2, md: 4 },
              }}
            >
                {[
                  { icon: "group", label: "Clear Employee Limits", tooltip: "Employees refers to individuals who access the Employee Portal to complete assigned tasks. They are distinct from administrative Org users." },
                  { icon: "block", label: "No per-seat pricing" },
                { icon: "trending_flat", label: "No surprise overages" },
                { icon: "event_available", label: "Cancel anytime" },
              ].map((item) => (
                <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18, color: theme.palette.text.secondary }}
                  >
                    {item.icon}
                  </span>
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500, display: "flex", alignItems: "center", gap: 0.5 }}>
                    {item.label}
                    {item.tooltip && (
                      <Tooltip title={item.tooltip} arrow placement="top">
                        <span 
                          className="material-symbols-outlined" 
                          style={{ fontSize: 14, opacity: 0.5, cursor: "help" }}
                        >
                          info
                        </span>
                      </Tooltip>
                    )}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Typography
              variant="body2"
              sx={{
                display: "block",
                textAlign: "center",
                mt: 4,
                color: "text.secondary",
                fontWeight: 500,
                fontSize: "0.875rem",
              }}
            >
              Start with a 14-day free trial. Paid plans billed monthly.
            </Typography>
        </Container>
      </Box>

      <Box sx={{ py: { xs: 14, md: 18 } }}>
        <Container maxWidth="md">
            <Box
              sx={{
                textAlign: "center",
                bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
                borderRadius: 6,
                p: { xs: 6, md: 10 },
                border: "1px solid",
                borderColor: isDark ? alpha("#fff", 0.06) : alpha("#000", 0.06),
              }}
            >
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  letterSpacing: -1,
                  mb: 3,
                  fontSize: { xs: "1.75rem", md: "2.25rem" },
                }}
              >
                Start with one offboarding.
              </Typography>
              <Typography
                sx={{
                  color: "text.secondary",
                  mb: 5,
                  fontSize: "1.1rem",
                  maxWidth: 460,
                  mx: "auto",
                }}
              >
                We’ll run your next employee exit end-to-end and prove the system works.
              </Typography>
                <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() => handleContactClick("I'd like to book a 15-min risk check.")}
                      sx={{
                        fontWeight: 700,
                        px: 5,
                        py: 2,
                        borderRadius: 2,
                        fontSize: "1rem",
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
                      }}
                    >
                    Book a 15-min risk check
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => document.getElementById("platform")?.scrollIntoView({ behavior: "smooth" })}
                    sx={{
                      fontWeight: 500,
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      borderColor: isDark ? alpha("#fff", 0.15) : alpha("#000", 0.15),
                      color: "text.primary",
                      textTransform: "none",
                    }}
                  >
                    Explore Platform
                  </Button>
                </Box>
            </Box>
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
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Platform
              </Typography>
                {["Missed Access Detection", "Workflows", "Integrations", "API"].map((item) => (
                <Typography
                  key={item}
                  variant="body2"
                  sx={{ color: "text.secondary", mb: 1.5, cursor: "pointer" }}
                >
                  {item}
                </Typography>
              ))}
            </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                  Company
                </Typography>
                {["About", "Security", "Careers", "Contact"].map((item) => (
                  <Typography
                    key={item}
                    variant="body2"
                    onClick={() => {
                      if (item === "Contact") {
                        handleContactClick("General inquiry from the landing page.");
                      }
                    }}
                    sx={{ color: "text.secondary", mb: 1.5, cursor: "pointer", "&:hover": { color: "primary.main" } }}
                  >
                    {item}
                  </Typography>
                ))}
              </Grid>
              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                  Resources
                </Typography>
                {["Documentation", "Compliance", "Status", "Support"].map((item) => (
                  <Typography
                    key={item}
                    variant="body2"
                    onClick={() => {
                      if (item === "Support") {
                        handleContactClick("I need support with the platform.");
                      }
                    }}
                    sx={{ color: "text.secondary", mb: 1.5, cursor: "pointer", "&:hover": { color: "primary.main" } }}
                  >
                    {item}
                  </Typography>
                ))}
              </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Legal
              </Typography>
              {["Privacy", "Terms", "Security", "DPA"].map((item) => (
                <Typography
                  key={item}
                  variant="body2"
                  sx={{ color: "text.secondary", mb: 1.5, cursor: "pointer" }}
                >
                  {item}
                </Typography>
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
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    {icon}
                  </span>
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

const RISK_STATS = [
  { value: "76%", label: "Fail to revoke access immediately" },
  { value: "$4.4M", label: "Avg. cost of a data breach" },
  { value: "48h", label: "Critical window for revocation" },
];

const CONTROL_FEATURES = [
  { icon: "key", title: "Missed Access Detection", description: "Instantly detect and revoke lingering access across all SaaS and cloud providers." },
  { icon: "inventory_2", title: "Verified Asset Return", description: "Enforce physical hardware recovery with automated tracking and verification." },
  { icon: "rule", title: "Clear Ownership Between HR & IT", description: "Eliminate ambiguity with defined approval chains and enforced handoffs." },
  { icon: "history_edu", title: "No Steps Skipped, Ever", description: "Every action is logged and verified, creating a defensible audit trail by default." },
];

const OUTCOME_FEATURES = [
  { icon: "verified", title: "Zero Trust Verified", description: "Every access point is double-checked and verified." },
  { icon: "receipt_long", title: "Evidence Packs", description: "Download complete evidence for every offboarding case." },
  { icon: "notifications_active", title: "Risk Alerts", description: "Get notified of any missed steps or residual access." },
];

const PRICING = [
  {
    name: "Free Trial",
    description: "Try OffboardHQ risk-free for 14 days.",
    price: "$0",
    period: "mo",
    cta: "Start Free Trial",
    features: [
      "1 Admin",
      "5 Employees",
      "14-day free trial",
      "Core features included"
    ],
    isTrial: true
  },
  {
    name: "Starter",
    description: "Essential offboarding for small teams.",
    price: "$9.99",
    period: "mo",
    cta: "Start Free Trial",
    features: [
      { text: "Up to 30 Employees", tooltip: "Employees are individuals tracked via Employee Portal for offboarding tasks (includes contractors if they use portal)." },
      { text: "Up to 5 Org Users", tooltip: "Org users are HR, IT, or Admins who manage the platform." },
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
    cta: "Start Free Trial",
    popular: true,
    isTrial: true,
    features: [
      "Higher limits for growing teams",
      "Full asset tracking",
      "Priority support",
      "Audit logs",
      "Contact us if you need more capacity"
    ]
  },
  {
    name: "Enterprise",
    description: "Complete control for large organizations.",
    price: "Custom",
    cta: "Contact Security Team",
    features: [
      "Custom employee limits",
      "SSO integration",
      "Dedicated success manager",
      "Custom workflows"
    ]
  }
];
