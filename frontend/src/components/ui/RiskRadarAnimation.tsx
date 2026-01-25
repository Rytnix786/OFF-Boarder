"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Box, alpha, useTheme, Typography } from "@mui/material";

const TOTAL_FRAMES = 40;
const FRAME_DURATION = 120;

interface RiskRadarAnimationProps {
  scrollProgress?: number;
  autoplay?: boolean;
  loop?: boolean;
}

export function RiskRadarAnimation({ 
  scrollProgress, 
  autoplay = true,
  loop = true
}: RiskRadarAnimationProps) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [isVisible, setIsVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [loadedFrames, setLoadedFrames] = useState<Set<number>>(new Set());
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  const getFramePath = useCallback((frameNum: number) => {
    const paddedNum = String(frameNum).padStart(3, "0");
    return `/animations/risk-radar/ezgif-frame-${paddedNum}.png`;
  }, []);

  useEffect(() => {
    const loadPromises: Promise<void>[] = [];
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const promise = new Promise<void>((resolve) => {
        img.onload = () => {
          setLoadedFrames((prev) => new Set(prev).add(i));
          resolve();
        };
        img.onerror = () => resolve();
      });
      img.src = getFramePath(i);
      loadPromises.push(promise);
    }
  }, [getFramePath]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (scrollProgress !== undefined) {
      const frame = Math.min(Math.max(1, Math.ceil(scrollProgress * TOTAL_FRAMES)), TOTAL_FRAMES);
      setCurrentFrame(frame);
      return;
    }

    if (!autoplay || !isVisible || prefersReducedMotion) {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    animationRef.current = setInterval(() => {
      setCurrentFrame((prev) => {
        if (prev >= TOTAL_FRAMES) {
          if (!loop) {
            if (animationRef.current) {
              clearInterval(animationRef.current);
              animationRef.current = null;
            }
            return TOTAL_FRAMES;
          }
          return 1;
        }
        return prev + 1;
      });
    }, FRAME_DURATION);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [scrollProgress, autoplay, isVisible, prefersReducedMotion, loop]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const isLoaded = loadedFrames.size >= 5;
  const shouldAnimate = !prefersReducedMotion && isVisible;

  return (
    <Box
      ref={containerRef}
      sx={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        borderRadius: 4,
        overflow: "hidden",
        bgcolor: "#0a0f1c",
        boxShadow: `0 25px 80px ${alpha(theme.palette.primary.main, 0.2)}`,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          opacity: isLoaded ? 0 : 1,
          transition: "opacity 0.5s ease-out",
          background: "linear-gradient(135deg, #0a0f1c 0%, #1a1f2e 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            border: "3px solid",
            borderColor: "primary.main",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            "@keyframes spin": {
              "0%": { transform: "rotate(0deg)" },
              "100%": { transform: "rotate(360deg)" },
            },
          }}
        />
      </Box>

      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          opacity: isLoaded ? 1 : 0,
          transition: "opacity 0.5s ease-out",
          zIndex: 1,
        }}
      >
        <Box
          component="img"
          src={getFramePath(currentFrame)}
          alt="Risk Radar Animation"
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      </Box>

      {shouldAnimate && (
        <>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 70%)`,
              animation: "ambientPulse 8s ease-in-out infinite",
              pointerEvents: "none",
              zIndex: 2,
              "@keyframes ambientPulse": {
                "0%, 100%": { opacity: 0.03 },
                "50%": { opacity: 0.08 },
              },
            }}
          />
        </>
      )}

      <Box
        sx={{
          position: "absolute",
          inset: 0,
          border: "1px solid",
          borderColor: alpha(theme.palette.primary.main, 0.1),
          borderRadius: 4,
          pointerEvents: "none",
          zIndex: 5,
        }}
      />
    </Box>
  );
}
