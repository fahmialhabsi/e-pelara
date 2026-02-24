import React, { useState } from "react";
import { Button, Card, Spinner, Form } from "react-bootstrap";
import api from "../../services/api";

export default function RekomendasiAI({ indikatorList = [] }) {
  const [loading, setLoading] = useState(false);
  const [rekomendasi, setRekomendasi] = useState("");

  const handleGenerateAI = async () => {
    setLoading(true);
    setRekomendasi("");
    try {
      const response = await fetch("/rekomendasi-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indikatorList }),
      });

      const data = await response.json();
      setRekomendasi(data.rekomendasi || "Tidak ada rekomendasi.");
    } catch (err) {
      console.error("Gagal menghubungi AI:", err);
      setRekomendasi("Terjadi kesalahan saat memproses rekomendasi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-3 mt-4 shadow-sm">
      <h5 className="mb-3">Rekomendasi</h5>
      <Button variant="info" onClick={handleGenerateAI} disabled={loading}>
        {loading ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            Membuat Rekomendasi...
          </>
        ) : (
          "\uD83D\uDD0D Buat dengan AI"
        )}
      </Button>

      {rekomendasi && (
        <Form.Group className="mt-3">
          <Form.Label>Hasil Rekomendasi</Form.Label>
          <Form.Control as="textarea" rows={6} readOnly value={rekomendasi} />
        </Form.Group>
      )}
    </Card>
  );
}
