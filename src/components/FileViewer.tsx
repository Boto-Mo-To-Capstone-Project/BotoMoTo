"use client";

import { useState, useEffect } from "react";
import { X, Download, ZoomIn, ZoomOut, RotateCw, Play, Pause, Volume2, VolumeX, ExternalLink, Smartphone, Monitor, Menu } from "lucide-react";

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
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [textContent, setTextContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
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

  // Fetch text content for CSV and other text files
  useEffect(() => {
    if (fileType === "text" && (fileUrl.endsWith('.csv') || fileUrl.endsWith('.txt'))) {
      setLoading(true);
      setError('');
      
      fetch(fileUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load file: ${response.status}`);
          }
          return response.text();
        })
        .then(text => {
          setTextContent(text);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [fileUrl, fileType]);

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
        // Handle CSV and TXT files with direct content display
        if (fileUrl.endsWith('.csv') || fileUrl.endsWith('.txt')) {
          if (loading) {
            return (
              <div className="flex items-center justify-center h-[calc(90vh-120px)]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading file...</p>
                </div>
              </div>
            );
          }
          
          if (error) {
            return (
              <div className="flex items-center justify-center h-[calc(90vh-120px)]">
                <div className="text-center">
                  <p className="text-red-600 mb-4">Error loading file: {error}</p>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Download File Instead
                  </button>
                </div>
              </div>
            );
          }
          
          // CSV table rendering
          if (fileUrl.endsWith('.csv')) {
            const lines = textContent.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
              return (
                <div className="flex items-center justify-center h-[calc(90vh-120px)]">
                  <p className="text-gray-600">Empty CSV file</p>
                </div>
              );
            }
            
            const headers = lines[0].split(',').map(h => h.trim());
            const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));
            
            return (
              <div className="w-full h-[calc(90vh-120px)] bg-white overflow-auto">
                <div className="p-4" style={{ 
                  transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                  transformOrigin: 'top left'
                }}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          {headers.map((header, index) => (
                            <th 
                              key={index}
                              className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-r border-gray-200"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, rowIndex) => (
                          <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            {row.map((cell, cellIndex) => (
                              <td 
                                key={cellIndex}
                                className="px-3 py-2 text-sm text-gray-900 border-b border-r border-gray-200"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          }
          
          // Plain text rendering for non-CSV files
          return (
            <div className="w-full h-[calc(90vh-120px)] bg-white overflow-auto">
              <div className="p-4">
                <pre 
                  className="text-sm font-mono whitespace-pre-wrap break-words"
                  style={{ 
                    transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                    transformOrigin: 'top left'
                  }}
                >
                  {textContent}
                </pre>
              </div>
            </div>
          );
        }
        
        // Fallback to iframe for other text files
        return (
          <div className="flex items-center justify-center h-[calc(90vh-120px)] bg-white overflow-auto">
            <iframe
              src={fileUrl}
              className="w-full h-full border border-gray-300 shadow-lg"
              title={title || "Text Viewer"}
              style={{
                minWidth: viewMode === 'desktop' ? '800px' : '375px',
                transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                transformOrigin: 'top left'
              }}
              sandbox="allow-same-origin allow-scripts"
              loading="lazy"
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

  // Render controls based on file 
  // added type="button" para hindi nag coclose ang modals dahil ang default daw is type="submit" which resets the page (nareremove lahat ng modals) 
  const renderControls = () => {
    const controls = [];
    
    if (fileType === "image" || fileType === "pdf" || fileType === "text") {
      controls.push(
        <button
          key="zoom-out"
          onClick={handleZoomOut}
          className="p-2 text-gray-600 hover:bg-gray-200 rounded"
          title="Zoom Out"
          type="button"
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
          type="button"
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
          type="button"
        >
          <RotateCw size={18} />
        </button>
      );
    }
    
    
    
    // Mobile/Desktop toggle for HTML templates (text fileType)
    if (fileType === "text" && (fileName?.includes('.html') || fileUrl.includes('email'))) {
      controls.push(
        <button
          key="mobile-view"
          onClick={() => setViewMode('mobile')}
          className={`p-2 rounded ${viewMode === 'mobile' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Mobile View"
          type="button"
        >
          <Smartphone size={18} />
        </button>,
        <button
          key="desktop-view"
          onClick={() => setViewMode('desktop')}
          className={`p-2 rounded ${viewMode === 'desktop' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Desktop View"
          type="button"
        >
          <Monitor size={18} />
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
        type="button"
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
  // hamburger open close state 
  const [menuOpen, setMenuOpen] = useState(false); 

  return (
    <div className="fixed inset-0 z-[99999] bg-black bg-opacity-75 flex items-center justify-center">
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
          
          {/* Controls + Close */}
          <div className="flex items-center space-x-2">
            
            {/* On large screens, show inline controls */}
            <div className="hidden sm:flex items-center space-x-2">
              {renderControls()}
              <button
                onClick={onClose}
                className="p-2 text-gray-600 hover:bg-gray-200 rounded"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* On small screens, show hamburger */}
            <div className="sm:hidden relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-gray-600 hover:bg-gray-200 rounded"
                title="Menu"
                type="button"
              >
                <Menu size={18} />
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-50"
                  onClick={(e) => e.stopPropagation()} // ⛔ prevent closing modal
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    {renderControls()}
                    <button
                    onClick={onClose}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded"
                    title="Close"
                  >
                      <X size={18} />
                    </button>
                  </div>
                  
                </div>
              )}
            </div>     
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
