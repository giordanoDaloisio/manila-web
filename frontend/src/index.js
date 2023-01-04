import { ChakraProvider } from "@chakra-ui/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Form from "./pages/Form";
import { HOME } from "./routes";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <ChakraProvider>
    <BrowserRouter>
      <Routes>
        <Route path={HOME} element={<Form />} />
      </Routes>
    </BrowserRouter>
  </ChakraProvider>
);
