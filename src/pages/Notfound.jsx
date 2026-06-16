import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

function Notfound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="w-full max-w-lg text-center">
        <div className="relative mb-6">
          <h1 className="text-[150px] font-bold opacity-10 text-primary-500">
            404
          </h1>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              {t("page_not_found")}
            </h2>
            <p className="text-gray-400 mb-6">
              {t("page_not_found_desc")}
            </p>
            <Link
              to="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold transition-colors"
            >
              {t("go_home")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Notfound;
