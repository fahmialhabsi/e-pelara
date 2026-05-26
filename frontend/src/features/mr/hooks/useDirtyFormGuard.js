import { useEffect } from 'react';

const DEFAULT_MESSAGE =
  'Ada perubahan yang belum disimpan. Yakin ingin meninggalkan halaman ini?';

export default function useDirtyFormGuard(isDirty, messageText = DEFAULT_MESSAGE) {
  useEffect(() => {
    const handler = (event) => {
      if (!isDirty) return undefined;

      event.preventDefault();
      event.returnValue = messageText;
      return messageText;
    };

    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
    };
  }, [isDirty, messageText]);
}
