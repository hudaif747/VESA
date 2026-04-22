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

/**
 * This is the root element of the application. The layout is made up of three sections: The Appbar, the search box and the Main content.
 * The AppProvider provides the app with global states.
 */
function App(): JSX.Element {
  return (
    <Provider store={Store}>
      <ThemeProvider theme={Theme}>
        <CssBaseline />
        <BrowserRouter>
          <Stack id="app" sx={{ minHeight: "100vh", width: "100%" }}>
            <AppBar />
            <Box
              component="main"
              sx={{
                flex: 1,
                width: "100%",
              }}
            >
              <Routes>
                <Route path="/" element={<MainContent />} />
                <Route path="/setup" element={<IngestionPage />} />
              </Routes>
            </Box>
            <Footer />
          </Stack>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
