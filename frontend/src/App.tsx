// ============================================================
// App — Root component with React Router
// ============================================================

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Home from "./routes/Home";
import Game from "./routes/Game";
import "./App.css";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#232837",
            color: "#f5f5f5",
            border: "1px solid #33374a",
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/local" element={<Game mode="local" />} />
        <Route path="/game/ai" element={<Game mode="ai" />} />
        <Route path="/game/online" element={<Game mode="online" />} />
        <Route path="/game/online/:roomId" element={<Game mode="online" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
