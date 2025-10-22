// src/pages/LoadingPage.js
import React from "react";
import { Spinner } from "@heroui/react";

const Loading = ({ darkMode = true }) => {
  return (
    <div
      className={`items-center justify-center flex min-h-screen w-full ${
        darkMode ? "bg-[#0A151E]" : ""
      }`}
    >
      <Spinner color={darkMode ? "primary" : "default"} />
    </div>
  );
};

export default Loading;
