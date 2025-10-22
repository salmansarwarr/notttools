import React, { createContext, useContext, useEffect, useState } from "react";
import constants from "../constants";
import axios from "axios";

const GlobalStateContext = createContext();

export const GlobalStateProvider = ({ children }) => {
  const [globalState, setGlobalState] = useState({
    authToken: null,
    user: null,
    refresh_token: null,
  });

  useEffect(() => {
    const getUser = async () => {
      const token = localStorage.getItem("auth_token");
      const userId = localStorage.getItem("user_id"); // user_id varsa

      if (token) {
        try {
          const response = await axios.get(
            `${constants.backend_url}/users/me`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          console.log("User data from /users/me:", response.data);

          setGlobalState((prevState) => ({
            ...prevState,
            authToken: token,
            user: response.data.data || response.data, // Directus format
          }));
        } catch (error) {
          console.error("Token invalid, logging out:", error);
          // Token geçersiz - logout yap
          setGlobalState({
            authToken: null,
            user: null,
            refresh_token: null,
          });
          localStorage.removeItem("auth_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user_id");
        }
      } else if (userId) {
        // Token yok ama user_id var - token expired olabilir
        console.log("Token missing but user_id exists, logging out");
        localStorage.removeItem("user_id");
        setGlobalState({
          authToken: null,
          user: null,
          refresh_token: null,
        });
      } else {
        setGlobalState({
          authToken: null,
          user: null,
          refresh_token: null,
        });
      }
    };

    getUser();
  }, []);

  const logout = () => {
    console.log("Logout function called");
    setGlobalState({ authToken: null, user: null, refresh_token: null });
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_id");
  };

  return (
    <GlobalStateContext.Provider
      value={{ globalState, setGlobalState, logout }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error("Global state is on wrong place");
  }
  return context;
};
