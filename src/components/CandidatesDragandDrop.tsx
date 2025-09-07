"use client";
import React, { useState, useCallback } from "react";
import { FiDownload, FiAlertCircle, FiCheckCircle, FiEye, FiAlertTriangle } from "react-icons/fi";
import { MdDocumentScanner, MdRemove } from "react-icons/md";
import { SubmitButton } from "./SubmitButton";

// Parsed candidate & issue types
interface ParsedCandidate {
  email: string;
  position: string;
  partylist?: string;
  positionId?: number;
  partyId?: number;
  rowNumber: number;
}
interface ParseIssue {
  rowNumber: number; // 0 => header/global
  field: string;
  message: string;
  severity: 'error' | 'warning';
  candidateEmail?: string; // Candidate email for better context
}

interface CandidatesDragandDropdownProps {
  open: boolean;
  onClose: () => void;
  label: string;
  description?: string;
  accept?: string; // typically .csv
  fileTypeText?: string;
  id?: string;
  maxSizeMB?: number;
  onUpload: (candidates: ParsedCandidate[]) => Promise<void> | void;
  positions?: Array<{ id: number; name: string }>;
  parties?: Array<{ id: number; name: string }>;
  voters?: Array<{ id: number; firstName: string; lastName: string; email?: string }>;
  loading?: boolean;
  // Template preview handler (parity with voters import)
  onShowTemplatePreview?: () => void;
}

export const CandidatesDragandDropdown: React.FC<CandidatesDragandDropdownProps> = ({
  open,
  onClose,
  label,
  description,
  accept = ".csv",
  fileTypeText = "CSV files only (max 5MB)",
  id = "candidates-file-upload",
  maxSizeMB = 5,
  onUpload,
  positions = [],
  parties = [],
  voters = [],
  loading = false,
  onShowTemplatePreview,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedCandidates, setParsedCandidates] = useState<ParsedCandidate[]>([]);
  const [parseIssues, setParseIssues] = useState<ParseIssue[]>([]);

  const resetState = () => {
    setSelectedFile(null);
    setParsedCandidates([]);
    setParseIssues([]);
  };

  const validateHeader = (headerCols: string[], issues: ParseIssue[]) => {
    const required = ['email', 'position'];
    required.forEach(r => {
      if (!headerCols.includes(r)) {
        issues.push({
          rowNumber: 0,
          field: 'header',
          message: `Required column "${r}" is missing`,
          severity: 'error'
        });
      }
    });
  };

  const mapHeaderIndices = (headerCols: string[]) => {
    const idx = {
      email: headerCols.findIndex(c => ['email','emailaddress','mail'].includes(c)),
      position: headerCols.findIndex(c => ['position','title','role'].includes(c)),
      partylist: headerCols.findIndex(c => ['partylist','party','partisan'].includes(c)),
    };
    return idx;
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      const rawLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      const issues: ParseIssue[] = [];
      const results: ParsedCandidate[] = [];

      if (rawLines.length < 2) {
        issues.push({
          rowNumber: 0,
          field: 'file',
          message: 'CSV file must have at least a header row and one data row',
          severity: 'error'
        });
        setParseIssues(issues);
        return;
      }

      const headerCols = rawLines[0].split(',').map(h => h.trim().toLowerCase());
      validateHeader(headerCols, issues);
      const indices = mapHeaderIndices(headerCols);

      for (let i = 1; i < rawLines.length; i++) {
        const rowNumber = i + 1;
        const values = rawLines[i].split(',').map(v => v.trim());
        const candidate: ParsedCandidate = {
          email: '',
          position: '',
          partylist: '',
          rowNumber
        };

        // Parse the row data
        if (indices.email >= 0) candidate.email = values[indices.email] || '';
        if (indices.position >= 0) candidate.position = values[indices.position] || '';
        if (indices.partylist >= 0) candidate.partylist = values[indices.partylist] || '';

        // Create candidate email for context
        const candidateEmail = candidate.email || `Row ${rowNumber}`;

        // Required field validations
        if (!candidate.email) {
          issues.push({
            rowNumber,
            field: 'email',
            message: 'Candidate email is required',
            severity: 'error',
            candidateEmail
          });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)) {
          issues.push({
            rowNumber,
            field: 'email',
            message: 'Invalid email format',
            severity: 'error',
            candidateEmail
          });
        } else {
          // Check if voter exists in the election (only if email format is valid)
          const voterExists = voters.some(v => 
            v.email && v.email.toLowerCase() === candidate.email.toLowerCase()
          );
          if (!voterExists) {
            issues.push({
              rowNumber,
              field: 'email',
              message: `Voter with email "${candidate.email}" not found in this election. Please add this voter first before making them a candidate.`,
              severity: 'warning',
              candidateEmail
            });
          }
        }

        if (!candidate.position) {
          issues.push({
            rowNumber,
            field: 'position',
            message: 'Position is required',
            severity: 'error',
            candidateEmail
          });
        }

        // Position validation (check if position exists in election)
        if (candidate.position) {
          const position = positions.find(p => 
            p.name.toLowerCase() === candidate.position.toLowerCase()
          );
          if (position) {
            candidate.positionId = position.id;
          } else {
            issues.push({
              rowNumber,
              field: 'position',
              message: `Position "${candidate.position}" not found in this election`,
              severity: 'error',
              candidateEmail
            });
          }
        }

        // Party validation (optional field) - use future tense
        if (candidate.partylist && candidate.partylist.trim()) {
          const party = parties.find(p => 
            p.name.toLowerCase() === candidate.partylist!.toLowerCase()
          );
          if (party) {
            candidate.partyId = party.id;
          } else {
            issues.push({
              rowNumber,
              field: 'partylist',
              message: `Party "${candidate.partylist}" not found in this election. Candidate will be set as Independent.`,
              severity: 'warning',
              candidateEmail
            });
          }
        }

        // Add candidate if basic validation passes
        if (candidate.email && candidate.position && candidate.positionId) {
          results.push(candidate);
        }
      }

      // Filter out candidates that have voter email warnings (not found in election)
      const validResults = results.filter(candidate => {
        const hasVoterWarning = issues.some(issue => 
          issue.rowNumber === candidate.rowNumber && 
          issue.field === 'email' && 
          issue.severity === 'warning' &&
          issue.message.includes('not found in this election')
        );
        return !hasVoterWarning;
      });

      setParsedCandidates(validResults);
      setParseIssues(issues);
    };
    reader.readAsText(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const validateFileAndParse = (file: File) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert(`File too large: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB). Max: ${maxSizeMB}MB`);
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert(`Invalid file type: ${file.name}. Only CSV files are accepted.`);
      return;
    }
    setSelectedFile(file);
    parseCSV(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateFileAndParse(files[0]);
    }
  }, [maxSizeMB]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateFileAndParse(e.target.files[0]);
    }
  };

  const handleClick = () => {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) input.click();
  };

  const handleRemove = () => { resetState(); };

  const errorCount = parseIssues.filter(i => i.severity === 'error').length;
  const warningCount = parseIssues.filter(i => i.severity === 'warning').length;

  const handleImport = async () => {
    if (parsedCandidates.length === 0) return;
    if (errorCount > 0) {
      alert('Please fix all errors before importing');
      return;
    }
    try {
      await onUpload(parsedCandidates);
      onClose();
      resetState();
    } catch (e) {
      console.error('Import failed:', e);
    }
  };

  // Position and party distribution (parity with voters component)
  const positionCounts = parsedCandidates.reduce((acc, candidate) => {
    const positionName = candidate.position || 'Unknown Position';
    acc[positionName] = (acc[positionName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const partyCounts = parsedCandidates.reduce((acc, candidate) => {
    let partyName = 'Independent';
    if (candidate.partyId) {
      const party = parties.find(p => p.id === candidate.partyId);
      partyName = party ? party.name : `Unknown Party (ID: ${candidate.partyId})`;
    } else if (candidate.partylist && !candidate.partyId) {
      partyName = 'Independent'; // Unmapped parties become Independent
    }
    acc[partyName] = (acc[partyName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68" onClick={(e) => { if (e.target === e.currentTarget) { onClose(); } }}>
      <div className="relative max-w-md w-full p-6 flex flex-col justify-center">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
            <button type="button" className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center" onClick={() => { onClose(); }}>
              <svg className="w-3 h-3" aria-hidden="true" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>
          {/* Body */}
          <div className="p-4 text-sm">
            <div className="mb-4 text-gray-700">
              {description ? <p>{description}</p> : (
                <p><b>Instructions:</b> Download the template, fill it out with your candidates, and use the Import button below to upload your CSV file.</p>
              )}
            </div>

            {/* Drag + Drop */}
            <div
              className={`w-full border-2 border-dashed rounded-md flex flex-col items-center justify-center py-8 px-3 text-sm text-[var(--color-gray)] transition cursor-pointer ${isDragOver ? 'border-[var(--color-primary)] bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}
              onClick={handleClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              tabIndex={0}
              role="button"
              aria-label={label}
            >
              <div className="flex flex-col items-center justify-center w-full">
                <MdDocumentScanner size={40} className="mb-2 text-gray-400" />
                <div>Click to upload or drag and drop</div>
                <div className="text-xs text-gray-400 mt-1">{fileTypeText}</div>
              </div>
              <input id={id} type="file" accept={accept} onChange={handleInputChange} className="hidden" />
            </div>

            {/* Template (when no file) with preview & download */}
            {!selectedFile ? (
              <div className="border-2 border-[var(--color-primary)] rounded-lg p-3 flex items-center gap-3 mt-6 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[var(--color-primary)] leading-tight">Candidate List Template (CSV)</div>
                  <div className="text-xs text-gray-500">CSV template with required columns</div>
                </div>
                <div className="flex gap-1">
                  {onShowTemplatePreview && (
                    <button
                      onClick={onShowTemplatePreview}
                      className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] p-2 rounded transition"
                      title="Preview template"
                      type="button"
                    >
                      <FiEye size={20} />
                    </button>
                  )}
                  <a
                    href="/assets/sample/candidates.csv"
                    download
                    className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] p-2 rounded transition"
                    title="Download template"
                  >
                    <FiDownload size={20} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-between p-2 bg-gray-100 rounded-md shadow-sm">
                <div className="flex-1 truncate">
                  <span className="font-medium text-[var(--color-black)]">{selectedFile.name}</span>
                  <span className="text-xs text-[var(--color-gray)] ml-1">
                    {selectedFile.size > 1024 * 1024
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                      : `${(selectedFile.size / 1024).toFixed(1)} KB`}
                  </span>
                </div>
                <button
                  onClick={handleRemove}
                  className="ml-2 p-1 rounded-md hover:bg-gray-200 transition"
                  aria-label={`Remove ${selectedFile.name}`}
                >
                  <MdRemove />
                </button>
              </div>
            )}
            {/* Parse issue summary blocks */}
            {parseIssues.length > 0 && (
              <div className="space-y-2 mt-4">
                {errorCount > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <FiAlertCircle className="text-red-500" size={18} />
                    <div className="text-sm text-red-800">
                      <span className="font-medium">{errorCount} error{errorCount > 1 ? 's' : ''}</span> found. Please fix before importing.
                    </div>
                  </div>
                )}
                {warningCount > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <FiAlertTriangle className="text-yellow-500" size={18} />
                    <div className="text-sm text-yellow-800">
                      <span className="font-medium">{warningCount} warning{warningCount > 1 ? 's' : ''}</span> found.
                    </div>
                  </div>
                )}
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {parseIssues.map((issue, index) => (
                    <div key={index} className={`text-xs p-2 rounded ${issue.severity === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}> 
                      <span className="font-medium">
                        Row {issue.rowNumber}
                        {issue.candidateEmail && (
                          <span className="text-gray-600 font-normal"> ({issue.candidateEmail})</span>
                        )}:
                      </span> {issue.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ready to import summary */}
            {parsedCandidates.length > 0 && errorCount === 0 && (
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <FiCheckCircle className="text-green-500" size={18} />
                  <div className="text-sm text-green-800">
                    <span className="font-medium">{parsedCandidates.length} candidate{parsedCandidates.length > 1 ? 's' : ''}</span> ready to import
                  </div>
                </div>

                {/* Position distribution */}
                {Object.keys(positionCounts).length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Position Distribution:</div>
                    <div className="space-y-1">
                      {Object.entries(positionCounts).map(([position, count]) => (
                        <div key={position} className="flex justify-between text-xs text-gray-600">
                          <span>{position}</span>
                          <span>{count} candidate{count > 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Party distribution */}
                {Object.keys(partyCounts).length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Party Distribution:</div>
                    <div className="space-y-1">
                      {Object.entries(partyCounts).map(([party, count]) => (
                        <div key={party} className="flex justify-between text-xs text-gray-600">
                          <span>{party}</span>
                          <span>{count} candidate{count > 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="col-span-1 sm:col-span-2 flex justify-end gap-2 mt-2">
              <SubmitButton
                type="button"
                variant="action"
                onClick={onClose}
                label="Cancel"
              />
              <SubmitButton
                type="button"
                variant="small"
                onClick={parsedCandidates.length === 0 || errorCount > 0 ? undefined : handleImport}
                label="Import"
                isLoading={loading}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg ${
                  parsedCandidates.length === 0 || errorCount > 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};