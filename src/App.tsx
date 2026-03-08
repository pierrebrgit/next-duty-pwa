import React from 'react';
import { Routes, Route } from "react-router-dom";
import NextFlight from "./components/NextFlight";
import Settings from "./components/Settings";

function App() {
  return (
    <Routes>
      <Route path="/" element={<NextFlight />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<p>There's nothing here: 404!</p>} />
    </Routes>
  );
}

export default App;
