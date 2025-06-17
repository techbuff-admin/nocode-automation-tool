// renderer/src/components/PageObjectScanner.tsx
import React, { useState } from 'react';
import { PageObject } from '../../../shared/types';
import InputDialog from './InputDialog';

interface ScannerProps {
  onGenerated: (pages: PageObject[]) => void;
}

export default function PageObjectScanner({ onGenerated }: ScannerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleScan = async (url: string) => {
    setOpen(false);
    setLoading(true);
    try {
      const raw: Array<{ name: string; selector: string }> =
        await window.api.scanPage(url);
      // merge into one PageObject
      const pageObj: PageObject = {
        name: new URL(url).hostname.replace(/\W+/g, '_'),
        selectors: Object.fromEntries(raw.map((r) => [r.name, r.selector])),
      };
      onGenerated([pageObj]);
    } catch (err: any) {
      alert('Scan failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Scanning…' : 'Auto-scan Page 🕵️'}
      </button>

      <InputDialog
        open={open}
        title="Scan Page for Locators"
        label="Page URL:"
        defaultValue=""
        onSubmit={handleScan}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
