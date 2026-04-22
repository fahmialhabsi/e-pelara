import React from "react";
import { Alert, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import { PRICING_PATH } from "../../utils/planFeatures";

/** Pesan konsisten + CTA ke halaman pricing */
export default function UpgradeProHint({ className = "mb-3" }) {
  return (
    <Alert variant="warning" className={className}>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <strong>Upgrade ke PRO</strong> — fitur ini tidak tersedia pada paket langganan Anda.
        </div>
        <Button
          as={Link}
          to={PRICING_PATH}
          variant="warning"
          size="sm"
          className="text-dark fw-semibold border border-dark border-opacity-25"
        >
          Upgrade ke PRO
        </Button>
      </div>
    </Alert>
  );
}
