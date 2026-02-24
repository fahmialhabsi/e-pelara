// src/pages/SettingsPage.js
import React from "react";
import { Container, Card, Form, Button } from "react-bootstrap";

export default function SettingsPage() {
  // Example settings: default deadline reminder days
  const [reminderDays, setReminderDays] = React.useState(3);

  const handleSave = () => {
    // TODO: call API to save settings
    alert(`Reminder set to ${reminderDays} days before deadline`);
  };

  return (
    <Container>
      <h3 className="mb-4">Pengaturan Super Admin</h3>
      <Card>
        <Card.Body>
          <Form>
            <Form.Group controlId="reminderDays" className="mb-3">
              <Form.Label>Default Reminder (hari sebelum deadline)</Form.Label>
              <Form.Control
                type="number"
                value={reminderDays}
                onChange={(e) => setReminderDays(Number(e.target.value))}
              />
            </Form.Group>
            <Button variant="primary" onClick={handleSave}>
              Save Settings
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
