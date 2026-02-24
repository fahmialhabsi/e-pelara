// src/modules/Modul4_DeadlinePanel.js
import React, { useContext, useState } from "react";
import { ListGroup, Badge, Spinner, Button } from "react-bootstrap";
import { NotificationContext } from "../../contexts/NotificationProvider";

export default function DeadlinePanel() {
  const { notifications, markRead } = useContext(NotificationContext);
  const [loading] = useState(false);

  if (loading) return <Spinner animation="border" />;
  return (
    <ListGroup>
      {notifications.map((n) => (
        <ListGroup.Item
          key={n.id}
          className="d-flex justify-content-between align-items-start"
        >
          <div>
            <div>{n.message}</div>
            <small>{new Date(n.timestamp).toLocaleString()}</small>
          </div>
          <div>
            {!n.read && (
              <Button size="sm" onClick={() => markRead([n.id])}>
                Mark Read
              </Button>
            )}
            <Badge
              bg={
                n.isOverdue ? "danger" : n.daysLeft <= 2 ? "warning" : "success"
              }
              className="ms-2"
            >
              {n.isOverdue ? "Terlambat" : `${n.daysLeft} hari lagi`}
            </Badge>
          </div>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
}
