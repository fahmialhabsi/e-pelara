import React from 'react';
import { Alert, Button } from 'antd';

class MrModuleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error('MR module runtime error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          type="error"
          showIcon
          message="Terjadi kesalahan pada modul MR"
          description={
            <div>
              Silakan muat ulang halaman. Jika masalah berulang, hubungi admin sistem.
              <div style={{ marginTop: 12 }}>
                <Button onClick={() => window.location.reload()}>Muat Ulang</Button>
              </div>
            </div>
          }
        />
      );
    }

    return this.props.children;
  }
}

export default MrModuleErrorBoundary;
