import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { FileText, Download, Eraser, Clipboard, Type, Minus, Plus } from 'lucide-react';

const App = () => {
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState({});
  const [fontSize, setFontSize] = useState(14);

  useEffect(() => {
    parseData(inputText);
  }, [inputText]);

  const parseData = (text) => {
    // 1. Basic Value Parser
    const findValue = (labels) => {
      const labelArray = Array.isArray(labels) ? labels : [labels];
      
      for (const label of labelArray) {
        try {
          // Strict regex: matches label on the same line only (no newlines)
          const regex = new RegExp(`${label}[ \\t]*[:;]?[ \\t]*(.*)`, 'i');
          const match = text.match(regex);
          
          if (match && match[1]) {
            const val = match[1].trim();
            // Safety check: ignore if it looks like we accidentally grabbed another label
            if (val.includes(':') && val.length < 20) return '';
            return val;
          }
        } catch (e) { continue; }
      }
      return '';
    };

    // Construct Data Object (No Insurance)
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
      // Referral removed previously, Insurance removed now.
    };
    
    setParsedData(data);
  };

  const generatePDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

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

    // --- Demographics ---
    printLine("Patient Name", parsedData.name);
    printLine("Address", parsedData.address);
    printLine("City, State, Zip", parsedData.cityStateZip);
    
    printLine("Home Phone", parsedData.homePhone);
    printLine("Daytime Phone", parsedData.daytimePhone);
    
    printLine("Date of Birth", parsedData.dob);
    printLine("Age", parsedData.age);
    printLine("Sex", parsedData.sex);
    
    // --- Emergency ---
    if (parsedData.emergencyContact || parsedData.emergencyPhone) {
        if(parsedData.emergencyContact) currentY += lineHeight * 0.2; 
        printLine("Emerg. Contact", parsedData.emergencyContact);
        printLine("Emerg. Phone", parsedData.emergencyPhone);
    }
    
    doc.save(`${parsedData.name || 'document'}_top_half.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-gray-800">
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
              placeholder={`Paste raw text here...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
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
            <div className="flex items-center gap-4">
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
                <h2 className="text-xl font-bold">3. Top-Half Preview</h2>
              </div>
            </div>

            <div className="flex-1 bg-gray-200 rounded border border-gray-300 p-4 overflow-auto flex justify-center items-start">
              <div className="bg-white shadow-2xl relative transition-all duration-200 ease-in-out" style={{ width: '400px', height: '517px' }}>
                <div className="absolute top-0 left-0 right-0 h-[50%] border-b-2 border-dashed border-red-300 bg-blue-50/20">
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
                  <div className="absolute bottom-2 right-2 text-xs text-red-400 font-bold opacity-0 group-hover:opacity-100">Bottom of Half-Page</div>
                </div>
                <div className="absolute bottom-4 w-full text-center text-gray-300 text-sm">(Bottom Half - Empty)</div>
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
