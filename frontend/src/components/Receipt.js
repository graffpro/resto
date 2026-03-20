import React from 'react';

export const Receipt = ({ order, table, venue, settings }) => {
  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * (settings?.tax_percentage || 0) / 100;
  const service = subtotal * (settings?.service_charge_percentage || 0) / 100;
  const total = subtotal + tax + service;

  return (
    <div style={{ 
      width: '80mm', 
      fontFamily: 'monospace', 
      fontSize: '12px',
      padding: '10mm',
      backgroundColor: 'white'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '2px dashed #000', paddingBottom: '10px' }}>
        <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>{settings?.name || 'Green Plate Restaurant'}</h2>
        {settings?.address && <div style={{ fontSize: '10px' }}>{settings.address}</div>}
        {settings?.phone && <div style={{ fontSize: '10px' }}>Tel: {settings.phone}</div>}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Stol:</span>
          <span><strong>{table?.table_number}</strong></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Məkan:</span>
          <span>{venue?.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Sifariş:</span>
          <span>#{order.order_number}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Tarix:</span>
          <span>{new Date(order.ordered_at).toLocaleString('az-AZ')}</span>
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '10px 0', marginBottom: '10px' }}>
        {order.items.map((item, idx) => (
          <div key={idx} style={{ marginBottom: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{item.name}</span>
              <span>{item.price.toFixed(2)} AZN</span>
            </div>
            <div style={{ fontSize: '10px', color: '#666', paddingLeft: '10px' }}>
              {item.quantity} x {item.price.toFixed(2)} AZN
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Ara cəm:</span>
          <span>{subtotal.toFixed(2)} AZN</span>
        </div>
        {settings?.tax_percentage > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <span>ƏDV ({settings.tax_percentage}%):</span>
            <span>{tax.toFixed(2)} AZN</span>
          </div>
        )}
        {settings?.service_charge_percentage > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <span>Xidmət ({settings.service_charge_percentage}%):</span>
            <span>{service.toFixed(2)} AZN</span>
          </div>
        )}
      </div>

      <div style={{ borderTop: '2px solid #000', paddingTop: '10px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold' }}>
          <span>CƏMİ:</span>
          <span>{total.toFixed(2)} {settings?.currency || 'AZN'}</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: '10px', borderTop: '1px dashed #000', paddingTop: '10px' }}>
        <div>Təşəkkür edirik!</div>
        <div>Yenidən gözləyirik</div>
      </div>
    </div>
  );
};

export const printReceipt = (order, table, venue, settings) => {
  const printWindow = window.open('', '_blank');
  const receiptElement = document.createElement('div');
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Çek - ${order.order_number}</title>
      <meta charset="utf-8">
      <style>
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
        body {
          font-family: 'Courier New', monospace;
          width: 80mm;
          margin: 0 auto;
        }
      </style>
    </head>
    <body>
  `);
  
  printWindow.document.write(`
    <div style="width: 80mm; font-family: monospace; font-size: 12px; padding: 10mm; background: white;">
      <div style="text-align: center; margin-bottom: 10px; border-bottom: 2px dashed #000; padding-bottom: 10px;">
        <h2 style="margin: 0 0 5px 0; font-size: 18px;">${settings?.name || 'Green Plate Restaurant'}</h2>
        ${settings?.address ? `<div style="font-size: 10px;">${settings.address}</div>` : ''}
        ${settings?.phone ? `<div style="font-size: 10px;">Tel: ${settings.phone}</div>` : ''}
      </div>

      <div style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between;"><span>Stol:</span><span><strong>${table?.table_number}</strong></span></div>
        <div style="display: flex; justify-content: space-between;"><span>Məkan:</span><span>${venue?.name}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>Sifariş:</span><span>#${order.order_number}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>Tarix:</span><span>${new Date(order.ordered_at).toLocaleString('az-AZ')}</span></div>
      </div>

      <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin-bottom: 10px;">
        ${order.items.map(item => `
          <div style="margin-bottom: 5px;">
            <div style="display: flex; justify-content: space-between;">
              <span>${item.name}</span>
              <span>${item.price.toFixed(2)} AZN</span>
            </div>
            <div style="font-size: 10px; color: #666; padding-left: 10px;">
              ${item.quantity} x ${item.price.toFixed(2)} AZN
            </div>
          </div>
        `).join('')}
      </div>

      <div style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between;"><span>Ara cəm:</span><span>${order.total_amount.toFixed(2)} AZN</span></div>
      </div>

      <div style="border-top: 2px solid #000; padding-top: 10px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
          <span>CƏMİ:</span>
          <span>${order.total_amount.toFixed(2)} ${settings?.currency || 'AZN'}</span>
        </div>
      </div>

      <div style="text-align: center; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px;">
        <div>Təşəkkür edirik!</div>
        <div>Yenidən gözləyirik</div>
      </div>
    </div>
  `);
  
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
  }, 250);
};
