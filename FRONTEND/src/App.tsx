import { ThemeProvider } from "@emotion/react";
import { Box, CssBaseline, Stack } from "@mui/material";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainContent from "./components/MainContent";
import { Provider } from "react-redux";
import { Store } from "./store";
import Theme from "./utils/Theme";
import "./App.scss";
import Footer from "./components/Footer";
import AppBar from "./components/AppBar";
import { IngestionPage } from "./components/ingestion";
import { useGetSyncHistoryQuery } from "./store/services/syncApi";

// Subscribes to sync history once at boot so the data is cached and shared app-wide.
function AppContent(): JSX.Element {
  useGetSyncHistoryQuery();
  return (
    <BrowserRouter>
      <Stack id="app" sx={{ minHeight: "100vh", width: "100%" }}>
        <AppBar />
        <Box component="main" sx={{ flex: 1, width: "100%" }}>
          <Routes>
            <Route path="/" element={<MainContent />} />
            <Route path="/setup" element={<IngestionPage />} />
          </Routes>
        </Box>
        <Footer />
      </Stack>
    </BrowserRouter>
  );
}

function App(): JSX.Element {
  return (
    <Provider store={Store}>
      <ThemeProvider theme={Theme}>
        <CssBaseline />
        <AppContent />
      </ThemeProvider>
    </Provider>
  );
}

export default App;
