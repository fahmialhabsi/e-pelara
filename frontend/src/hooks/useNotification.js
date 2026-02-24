// src/hooks/useNotification.js
import { useContext } from "react";
import { NotificationContext } from "../contexts/NotificationProvider";

export const useNotification = () => useContext(NotificationContext);
