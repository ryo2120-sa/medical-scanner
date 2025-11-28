import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { FileText, Download, Eraser, Clipboard, Type, Minus, Plus, Image as ImageIcon, X } from 'lucide-react';

const App = () => {
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState({});
  const [fontSize, setFontSize] = useState(14);
  
  // New State for Images
  const [images, setImages] = useState([]);
  const [selectedImageId, setSelectedImageId] = useState(null);
  
  // Refs for drag/resize calculations
  const paperRef = useRef(null);
  const dragInfo = useRef({ isDragging: false, isResizing: false, startX: 0, startY: 0, initialW: 0, initialH: 0, initialX: 0, initialY: 0 });

  useEffect(() => {
    parseData(inputText);
  }, [inputText]);

  // --- PASTE LISTENER ---
  useEffect(() => {
    const handlePaste = (e) => {
      // Check if text input is focused, if so, let default paste happen for text
      if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') {
        // However, if clipboard contains image, we might still want to catch it?
        // For now, let's allow image pasting globally.
      }

      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault(); // Stop double pasting
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            addNewImage(event.target.result);
          };
          reader.readAsDataURL(blob);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const addNewImage = (src) => {
    const newImage = {
      id: Date.now(),
      src: src,
      x: 20, // Default position
      y: 100,
      width: 150, // Default size (px)
      height: 100, 
    };
    setImages(prev => [...prev, newImage]);
    setSelectedImageId(newImage.id);
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
    if (selectedImageId === id) setSelectedImageId(null);
  };

  // --- PARSER (Existing Logic) ---
  const parseData = (text) => {
    const findValue = (labels) => {
      const labelArray = Array.isArray(labels) ? labels : [labels];
      for (const label of labelArray) {
        try {
          const regex = new RegExp(`${label}[ \\t]*[:;]?[ \\t]*(.*)`, 'i');
          const match = text.match(regex);
          if (match && match[1]) {
            const val = match[1].trim();
            if (val.includes(':') && val.length < 20) return '';
            return val;
          }
        } catch (e) { continue; }
      }
      return '';
    };

    const data = {
      name: findValue('Patient Name'),
      address: findValue('Address'),
      cityStateZip: findValue('City, State, Zip'),
      homePhone: findValue(['Home Phone Number', 'Home Phone']),
      daytimePhone: findValue(['Daytime Phone Number', 'Daytime Phone', 'Work Phone', 'Cell Phone']),
      emergencyContact: findValue(['Emergency Contact', 'Emerg Contact']),
      emergencyPhone: findValue(['Emergency Phone', 'Emergency Phone Number', 'Emerg Phone']), 
      dob: findValue('Date of Birth'),
      age: findValue('AGE'),
      sex: findValue('SEX'),
    };
    setParsedData(data);
  };

  // --- MOUSE HANDLERS FOR DRAG/RESIZE ---
  const handleMouseDown = (e, id, type) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedImageId(id);
    
    const img = images.find(i => i.id === id);
    if (!img) return;

    dragInfo.current = {
      isDragging: type === 'move',
      isResizing: type === 'resize',
      startX: e.clientX,
      startY: e.clientY,
      initialX: img.x,
      initialY: img.y,
      initialW: img.width,
      initialH: img.height,
      targetId: id
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    const info = dragInfo.current;
    if (!info.isDragging && !info.isResizing) return;

    const dx = e.clientX - info.startX;
    const dy = e.clientY - info.startY;

    setImages(prev => prev.map(img => {
      if (img.id !== info.targetId) return img;

      if (info.isDragging) {
        return { ...img, x: info.initialX + dx, y: info.initialY + dy };
      }
      if (info.isResizing) {
        // Basic aspect ratio maintenance could be added here, free scaling for now
        return { ...img, width: Math.max(20, info.initialW + dx), height: Math.max(20, info.initialH + dy) };
      }
      return img;
    }));
  };

  const handleMouseUp = () => {
    dragInfo.current = { isDragging: false, isResizing: false };
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  // --- PDF GENERATION ---
  const generatePDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const marginLeft = 15;
    const marginTop = 15;
    const lineHeight = (fontSize * 0.3527) * 1.5; 

    doc.setFontSize(fontSize);
    let currentY = marginTop;

    const printLine = (label, value) => {
      if (!value) return; 
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, marginLeft, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(value, marginLeft + 50, currentY);
      currentY += lineHeight;
    };

    // 1. Print Text
    printLine("Patient Name", parsedData.name);
    printLine("Address", parsedData.address);
    printLine("City, State, Zip", parsedData.cityStateZip);
    printLine("Home Phone", parsedData.homePhone);
    printLine("Daytime Phone", parsedData.daytimePhone);
    printLine("Date of Birth", parsedData.dob);
    printLine("Age", parsedData.age);
    printLine("Sex", parsedData.sex);
    
    if (parsedData.emergencyContact || parsedData.emergencyPhone) {
        if(parsedData.emergencyContact) currentY += lineHeight * 0.2; 
        printLine("Emerg. Contact", parsedData.emergencyContact);
        printLine("Emerg. Phone", parsedData.emergencyPhone);
    }

    // 2. Print Images
    // We need to convert screen pixels to PDF mm.
    // The preview paper is 400px wide. Letter paper is 215.9mm wide.
    // Scale factor = 215.9 / 400
    const paperWidthPx = 400; 
    const paperWidthMm = 215.9;
    const scaleFactor = paperWidthMm / paperWidthPx;

    images.forEach(img => {
      doc.addImage(
        img.src, 
        'PNG', // Assuming PNG/JPG. jsPDF handles most.
        img.x * scaleFactor, 
        img.y * scaleFactor, 
        img.width * scaleFactor, 
        img.height * scaleFactor
      );
    });
    
    doc.save(`${parsedData.name || 'document'}_with_image.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-gray-800" onMouseDown={() => setSelectedImageId(null)}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col h-[50vh] lg:h-[60vh]">
            <div className="flex items-center gap-2 mb-4 border-b pb-4">
              <Clipboard className="text-blue-600" />
              <h2 className="text-xl font-bold">1. Paste Data</h2>
            </div>
            <textarea 
              className="flex-1 w-full p-4 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder={`Paste text here...\n(You can also press Ctrl+V to paste an image from Snipping Tool)`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()} // Prevent deselecting image when clicking textarea
            />
            <button onClick={() => setInputText('')} className="mt-4 text-gray-500 flex gap-2 items-center text-sm">
              <Eraser size={16} /> Clear Text
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-4 border-b pb-4">
              <Type className="text-purple-600" />
              <h2 className="text-xl font-bold">2. Adjust Text Size</h2>
            </div>
            <div className="flex items-center gap-4" onMouseDown={(e) => e.stopPropagation()}>
              <button onClick={() => setFontSize(f => Math.max(4, f - 1))} className="p-2 bg-gray-200 rounded hover:bg-gray-300"><Minus size={16}/></button>
              <div className="flex-1">
                <input type="range" min="4" max="24" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                <div className="text-center mt-2 font-mono text-sm text-gray-600">Size: {fontSize}pt</div>
              </div>
              <button onClick={() => setFontSize(f => Math.min(30, f + 1))} className="p-2 bg-gray-200 rounded hover:bg-gray-300"><Plus size={16}/></button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col h-full">
          <div className="bg-white rounded-xl shadow-md p-6 flex-1 mb-6 flex flex-col">
             <div className="flex items-center justify-between mb-4 border-b pb-4">
              <div className="flex items-center gap-2">
                <FileText className="text-green-600" />
                <h2 className="text-xl font-bold">3. Preview (Text + Images)</h2>
              </div>
              {images.length > 0 && <span className="text-xs text-blue-500 font-bold bg-blue-50 px-2 py-1 rounded">Image Added</span>}
            </div>

            <div className="flex-1 bg-gray-200 rounded border border-gray-300 p-4 overflow-auto flex justify-center items-start">
              {/* White Paper Background */}
              <div 
                ref={paperRef}
                className="bg-white shadow-2xl relative transition-all duration-200 ease-in-out overflow-hidden" 
                style={{ width: '400px', height: '517px' }}
                onMouseDown={(e) => e.stopPropagation()} // Clicking paper doesn't deselect immediately
              >
                
                {/* Text Content */}
                <div className="absolute top-0 left-0 right-0 h-[50%] pointer-events-none z-10">
                  <div className="p-8 space-y-1 font-sans text-gray-900 leading-tight" style={{ fontSize: `${fontSize}pt` }}>
                    <PreviewRow label="Patient Name" value={parsedData.name} />
                    <PreviewRow label="Address" value={parsedData.address} />
                    <PreviewRow label="City, State" value={parsedData.cityStateZip} />
                    <PreviewRow label="Home Phone" value={parsedData.homePhone} />
                    <PreviewRow label="Day Phone" value={parsedData.daytimePhone} />
                    <PreviewRow label="DOB" value={parsedData.dob} />
                    <PreviewRow label="Age" value={parsedData.age} />
                    <PreviewRow label="Sex" value={parsedData.sex} />
                    {(parsedData.emergencyContact || parsedData.emergencyPhone) && (
                        <>
                         <div className="h-2"></div>
                         <PreviewRow label="Emg. Contact" value={parsedData.emergencyContact} />
                         <PreviewRow label="Emg. Phone" value={parsedData.emergencyPhone} />
                        </>
                    )}
                  </div>
                </div>

                {/* Draggable Images Layer */}
                {images.map(img => (
                  <div
                    key={img.id}
                    style={{
                      position: 'absolute',
                      left: img.x,
                      top: img.y,
                      width: img.width,
                      height: img.height,
                      border: selectedImageId === img.id ? '2px solid #3b82f6' : '1px solid transparent',
                      cursor: 'move',
                      zIndex: 20
                    }}
                    onMouseDown={(e) => handleMouseDown(e, img.id, 'move')}
                  >
                    <img 
                      src={img.src} 
                      alt="Pasted" 
                      className="w-full h-full object-contain pointer-events-none" 
                    />
                    
                    {/* Controls (Only show when selected) */}
                    {selectedImageId === img.id && (
                      <>
                        {/* Delete Button */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
                        >
                          <X size={12} />
                        </button>

                        {/* Resize Handle */}
                        <div 
                          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-nwse-resize rounded-tl"
                          onMouseDown={(e) => handleMouseDown(e, img.id, 'resize')}
                        />
                      </>
                    )}
                  </div>
                ))}
                
                {images.length === 0 && (
                  <div className="absolute bottom-4 left-0 right-0 text-center text-gray-300 text-sm pointer-events-none">
                     (Ctrl+V to Paste Images Here)
                  </div>
                )}

              </div>
            </div>
          </div>

          <button onClick={generatePDF} disabled={!parsedData.name} className={`w-full py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-lg font-bold text-white transition-all ${parsedData.name ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}>
            <Download size={24} /> {parsedData.name ? 'Download PDF' : 'Paste Data to Enable'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PreviewRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="flex">
      <span className="font-bold w-[40%] opacity-70">{label}:</span>
      <span className="flex-1">{value}</span>
    </div>
  );
};

export default App;
