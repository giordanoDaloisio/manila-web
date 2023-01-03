import React from 'react';
import ReactDOM from 'react-dom/client';
import Home from './pages/Home';
import { ChakraProvider } from '@chakra-ui/react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { HOME, FORM } from './routes';
import Form from './pages/Form';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ChakraProvider>
    <BrowserRouter>
      <Routes>
        <Route path={HOME} element={<Home/>} />
        <Route path={FORM} element={<Form/>}/>
      </Routes>
    </BrowserRouter>
  </ChakraProvider>
);
