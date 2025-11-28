import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { jsPDF } from 'jspdf';
import { Camera, FileText, Download, RefreshCw, Loader2 } from 'lucide-react';

const App = () => {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState(null);
  
  // This helps us parse the specific format from your screenshot
  const parseOCRText = (text) => {
    // Helper to extract text between a label and a newline
    const extract = (label) => {
      // Look for the label, allow for slight OCR errors (case insensitive)
      const regex = new RegExp(`${label}\\s*[:;]\\s*([^\\n]+)`, 'i');
      const match = text.match(regex);
      return match ? match[1].trim() : '';
    };

    return {
      patientName: extract('Patient Name'),
      address: extract('Address'),
      cityStateZip: extract('City, State, Zip'),
      phone: extract('Home Phone Number'),
      dob: extract('Date of Birth'),
      age: extract('AGE'),
      sex: extract('SEX'),
      referral: extract('Referral'),
      insurance: extract('Insurance Carrier'), // Might need adjusting based on exact OCR output
      rawText: text // Keep raw text just in case
    };
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      setParsedData(null);
      processImage(file);
    }
  };

  const processImage = (file) => {
    setLoading(true);
    setProgress(0);

    Tesseract.recognize(
      file,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(parseInt(m.progress * 100));
          }
        },
      }
    ).then(({ data: { text } }) => {
      const data = parseOCRText(text);
      setParsedData(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
      alert("Failed to scan image.");
    });
  };

  const generatePDF = () => {
    if (!parsedData) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text("Patient Demographic Record", 105, 20, null, null, "center");
    
    // Content
    doc.setFontSize(12);
    let y = 40;
    const lineHeight = 10;

    const fields = [
      { label: "Patient Name", value: parsedData.patientName },
      { label: "Address", value: parsedData.address },
      { label: "City, State, Zip", value: parsedData.cityStateZip },
      { label: "Home Phone", value: parsedData.phone },
      { label: "Date of Birth", value: parsedData.dob },
      { label: "Age", value: parsedData.age },
      { label: "Sex", value: parsedData.sex },
      { label: "Referral", value: parsedData.referral },
    ];

    fields.forEach((field) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${field.label}:`, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(field.value || "Not detected", 70, y);
      y += lineHeight;
    });

    // Footer timestamp
    doc.setFontSize(10);
    doc.text(`Scanned on: ${new Date().toLocaleDateString()}`, 20, 280);

    doc.save(`${parsedData.patientName || 'patient'}_record.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-600 p-4 text-white flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText size={20} /> DocScanner
          </h1>
        </div>

        <div className="p-6">
          {/* Upload Section */}
          <div className="mb-6">
            <label className="block w-full cursor-pointer bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:bg-blue-100 transition">
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" // This triggers camera on mobile
                className="hidden" 
                onChange={handleImageUpload} 
              />
              <Camera className="mx-auto text-blue-500 mb-2" size={32} />
              <span className="text-gray-600">Take Photo or Upload</span>
            </label>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-4">
              <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" />
              <p className="text-gray-600">Scanning document... {progress}%</p>
            </div>
          )}

          {/* Preview Section */}
          {image && !loading && (
            <div className="mb-6">
              <h3 className="font-bold text-gray-700 mb-2">Image Preview:</h3>
              <img src={image} alt="Preview" className="w-full rounded border" />
            </div>
          )}

          {/* Data Review Section */}
          {parsedData && !loading && (
            <div className="animate-fade-in">
              <h3 className="font-bold text-gray-700 mb-2 border-b pb-2">Extracted Data:</h3>
              
              <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded text-sm">
                <DataRow label="Name" value={parsedData.patientName} />
                <DataRow label="DOB" value={parsedData.dob} />
                <DataRow label="Address" value={parsedData.address} />
                <DataRow label="City/State" value={parsedData.cityStateZip} />
                <DataRow label="Phone" value={parsedData.phone} />
              </div>

              <button 
                onClick={generatePDF}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded flex items-center justify-center gap-2 transition"
              >
                <Download size={20} /> Download PDF
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                className="w-full mt-3 text-gray-500 text-sm flex items-center justify-center gap-1"
              >
                <RefreshCw size={14} /> Scan New Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for display
const DataRow = ({ label, value }) => (
  <div className="flex justify-between border-b border-gray-200 pb-1 last:border-0">
    <span className="font-semibold text-gray-600">{label}:</span>
    <span className="text-gray-900 text-right">{value || "---"}</span>
  </div>
);

export default App;