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
          top: 0,
          zIndex: 100,
          bgcolor: alpha(theme.palette.background.default, 0.85),
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid",
          borderColor: isDark ? alpha("#fff", 0.06) : alpha("#000", 0.06),
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
                    fontWeight: 500,
                    fontSize: "0.9rem",
                    "&:hover": { color: "text.primary" },
                  }}
                >
                  {item}
                </Typography>
              ))}
            </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <IconButton onClick={colorMode.toggleColorMode} size="small">
                  <span className="material-symbols-outlined">
                    {isDark ? "light_mode" : "dark_mode"}
                  </span>
                </IconButton>
                <Link href="/login" passHref style={{ textDecoration: "none" }}>
                  <Button sx={{ fontWeight: 600, color: "text.primary" }}>Sign In</Button>
                </Link>
                <Link href="/register" passHref style={{ textDecoration: "none" }}>
                  <Button
                    variant="contained"
                    sx={{
                      fontWeight: 600,
                      px: 2.5,
                      borderRadius: 2,
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
            ? `radial-gradient(ellipse 80% 50% at 50% -10%, ${alpha(theme.palette.primary.main, 0.12)}, transparent)`
            : `radial-gradient(ellipse 80% 50% at 50% -10%, ${alpha(theme.palette.primary.main, 0.06)}, transparent)`,
          position: "relative",
          overflow: "hidden",
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
                  Every Access Revoked.
                  <br />
                  Every Asset Returned.
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
                    Every Audit Passed.
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
                    Automated employee offboarding that eliminates security gaps, 
                    generates audit-ready evidence, and executes with absolute certainty.
                  </MotionTypography>

                  <MotionBox variants={fadeInUp} sx={{ mb: 4 }}>
                        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
                          <Link href="/register" passHref style={{ textDecoration: "none" }}>
                            <Button
                              variant="contained"
                              sx={{
                                fontWeight: 600,
                                px: 4,
                                py: 1.5,
                                borderRadius: 2,
                                fontSize: "0.95rem",
                                minWidth: 200,
                                height: 50,
                                boxShadow: "none",
                                textTransform: "none",
                                "&:hover": {
                                  boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.35)}`,
                                },
                              }}
                            >
                              Start Secure Trial
                            </Button>
                          </Link>
                          <Button
                            variant="outlined"
                            onClick={() => document.getElementById("platform")?.scrollIntoView({ behavior: "smooth" })}
                            sx={{
                              fontWeight: 500,
                              px: 3,
                              py: 1.5,
                              borderRadius: 2,
                              fontSize: "0.95rem",
                              height: 50,
                              color: "text.primary",
                              textTransform: "none",
                              borderColor: isDark ? alpha("#fff", 0.15) : alpha("#000", 0.15),
                              "&:hover": {
                                borderColor: isDark ? alpha("#fff", 0.3) : alpha("#000", 0.3),
                                bgcolor: isDark ? alpha("#fff", 0.04) : alpha("#000", 0.02),
                              },
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
                          <span>No credit card</span>
                          <span style={{ opacity: 0.4 }}>•</span>
                          <span>Isolated workspace</span>
                          <span style={{ opacity: 0.4 }}>•</span>
                          <span>Enterprise-grade security</span>
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
                              px: 2,
                              py: 1,
                              borderRadius: 2,
                              bgcolor: isDark ? alpha("#fff", 0.05) : alpha("#000", 0.03),
                              border: "1px solid",
                              borderColor: isDark ? alpha("#fff", 0.1) : alpha("#000", 0.08),
                              transition: "all 0.2s ease",
                              "&:hover": {
                                bgcolor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.05),
                                borderColor: alpha(theme.palette.primary.main, 0.4),
                              },
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
                                fontWeight: 600, 
                                color: "text.primary",
                                fontSize: "0.8rem",
                                letterSpacing: 0.2
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
                transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
              Employee Exits Are the #1
              <br />
              Hidden Security Risk
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
              Manual revocation failures. Missed assets. Audit stress.
              Every offboarding is a window of vulnerability.
            </Typography>
          </Box>

          <Grid container spacing={4} justifyContent="center">
            {RISK_STATS.map((stat, index) => (
              <Grid size={{ xs: 12, sm: 4 }} key={index}>
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  sx={{ textAlign: "center" }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: "3rem", md: "3.5rem" },
                      fontWeight: 800,
                      color: "primary.main",
                      lineHeight: 1,
                      mb: 1.5,
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 500,
                      maxWidth: 200,
                      mx: "auto",
                    }}
                  >
                    {stat.label}
                  </Typography>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
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
              One System That Enforces
              <br />
              Every Offboarding Step
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
              Not reminders. Enforcement. Every access point tracked,
              every revocation verified, every asset accounted for.
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
                    sx={{
                      height: "100%",
                      borderRadius: 4,
                      borderColor: isDark ? alpha("#fff", 0.06) : alpha("#000", 0.06),
                      bgcolor: isDark ? alpha("#fff", 0.02) : "#fff",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        borderColor: alpha(theme.palette.primary.main, 0.3),
                        transform: "translateY(-4px)",
                      },
                    }}
                  >
                    <CardContent sx={{ p: 4 }}>
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: 3,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mb: 3,
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 26, color: theme.palette.primary.main }}
                        >
                          {feature.icon}
                        </span>
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, fontSize: "1.1rem" }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
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
              Nothing Slips. Nothing Breaks.
              <br />
              Nothing Gets Missed.
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
              Complete visibility. Immutable records. Audit confidence
              that lets you sleep at night.
            </Typography>
          </Box>

          <Grid container spacing={4} justifyContent="center">
            {OUTCOME_FEATURES.map((feature, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                <MotionBox
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <Card
                    variant="outlined"
                    sx={{
                      height: "100%",
                      borderRadius: 4,
                      borderColor: isDark ? alpha("#fff", 0.06) : alpha("#000", 0.06),
                      bgcolor: isDark ? alpha("#fff", 0.02) : "#fff",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        borderColor: alpha(theme.palette.primary.main, 0.3),
                        transform: "translateY(-4px)",
                      },
                    }}
                  >
                    <CardContent sx={{ p: 4 }}>
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: 3,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mb: 3,
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 26, color: theme.palette.primary.main }}
                        >
                          {feature.icon}
                        </span>
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, fontSize: "1.1rem" }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
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

      <Box
        sx={{
          py: { xs: 14, md: 20 },
          bgcolor: isDark ? alpha("#fff", 0.01) : "#FAFBFC",
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ textAlign: "center" }}>
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
              Employee exits are stressful enough. OffboardHQ works quietly in the background,
              enforcing policies automatically, reducing cognitive load, and giving you
              predictability when you need it most.
            </Typography>

            <Grid container spacing={4} sx={{ mt: 2 }}>
              {[
                { icon: "auto_mode", label: "Quiet Automation", desc: "Runs without constant attention" },
                { icon: "lock", label: "Background Enforcement", desc: "Policies execute automatically" },
                { icon: "psychology", label: "Reduced Cognitive Load", desc: "One dashboard, full visibility" },
                { icon: "event_available", label: "Predictable Outcomes", desc: "Same process, every time" },
              ].map((item, index) => (
                <Grid size={{ xs: 6, md: 3 }} key={index}>
                  <Box sx={{ textAlign: "center" }}>
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
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
      </Box>

      <Box id="pricing" sx={{ py: { xs: 14, md: 20 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 8 }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                letterSpacing: -1.5,
                mb: 2,
                fontSize: { xs: "2rem", md: "2.5rem" },
              }}
            >
              Simple, Predictable Pricing
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
                Pricing reflects organizational complexity, not headcount.
                Flexible plans designed to scale with your security needs.
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
                          height: "100%",
                          borderRadius: 4,
                          borderColor: plan.isTrial 
                            ? alpha(theme.palette.primary.main, 0.3)
                            : isDark ? alpha("#fff", 0.08) : alpha("#000", 0.08),
                          bgcolor: plan.isTrial
                            ? alpha(theme.palette.primary.main, 0.04)
                            : isDark ? alpha("#fff", 0.02) : "#fff",
                          display: "flex",
                          flexDirection: "column",
                          transition: "all 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
                          userSelect: "none",
                          "&:hover": {
                            borderColor: alpha(theme.palette.primary.main, plan.isTrial ? 0.5 : 0.3),
                            transform: "translateY(-4px)",
                            boxShadow: isDark 
                              ? `0 12px 24px -8px ${alpha("#000", 0.5)}`
                              : `0 12px 24px -8px ${alpha(theme.palette.primary.main, 0.1)}`,
                          },
                          "&:active": {
                            transform: "translateY(-2px)",
                          }
                        }}
                      >
                        <CardContent sx={{ p: 3.5, flex: 1, display: "flex", flexDirection: "column" }}>
                          <Box sx={{ mb: 3 }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                              <Typography 
                                variant="overline" 
                                sx={{ 
                                  fontWeight: 800, 
                                  fontSize: "0.7rem",
                                  letterSpacing: 1,
                                  color: plan.isTrial || plan.popular ? "primary.main" : "text.secondary"
                                }}
                              >
                                {plan.name}
                              </Typography>
                              {plan.isTrial && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: 1,
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: "primary.main",
                                    fontWeight: 700,
                                    fontSize: "0.6rem",
                                    letterSpacing: 0.5,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  No Card
                                </Typography>
                              )}
                              {plan.popular && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: 1,
                                    bgcolor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.05),
                                    color: "text.primary",
                                    fontWeight: 700,
                                    fontSize: "0.6rem",
                                    letterSpacing: 0.5,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Popular
                                </Typography>
                              )}
                            </Box>
                            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.85rem", lineHeight: 1.5, minHeight: "2.25rem" }}>
                              {plan.description}
                            </Typography>
                          </Box>
  
                          <Box sx={{ mb: 4, minHeight: "4rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                            <Box sx={{ display: "flex", alignItems: "baseline" }}>
                              <Typography sx={{ fontSize: "2.5rem", fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>
                                {plan.price}
                              </Typography>
                              {plan.period && (
                                <Typography sx={{ color: "text.secondary", ml: 1, fontSize: "0.9rem", fontWeight: 500 }}>
                                  /{plan.period}
                                </Typography>
                              )}
                            </Box>
                            <Typography variant="caption" sx={{ color: "text.secondary", mt: 1, display: "block", fontWeight: 500 }}>
                              {plan.isTrial ? "Trial period (14 days)" : "Billed monthly"}
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
                                    // Other plans could also trigger contact if needed, but they are trial/direct currently
                                    window.location.href = "/register";
                                  }
                                }}
                                sx={{
                                  fontWeight: 700,

                                py: 1.5,
                                borderRadius: 2.5,
                                fontSize: "0.85rem",
                                textTransform: "none",
                                transition: "all 0.2s ease",
                                ...(plan.isTrial && {
                                  bgcolor: theme.palette.primary.main,
                                  "&:hover": {
                                    bgcolor: theme.palette.primary.dark,
                                    boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`,
                                  }
                                }),
                                ...(!plan.isTrial && !plan.popular && {
                                  borderColor: isDark ? alpha("#fff", 0.15) : alpha("#000", 0.15),
                                  color: "text.primary",
                                  "&:hover": {
                                    borderColor: theme.palette.primary.main,
                                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                                  },
                                }),
                                "&:active": {
                                  transform: "scale(0.98)",
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
                                color: "text.secondary",
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
                                  <Typography variant="body2" sx={{ fontSize: "0.85rem", lineHeight: 1.5, display: "flex", alignItems: "center", gap: 0.5, fontWeight: 500 }}>
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
                            {plan.limitations?.map((limitation, idx) => (
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
                            ))}
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
              Ready to Secure Your Offboarding?
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
              See how OffboardHQ can eliminate security gaps and
              bring predictability to your employee exit process.
            </Typography>
              <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/register" passHref style={{ textDecoration: "none" }}>
                    <Button
                      variant="contained"
                      size="large"
                      sx={{
                        fontWeight: 600,
                        px: 5,
                        py: 1.5,
                        borderRadius: 2,
                        fontSize: "1rem",
                        textTransform: "none",
                      }}
                    >
                      Start Secure Trial
                    </Button>
                </Link>
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
              {["Risk Radar", "Workflows", "Integrations", "API"].map((item) => (
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
