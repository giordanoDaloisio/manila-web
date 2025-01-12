import { ChakraProvider } from "@chakra-ui/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { extendTheme } from "@chakra-ui/react";
// import "@fontsource/your-custom-font"; // Replace with your custom font

const root = ReactDOM.createRoot(document.getElementById("root"));
const theme = extendTheme({
  fonts: {
    heading: "Funnel Display, sans-serif",
    body: "Funnel Display, sans-serif",
  },
});

root.render(
  <React.StrictMode>
    <ChakraProvider theme={theme} resetCSS>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
);
