"use client";

import React from "react";
import {
    Box,
    AppBar,
    Toolbar,
    InputBase,
    IconButton,
    Badge,
    Button,
    alpha,
    styled,
    useTheme,
    Typography,
} from "@mui/material";
import { ColorModeContext } from "@/theme/ThemeRegistry";

const Search = styled("div")(({ theme }) => ({
    position: "relative",
    borderRadius: 8,
    backgroundColor: theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
    "&:hover": {
        backgroundColor: theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
    },
    marginRight: theme.spacing(2),
    marginLeft: 0,
    width: "100%",
    [theme.breakpoints.up("sm")]: {
        marginLeft: theme.spacing(3),
        width: "auto",
        minWidth: "400px",
    },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
    padding: theme.spacing(0, 2),
    height: "100%",
    position: "absolute",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.palette.text.secondary,
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
    color: "inherit",
    width: "100%",
    "& .MuiInputBase-input": {
        padding: theme.spacing(1, 1, 1, 0),
        paddingLeft: `calc(1em + ${theme.spacing(4)})`,
        transition: theme.transitions.create("width"),
        fontSize: "0.875rem",
        fontWeight: 500,
    },
}));

export default function Header() {
    const theme = useTheme();
    const colorMode = React.useContext(ColorModeContext);

    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={{
                bgcolor: "background.paper",
                borderBottom: "1px solid",
                borderColor: "divider",
                color: "text.primary",
            }}
        >
            <Toolbar sx={{ height: 72, px: { xs: 2, sm: 4 } }}>
                <Search>
                    <SearchIconWrapper>
                        <span className="material-symbols-outlined">search</span>
                    </SearchIconWrapper>
                    <StyledInputBase
                        placeholder="Search for employees, tasks, or integrations..."
                        inputProps={{ "aria-label": "search" }}
                    />
                </Search>

                <Box sx={{ flexGrow: 1 }} />

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <IconButton size="large" onClick={colorMode.toggleColorMode} color="inherit">
                        {theme.palette.mode === 'dark' ? (
                            <span className="material-symbols-outlined">light_mode</span>
                        ) : (
                            <span className="material-symbols-outlined">dark_mode</span>
                        )}
                    </IconButton>

                    <IconButton size="large" color="inherit">
                        <Badge badgeContent={3} color="error">
                            <span className="material-symbols-outlined">notifications</span>
                        </Badge>
                    </IconButton>

                    <Button
                        variant="contained"
                        startIcon={<span className="material-symbols-outlined">bolt</span>}
                        sx={{
                            ml: 2,
                            px: 3,
                            py: 1.2,
                            borderRadius: "12px",
                            fontWeight: 700,
                            textTransform: "none",
                            bgcolor: "primary.main",
                            "&:hover": { bgcolor: "primary.dark" }
                        }}
                    >
                        Trigger Offboarding
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
