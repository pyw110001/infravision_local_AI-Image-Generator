import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CanvasEditorProps {
  baseImageUrl: string | null;
  resultImageUrl: string | null;
  mode: 'view' | 'mask' | 'compare';
  brushSize: number;
  onMaskChange: (maskDataUrl: string) => void;
}

const CanvasEditor: React.FC<CanvasEditorProps> = ({
  baseImageUrl,
  resultImageUrl,
  mode,
  brushSize,
  onMaskChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [comparePos, setComparePos] = useState(50); // Percentage 0-100

  // Handle Canvas Drawing (Masking)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== 'mask') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas sizing if needed, or clear it
    // In a real app, we'd sync this with image dimensions more robustly
  }, [mode]);

  const startDrawing = (e: React.MouseEvent) => {
    if (mode !== 'mask') return;
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    if (mode !== 'mask' || !isDrawing) return;
    setIsDrawing(false);
    // Export mask
    if (canvasRef.current) {
      onMaskChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || mode !== 'mask' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Semi-transparent red mask
    ctx.beginPath();
    ctx.moveTo(x, y); // Simply dot if just click, need prev pos for lines
    ctx.lineTo(x, y); // Simplified for this snippet
    ctx.stroke();
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
      if(!isDrawing) return;
      draw(e);
  }

  // Clear mask
  const clearMask = () => {
      const canvas = canvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0,0, canvas.width, canvas.height);
          onMaskChange('');
      }
  }

  // Initialize Canvas Image
  useEffect(() => {
    if (!baseImageUrl || !canvasRef.current) return;
    const img = new Image();
    img.src = baseImageUrl;
    img.onload = () => {
      if (canvasRef.current) {
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;
      }
    }
  }, [baseImageUrl]);

  return (
    <div className="relative w-full h-full bg-gray-100 dark:bg-neutral-900 flex items-center justify-center overflow-hidden transition-colors duration-200" ref={containerRef}>
      {!baseImageUrl && (
        <div className="text-gray-400 dark:text-gray-500 flex flex-col items-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <p className="font-medium">请先上传一张底图</p>
        </div>
      )}

      {baseImageUrl && mode !== 'compare' && (
        <div className="relative shadow-2xl">
           {/* Base or Result Image Layer */}
           <img 
             src={resultImageUrl || baseImageUrl} 
             alt="Workspace" 
             className="max-h-[80vh] max-w-full object-contain pointer-events-none select-none bg-white dark:bg-black"
           />
           
           {/* Masking Layer */}
           {mode === 'mask' && (
             <canvas
               ref={canvasRef}
               className="absolute top-0 left-0 w-full h-full cursor-crosshair"
               onMouseDown={startDrawing}
               onMouseUp={stopDrawing}
               onMouseLeave={stopDrawing}
               onMouseMove={handleMouseMove}
             />
           )}
        </div>
      )}
      
      {/* Comparison Slider Mode */}
      {baseImageUrl && resultImageUrl && mode === 'compare' && (
        <div className="relative max-h-[80vh] w-fit select-none group shadow-2xl">
            <img src={baseImageUrl} alt="Before" className="block max-h-[80vh] object-contain bg-white dark:bg-black" draggable={false} />
            <div 
              className="absolute top-0 left-0 h-full overflow-hidden border-r-2 border-white shadow-[0_0_10px_rgba(0,0,0,0.5)]"
              style={{ width: `${comparePos}%` }}
            >
               <img src={resultImageUrl} alt="After" className="absolute top-0 left-0 max-h-[80vh] max-w-none h-full object-contain bg-white dark:bg-black" style={{ width: containerRef.current?.querySelector('img')?.clientWidth }} draggable={false} />
            </div>
            
            {/* Slider Handle */}
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={comparePos} 
              onChange={(e) => setComparePos(Number(e.target.value))}
              className="absolute top-1/2 left-0 w-full opacity-0 cursor-ew-resize h-full transform -translate-y-1/2 z-10"
            />
             <div 
                className="absolute top-1/2 -ml-4 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center shadow-lg pointer-events-none transform -translate-y-1/2"
                style={{ left: `${comparePos}%` }}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" transform="rotate(90 12 12)" /></svg>
            </div>
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm text-white px-2 py-1 text-xs rounded">新生成</div>
            <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white px-2 py-1 text-xs rounded">原图</div>
        </div>
      )}

      {mode === 'mask' && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-panel px-4 py-2 rounded-full flex gap-4 shadow-xl border border-gray-200 dark:border-gray-700">
              <button onClick={clearMask} className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium">清除蒙版</button>
              <div className="w-px bg-gray-300 dark:bg-gray-600"></div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">涂抹需要修改的区域</span>
          </div>
      )}
    </div>
  );
};

export default CanvasEditor;