import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BrowserMultiFormatReader } from '@zxing/library';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (isOpen) {
      startScanning();
    } else {
      stopScanning();
    }
    
    return () => stopScanning();
  }, [isOpen]);

  const startScanning = async () => {
    try {
      codeReader.current = new BrowserMultiFormatReader();
      
      const videoInputDevices = await codeReader.current.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        setError('No camera found');
        return;
      }

      codeReader.current.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result, err) => {
          if (result) {
            onScan(result.getText());
            setIsOpen(false);
          }
          if (err && !(err.name === 'NotFoundException')) {
            console.error(err);
          }
        }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to access camera');
    }
  };

  const stopScanning = () => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Camera className="h-4 w-4 mr-2" />
        Scan Barcode
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error ? (
              <div className="text-center text-destructive">
                <p>{error}</p>
              </div>
            ) : (
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Position the barcode within the camera view
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
