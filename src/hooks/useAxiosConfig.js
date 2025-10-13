import axios from "axios";
import constants from "../constants";

export const useAxiosConfig = () => {
  const axiosInstance = axios.create({
    baseURL: constants.backend_url, // Directus URL'niz
  });

  axiosInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return axiosInstance;
};
