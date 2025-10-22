import { useGlobalState } from "./useGlobalState";
import axios from "axios";
import constants from "../constants";

const useRefreshState = () => {
  const { setGlobalState } = useGlobalState();

  const getData = async () => {
    try {
      const token = localStorage.getItem("auth_token");

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

          console.log("Refresh user data:", response.data);

          setGlobalState((prevState) => ({
            ...prevState,
            authToken: token,
            user: response.data.data || response.data, // Directus format
          }));
        } catch (error) {
          console.error("Token invalid during refresh, logging out:", error);
          // Token geçersiz - logout yap
          setGlobalState((prevState) => ({
            ...prevState,
            authToken: null,
            user: null,
          }));
          localStorage.removeItem("auth_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user_id");
        }
      } else {
        setGlobalState((prevState) => ({
          ...prevState,
          authToken: null,
          user: null,
        }));
      }
    } catch (error) {
      console.log("Refresh response failed:", error);
    }
  };

  return { getData };
};

export default useRefreshState;
