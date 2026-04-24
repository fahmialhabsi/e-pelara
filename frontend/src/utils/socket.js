// socket.js
import { io } from "socket.io-client";
import { SOCKET_URL } from "../config/runtimeConfig";

const socket = io(SOCKET_URL, {
  query: {
    userId: "USER_ID", // Ganti dengan ID user login
    role: "SUPER ADMIN", // Ganti dengan role user login
  },
});

export default socket;
