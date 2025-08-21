"use client";

import { useState, useEffect } from "react";
import { X, Download, ZoomIn, ZoomOut, RotateCw, Play, Pause, Volume2, VolumeX, ExternalLink } from "lucide-react";

type SupportedFileType = "pdf" | "image" | "video" | "audio" | "text" | "unknown";

interface FileViewerProps {
  fileUrl: string;
  fileName?: string;
  onClose: () => void;
  title?: string;
  fileType?: SupportedFileType;
}

const FileViewer = ({ fileUrl, fileName, onClose, title, fileType: explicitFileType }: FileViewerProps) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [fileType, setFileType] = useState<SupportedFileType>(explicitFileType || "unknown");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Detect file type based on extension if not explicitly provided
  useEffect(() => {
    if (explicitFileType) {
      setFileType(explicitFileType);
      return;
    }
    
    const url = fileUrl.toLowerCase();
    
    if (url.endsWith('.pdf')) {
      setFileType("pdf");
    } else if (
      url.endsWith('.jpg') || 
      url.endsWith('.jpeg') || 
      url.endsWith('.png') || 
      url.endsWith('.gif') || 
      url.endsWith('.webp') || 
      url.endsWith('.bmp') || 
      url.endsWith('.svg')
    ) {
      setFileType("image");
    } else if (
      url.endsWith('.mp4') || 
      url.endsWith('.webm') || 
      url.endsWith('.ogg') || 
      url.endsWith('.mov')
    ) {
      setFileType("video");
    } else if (
      url.endsWith('.mp3') || 
      url.endsWith('.wav') || 
      url.endsWith('.ogg') || 
      url.endsWith('.m4a')
    ) {
      setFileType("audio");
    } else if (
      url.endsWith('.txt') || 
      url.endsWith('.csv') || 
      url.endsWith('.json') || 
      url.endsWith('.xml')
    ) {
      setFileType("text");
    } else {
      setFileType("unknown");
    }
  }, [fileUrl, explicitFileType]);

  const getDisplayFileName = () => {
    if (fileName) return fileName;
    return fileUrl.split('/').pop() || "File";
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = getDisplayFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };
  
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
    const mediaElement = document.getElementById('media-element') as HTMLMediaElement;
    if (mediaElement) {
      if (isPlaying) {
        mediaElement.pause();
      } else {
        mediaElement.play();
      }
    }
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    const mediaElement = document.getElementById('media-element') as HTMLMediaElement;
    if (mediaElement) {
      mediaElement.muted = !isMuted;
    }
  };

  // Render content based on file type
  const renderContent = () => {
    switch (fileType) {
      case "pdf":
        return (
          <div className="w-full h-[calc(90vh-120px)] flex flex-col">
            <iframe
              src={`${fileUrl}#view=Fit&zoom=${zoom}`}
              className="w-full h-full border border-gray-300 shadow-lg"
              style={{ minHeight: '600px' }}
              title={title || "PDF Viewer"}
            />
            {/* Fallback notice */}
            <div className="text-center py-2 text-sm text-gray-500">
              Can't see the PDF? Try{" "}
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                opening in a new tab
              </a>
              {" "}or{" "}
              <button
                onClick={handleDownload}
                className="text-green-500 hover:underline"
              >
                downloading the file
              </button>
            </div>
          </div>
        );
        
      case "image":
        return (
          <div className="flex items-center justify-center h-[calc(90vh-120px)]">
            <img
              src={fileUrl}
              alt={title || "Image"}
              style={{ 
                maxHeight: '100%',
                maxWidth: '100%',
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease',
              }}
              className="shadow-lg"
            />
          </div>
        );
        
      case "video":
        return (
          <div className="flex items-center justify-center h-[calc(90vh-120px)]">
            <video
              id="media-element"
              src={fileUrl}
              controls
              className="max-h-full max-w-full shadow-lg"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        );
        
      case "audio":
        return (
          <div className="flex items-center justify-center h-[calc(90vh-120px)]">
            <audio
              id="media-element"
              src={fileUrl}
              controls
              className="w-full max-w-md"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        );
        
      case "text":
        return (
          <div className="flex items-center justify-center h-[calc(90vh-120px)] bg-white p-4 overflow-auto">
            <iframe
              src={fileUrl}
              className="w-full h-full border border-gray-300"
              title={title || "Text Viewer"}
            />
          </div>
        );
        
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[calc(90vh-120px)]">
            <p className="text-lg mb-4">This file type cannot be previewed</p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Download File
            </button>
          </div>
        );
    }
  };

  // Render controls based on file type
  const renderControls = () => {
    const controls = [];
    
    if (fileType === "image" || fileType === "pdf") {
      controls.push(
        <button
          key="zoom-out"
          onClick={handleZoomOut}
          className="p-2 text-gray-600 hover:bg-gray-200 rounded"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>,
        <span key="zoom-value" className="text-sm text-gray-600 min-w-[60px] text-center">
          {zoom}%
        </span>,
        <button
          key="zoom-in"
          onClick={handleZoomIn}
          className="p-2 text-gray-600 hover:bg-gray-200 rounded"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
      );
    }
    
    if (fileType === "image") {
      controls.push(
        <button
          key="rotate"
          onClick={handleRotate}
          className="p-2 text-gray-600 hover:bg-gray-200 rounded"
          title="Rotate"
        >
          <RotateCw size={18} />
        </button>
      );
    }
    
    // Download button for all file types
    controls.push(
      <button
        key="download"
        onClick={handleDownload}
        className="p-2 text-gray-600 hover:bg-gray-200 rounded"
        title="Download"
      >
        <Download size={18} />
      </button>
    );
    
    // Open in new tab button for PDFs and other files that might have viewing issues
    if (fileType === "pdf" || fileType === "text") {
      controls.push(
        <a
          key="open-tab"
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-600 hover:bg-gray-200 rounded"
          title="Open in New Tab"
        >
          <ExternalLink size={18} />
        </a>
      );
    }
    
    return controls;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="bg-white w-full h-full max-w-6xl max-h-[90vh] flex flex-col rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gray-100 px-4 py-3 flex items-center justify-between border-b">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {title || getDisplayFileName()}
            </h3>
            <span className="text-sm text-gray-500">
              {fileType.toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Dynamic Controls */}
            {renderControls()}
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-gray-200 overflow-auto">
          <div className="flex justify-center p-4">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileViewer;
