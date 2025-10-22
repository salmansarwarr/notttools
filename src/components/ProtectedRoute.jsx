// src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import constants from "../constants";
import Loading from "./Loading";
import { useGlobalState } from "../hooks/useGlobalState";

const ProtectedRoute = ({
  children,
  requireAuth = true, // Varsayılan: giriş gereksin
  fallbackPath = "/", // Giriş gerektirenlerde login'e, gerektirmeyenlerde dashboard'a yönlendir
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLogged, setIsLogged] = useState(false);
  const { globalState } = useGlobalState();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    // Token yoksa direkt login değil
    if (!token) {
      setIsLogged(false);
      setIsLoading(false);
      return;
    }

    // Token varsa /users/me ile sorguluyoruz
    axios
      .get(`${constants.backend_url}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        setIsLogged(true);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLogged(false);
        setIsLoading(false);
      });
  }, [globalState]);

  if (isLoading) {
    return <Loading />;
  }

  const shouldRedirect =
    (requireAuth && !isLogged) || (!requireAuth && isLogged);

  if (shouldRedirect) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Koşullar sağlanıyorsa children'ı render et
  return children;
};

export default ProtectedRoute;
