// src/pages/NotifikasiPage.js
import React, { useContext } from "react";
import { Container, Card, Badge } from "react-bootstrap";
import { NotificationContext } from "../../contexts/NotificationContext";
import DeadlinePanel from "../../pages/notifications/Modul4_DeadlinePanel";

export default function NotifikasiPage() {
  const { notifications } = useContext(NotificationContext);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Container>
      <Card className="mb-4">
        <Card.Header>
          <strong>Notifikasi & Tracking Deadline</strong>
          <Badge bg="danger" className="ms-2">
            {unreadCount}
          </Badge>
        </Card.Header>
        <Card.Body>
          <DeadlinePanel />
        </Card.Body>
      </Card>
    </Container>
  );
}
