import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Download } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeGeneratorProps {
  value: string;
  productName?: string;
  price?: number;
  sku?: string;
}

export function BarcodeGenerator({ value, productName, price, sku }: BarcodeGeneratorProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: 'CODE128',
          width: 2,
          height: 100,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
        toast.error('Failed to generate barcode');
      }
    }
  }, [value]);

  const handlePrint = () => {
    if (!containerRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print labels');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label - ${productName || sku || value}</title>
          <style>
            @page {
              size: 4in 2in;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 2in;
            }
            .label {
              width: 100%;
              text-align: center;
            }
            .product-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #000;
            }
            .sku {
              font-size: 12px;
              color: #666;
              margin-bottom: 10px;
            }
            .price {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin-top: 10px;
            }
            svg {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          <div class="label">
            ${productName ? `<div class="product-name">${productName}</div>` : ''}
            ${sku ? `<div class="sku">SKU: ${sku}</div>` : ''}
            ${containerRef.current.querySelector('svg')?.outerHTML || ''}
            ${price ? `<div class="price">KSh ${price.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</div>` : ''}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 100);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    if (!barcodeRef.current) return;

    const svgData = new XMLSerializer().serializeToString(barcodeRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `barcode-${sku || value}.png`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Barcode downloaded');
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Product Label</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Label
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="bg-white p-6 rounded-lg border-2 border-dashed border-border flex flex-col items-center space-y-4">
          {productName && (
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground">{productName}</h3>
              {sku && <p className="text-sm text-muted-foreground">SKU: {sku}</p>}
            </div>
          )}
          <svg ref={barcodeRef}></svg>
          {price && (
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                KSh {price.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
