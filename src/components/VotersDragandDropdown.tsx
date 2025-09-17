"use client";
import React, { useState, useCallback } from "react";
import { FiDownload, FiAlertCircle, FiCheckCircle, FiEye, FiAlertTriangle } from "react-icons/fi";
import { MdDocumentScanner, MdRemove } from "react-icons/md";
import { SubmitButton } from "./SubmitButton";
import toast from "react-hot-toast";

interface ParsedVoter {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  votingScopeId?: number;
  isActive: boolean;
  rowNumber: number;
}

interface ParseIssue {
  rowNumber: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
  voterName?: string; // Voter name for better context
}

interface VotersDragandDropdownProps {
  open: boolean;
  onClose: () => void;
  label: string;
  description?: string;
  accept?: string; // typically .csv
  fileTypeText?: string;
  id?: string;
  maxSizeMB?: number;
  onUpload: (voters: ParsedVoter[]) => Promise<void>;
  onShowTemplatePreview?: () => void;
  votingScopes?: Array<{ id: number; name: string }>;
  existingVoters?: Array<{ id: number; firstName: string; lastName: string; email?: string }>;
  loading?: boolean;
}

export const VotersDragandDropdown: React.FC<VotersDragandDropdownProps> = ({
  open,
  onClose,
  label,
  description,
  accept = ".csv",
  fileTypeText = "CSV files only (max 5MB)",
  id = "voters-file-upload",
  maxSizeMB = 5,
  onUpload,
  onShowTemplatePreview,
  votingScopes = [],
  existingVoters = [],
  loading = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedVoters, setParsedVoters] = useState<ParsedVoter[]>([]);
  const [parseIssues, setParseIssues] = useState<ParseIssue[]>([]);

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

  const parseCSV = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Validate file has minimum required content
      if (lines.length < 2) {
        setParseIssues([{
          rowNumber: 0,
          field: 'file',
          message: 'CSV file must have at least a header row and one data row',
          severity: 'error'
        }]);
        return;
      }

      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredFields = ['firstname', 'lastname', 'email'];
      const issues: ParseIssue[] = [];
      const voters: ParsedVoter[] = [];

      // Validate required columns exist
      validateRequiredColumns(header, requiredFields, issues);

      // Process each data row
      for (let i = 1; i < lines.length; i++) {
        const rowNumber = i + 1;
        const values = lines[i].split(',').map(v => v.trim());
        const rowData = createRowDataObject(header, values);

        // Validate and collect issues for this row
        validateRowData(rowData, rowNumber, votingScopes, existingVoters, issues);

        // Add valid voter to collection
        if (isValidVoter(rowData)) {
          voters.push(createVoterObject(rowData, rowNumber, votingScopes));
        }
      }

      // Filter out voters that have blocking email warnings (duplicate emails)
      const validResults = voters.filter(voter => {
        const hasBlockingEmailWarning = issues.some(issue => 
          issue.rowNumber === voter.rowNumber && 
          issue.field === 'email' && 
          issue.severity === 'warning' &&
          issue.message.includes('already exists in this election')
        );
        return !hasBlockingEmailWarning;
      });

      setParsedVoters(validResults);
      setParseIssues(issues);
    };
    
    reader.readAsText(file);
  }, [votingScopes, existingVoters]);

  // Helper functions for CSV parsing
  const validateRequiredColumns = (header: string[], requiredFields: string[], issues: ParseIssue[]) => {
    for (const field of requiredFields) {
      if (!header.includes(field)) {
        issues.push({
          rowNumber: 0,
          field: 'header',
          message: `Required column "${field}" is missing`,
          severity: 'error'
        });
      }
    }
  };

  const createRowDataObject = (header: string[], values: string[]) => {
    const rowData: any = {};
    header.forEach((col, index) => {
      rowData[col] = values[index] || '';
    });
    return rowData;
  };

  const validateRowData = (rowData: any, rowNumber: number, votingScopes: any[], existingVoters: any[], issues: ParseIssue[]) => {
    // Create voter name for context (firstName + lastName)
    const voterName = `${rowData.firstname || '?'} ${rowData.lastname || '?'}`.trim();
    
    // Required field validations
    if (!rowData.firstname) {
      issues.push({
        rowNumber,
        field: 'firstname',
        message: 'First name is required',
        severity: 'error',
        voterName: voterName || undefined
      });
    }

    if (!rowData.lastname) {
      issues.push({
        rowNumber,
        field: 'lastname',
        message: 'Last name is required',
        severity: 'error',
        voterName: voterName || undefined
      });
    }

    // Email validation
    if (!rowData.email) {
      issues.push({
        rowNumber,
        field: 'email',
        message: 'Email is required',
        severity: 'error',
        voterName: voterName || undefined
      });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rowData.email)) {
      issues.push({
        rowNumber,
        field: 'email',
        message: 'Invalid email format',
        severity: 'error',
        voterName: voterName || undefined
      });
    } else {
      // Check if voter email already exists in the election (only if email format is valid)
      const emailExists = existingVoters.some(v => 
        v.email && v.email.toLowerCase() === rowData.email.toLowerCase()
      );
      if (emailExists) {
        issues.push({
          rowNumber,
          field: 'email',
          message: `Voter with email "${rowData.email}" already exists in this election. Please use a different email address.`,
          severity: 'warning',
          voterName
        });
      }
    }

    // Voting scope validation (optional field) - use future tense
    if (rowData.votingscope && !votingScopes.find(scope => 
      scope.name.toLowerCase() === rowData.votingscope.toLowerCase())) {
      issues.push({
        rowNumber,
        field: 'votingscope',
        message: `Voting scope "${rowData.votingscope}" will be set to "No Scope" - scope not found in election`,
        severity: 'warning',
        voterName
      });
    }
  };

  const isValidVoter = (rowData: any) => {
    return rowData.firstname && rowData.lastname && rowData.email;
  };

  const createVoterObject = (rowData: any, rowNumber: number, votingScopes: any[]): ParsedVoter => {
    // Find voting scope ID by name
    let votingScopeId: number | undefined = undefined;
    if (rowData.votingscope) {
      const scope = votingScopes.find(s => 
        s.name.toLowerCase() === rowData.votingscope.toLowerCase()
      );
      votingScopeId = scope?.id;
    }

    return {
      firstName: rowData.firstname,
      middleName: rowData.middlename || undefined,
      lastName: rowData.lastname,
      email: rowData.email,
      votingScopeId,
      isActive: true,
      rowNumber
    };
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];

      // File size validation
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        toast.error(`File too large: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB). Max: ${maxSizeMB}MB`);
        return;
      }

      // Check if file is CSV
      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast.error(`Invalid file type: ${file.name}. Only CSV files are accepted.`);
        return;
      }

      setSelectedFile(file);
      parseCSV(file);
    }
  }, [parseCSV, maxSizeMB]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      parseCSV(file);
    }
  };

  const handleClick = () => {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) input.click();
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setParsedVoters([]);
    setParseIssues([]);
    // Clear the file input value to allow re-uploading the same file (Chrome fix)
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) input.value = '';
  };

  const handleImport = async () => {
    if (parsedVoters.length === 0) return;
    
    const hasErrors = parseIssues.some(issue => issue.severity === 'error');
    if (hasErrors) {
      toast.error('Please fix all errors before importing');
      return;
    }

    try {
      await onUpload(parsedVoters);
      onClose();
      setSelectedFile(null);
      setParsedVoters([]);
      setParseIssues([]);
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const scopeCounts = parsedVoters.reduce((acc, voter) => {
    let scopeName = 'No Scope';
    
    if (voter.votingScopeId) {
      const scope = votingScopes.find(s => s.id === voter.votingScopeId);
      scopeName = scope ? scope.name : `Unknown Scope (ID: ${voter.votingScopeId})`;
    }
    
    acc[scopeName] = (acc[scopeName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const errorCount = parseIssues.filter(issue => issue.severity === 'error').length;
  const warningCount = parseIssues.filter(issue => issue.severity === 'warning').length;

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
                <p><b>Instructions:</b> Download the template, fill it out with your voters, and use the Import button below to upload your CSV file.</p>
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
                  <div className="font-semibold text-[var(--color-primary)] leading-tight">Voter List Template (CSV)</div>
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
                    href="/assets/sample/voters.csv"
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
                        {issue.voterName && (
                          <span className="text-gray-600 font-normal"> ({issue.voterName})</span>
                        )}:
                      </span> {issue.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ready to import summary */}
            {parsedVoters.length > 0 && errorCount === 0 && (
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <FiCheckCircle className="text-green-500" size={18} />
                  <div className="text-sm text-green-800">
                    <span className="font-medium">{parsedVoters.length} voter{parsedVoters.length > 1 ? 's' : ''}</span> ready to import
                  </div>
                </div>

                {/* Voting scope breakdown */}
                {Object.keys(scopeCounts).length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Voting Scope Distribution:</div>
                    <div className="space-y-1">
                      {Object.entries(scopeCounts).map(([scope, count]) => (
                        <div key={scope} className="flex justify-between text-xs text-gray-600">
                          <span>{scope}</span>
                          <span>{count} voter{count > 1 ? 's' : ''}</span>
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
                onClick={parsedVoters.length === 0 || errorCount > 0 ? undefined : handleImport}
                label="Import"
                isLoading={loading}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg ${
                  parsedVoters.length === 0 || errorCount > 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};