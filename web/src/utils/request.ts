import axios from "axios";
import { message } from "antd";

const request = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

request.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    if (response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    } else {
      message.error(response?.data?.message || "An error occurred");
    }
    return Promise.reject(error);
  }
);

export default request;
