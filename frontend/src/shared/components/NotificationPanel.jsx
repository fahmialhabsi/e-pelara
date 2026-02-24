import React, { useContext } from "react";
import { Button } from "react-bootstrap";
import { NotificationContext } from "../../contexts/NotificationProvider";

export default function NotificationPanel() {
  const { notifications, markRead } = useContext(NotificationContext);
  return (
    <div className="notif-panel">
      {notifications.map((n) => (
        <div key={n.id} className={`notif-item ${n.read ? "read" : ""}`}>
          <small>{new Date(n.timestamp).toLocaleString()}</small>
          <p>{n.message}</p>
          {!n.read && (
            <Button size="sm" onClick={() => markRead([n.id])}>
              Mark Read
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
