import { useState } from "react";
import { InputGroup, Button, Form } from "react-bootstrap";
import { FaEye, FaEyeSlash } from "react-icons/fa";

/**
 * Kolom password dengan tombol lihat/sembunyikan isian.
 * Semua props selain showToggle diteruskan ke Form.Control.
 */
export default function PasswordInputWithToggle({
  showToggle = true,
  ...controlProps
}) {
  const [visible, setVisible] = useState(false);
  // Abaikan type dari caller; visibility mengatur text vs password.
  const { type: _omitType, ...rest } = controlProps;

  if (!showToggle) {
    return <Form.Control type="password" {...rest} />;
  }

  return (
    <InputGroup>
      <Form.Control
        {...rest}
        type={visible ? "text" : "password"}
      />
      <Button
        variant="outline-secondary"
        type="button"
        className="px-3 border-start-0"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        title={visible ? "Sembunyikan" : "Tampilkan"}
      >
        {visible ? <FaEyeSlash aria-hidden /> : <FaEye aria-hidden />}
      </Button>
    </InputGroup>
  );
}
