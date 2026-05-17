import React from "react";
import { Container } from "react-bootstrap";
import SubKegiatanForm from "@/components/forms/SubKegiatanForm";

export default function SubKegiatanEdit() {
  return (
    <Container className="my-4">
      <h4>Edit Sub Kegiatan</h4>
      <SubKegiatanForm />
    </Container>
  );
}