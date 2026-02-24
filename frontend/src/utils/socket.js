// socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  query: {
    userId: "USER_ID", // Ganti dengan ID user login
    role: "SUPER ADMIN", // Ganti dengan role user login
  },
});

export default socket;
