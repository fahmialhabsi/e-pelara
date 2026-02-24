// src/components/Dashboard/ModalWrapper.js
import React from "react";
import { Modal } from "react-bootstrap";

const ModalWrapper = ({ modal, onClose }) => {
  const FormComponent = modal.Form;

  return (
    <Modal show={modal.show} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          Input {FormComponent?.name.replace(/Form$/, "")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {FormComponent &&
          React.createElement(FormComponent, {
            initialData: modal.data,
            onSuccess: onClose,
          })}
      </Modal.Body>
    </Modal>
  );
};

export default ModalWrapper;
