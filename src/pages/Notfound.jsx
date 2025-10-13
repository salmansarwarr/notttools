import React from "react";
import { Link } from "react-router-dom";

function Notfound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-lg">
        <div className="relative text-center mb-6">
          <h1 className="text-[150px] font-bold opacity-10 text-primary-500">
            404
          </h1>
        </div>
      </div>
    </div>
  );
}

export default Notfound;
