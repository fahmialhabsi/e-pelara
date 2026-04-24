// src/contexts/NotificationProvider.jsx
import React, { useState, useEffect, useContext, createContext } from "react";

import AuthContext from "./authContext";
import io from "socket.io-client";
import api from "../services/api";
import { SOCKET_URL } from "../config/runtimeConfig";
import { extractListData } from "../utils/apiResponse";

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user, userReady } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!userReady || !user?.token) return;

    const socket = io(SOCKET_URL, {
      query: {
        role: user?.role,
        userId: user?.id,
      },
    });

    api
      .get("/notifications")
      .then((r) => setNotifications(extractListData(r.data)))
      .catch((err) => {
        console.error("Gagal mengambil notifikasi:", err);
      });

    socket.on("new-notification", (note) =>
      setNotifications((n) => [note, ...n])
    );

    return () => {
      socket.off("new-notification");
      socket.disconnect();
    };
  }, [userReady, user]);

  const markRead = (ids) =>
    api
      .post("/notifications/mark-read", { ids })
      .then(() =>
        setNotifications((n) =>
          n.map((x) => (ids.includes(x.id) ? { ...x, read: true } : x))
        )
      );

  return (
    <NotificationContext.Provider value={{ notifications, markRead }}>
      {children}
    </NotificationContext.Provider>
  );
};
