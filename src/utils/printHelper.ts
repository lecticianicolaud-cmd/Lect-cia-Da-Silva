export const handlePrintElement = (contentHTML: string, docTitle: string) => {
  try {
    const printWindow = window.open('', '_blank', 'width=950,height=700');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${docTitle}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; background: white; color: #1e293b; }
              @media print {
                body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            ${contentHTML}
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      return;
    }
  } catch (err) {
    console.error('Popup print failed, falling back to window.print', err);
  }
  window.print();
};
