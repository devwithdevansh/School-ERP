import React, { useEffect, useState } from 'react';
import type { PaymentTransaction } from '../mockData';
import { useApp } from '../store';
import { generateReceiptHTML, fetchAsBase64 } from '../utils/printUtils';
import { brand } from '../config/brand';

const logoPath = brand.logo;
const watermarkLogoPath = brand.logo;

interface PrintReceiptProps {
  transaction: PaymentTransaction | null;
}

export const PrintReceipt: React.FC<PrintReceiptProps> = ({ transaction }) => {
  const { currentUser } = useApp();
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    if (!transaction) return;

    let isMounted = true;
    const loadHtml = async () => {
      try {
        const [logoBase64, watermarkBase64] = await Promise.all([
          fetchAsBase64(logoPath),
          fetchAsBase64(watermarkLogoPath),
        ]);
        
        if (!isMounted) return;

        const html = generateReceiptHTML(transaction, {
          currentUserName: currentUser?.name,
          logoBase64,
          watermarkBase64,
        });

        setHtmlContent(html);
      } catch (err) {
        console.error('Error generating preview:', err);
      }
    };

    loadHtml();
    return () => { isMounted = false; };
  }, [transaction, currentUser]);

  if (!transaction) return null;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#e2e8f0',
      padding: '20px'
    }}>
      <div style={{
        width: '210mm',
        height: '297mm',
        background: '#fff',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {htmlContent ? (
          <iframe
            srcDoc={htmlContent}
            title="Receipt Preview"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            Loading preview...
          </div>
        )}
      </div>
    </div>
  );
};
