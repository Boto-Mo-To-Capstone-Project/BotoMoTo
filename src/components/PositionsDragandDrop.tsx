"use client";
import React, { useState, useCallback } from "react";
import { FiDownload, FiEye, FiAlertCircle, FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import { MdDocumentScanner, MdRemove } from "react-icons/md";
import { SubmitButton } from "./SubmitButton";

// Parsed position & issue types
interface ParsedPosition {
  position: string;
  voteLimit: number;
  numberOfWinners: number;
  order: number;
  votingScopeId?: number;
  scopeNameRaw?: string; // original scope text in csv (for troubleshooting)
  rowNumber: number;
}
interface ParseIssue {
  rowNumber: number; // 0 => header/global
  field: string;
  message: string;
  severity: 'error' | 'warning';
  positionName?: string; // Position name for better context
}

interface DragandDropdownProps {
  open: boolean;
  onClose: () => void;
  label: string;
  description?: string;
  accept?: string; // typically .csv
  fileTypeText?: string;
  id?: string;
  maxSizeMB?: number;
  onUpload: (positions: ParsedPosition[]) => Promise<void> | void;
  votingScopes?: Array<{ id: number; name: string }>;
  loading?: boolean;
  // NEW: template preview handler (parity with voters import)
  onShowTemplatePreview?: () => void;
}

export const PositionsDragandDropdown: React.FC<DragandDropdownProps> = ({
  open,
  onClose,
  label,
  description,
  accept = ".csv",
  fileTypeText = "CSV files only (max 5MB)",
  id = "positions-file-upload",
  maxSizeMB = 5,
  onUpload,
  votingScopes = [],
  loading = false,
  onShowTemplatePreview,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedPositions, setParsedPositions] = useState<ParsedPosition[]>([]);
  const [parseIssues, setParseIssues] = useState<ParseIssue[]>([]);

  const resetState = () => {
    setSelectedFile(null);
    setParsedPositions([]);
    setParseIssues([]);
  };

  const validateHeader = (headerCols: string[], issues: ParseIssue[]) => {
    const required = ['position'];
    required.forEach(r => {
      if (!headerCols.includes(r)) {
        issues.push({ rowNumber: 0, field: 'header', message: `Required column "${r}" is missing`, severity: 'error' });
      }
    });
  };

  const mapHeaderIndices = (headerCols: string[]) => {
    const idx = {
      position: headerCols.findIndex(c => ['position','name','title'].includes(c)),
      voteLimit: headerCols.findIndex(c => ['votelimit','vote_limit','limit'].includes(c)),
      numberOfWinners: headerCols.findIndex(c => ['numberofwinners','winners','numofwinners','num_winners'].includes(c)),
      order: headerCols.findIndex(c => ['order','sort','sortorder','displayorder'].includes(c)),
      votingScope: headerCols.findIndex(c => ['votingscope','scope','voting_scope'].includes(c)),
    };
    return idx;
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      const rawLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      const issues: ParseIssue[] = [];
      const results: ParsedPosition[] = [];

      if (rawLines.length < 2) {
        issues.push({ rowNumber: 0, field: 'file', message: 'CSV must have header + at least one data row', severity: 'error' });
        setParsedPositions([]);
        setParseIssues(issues);
        return;
      }

      const headerCols = rawLines[0].split(',').map(h => h.trim().toLowerCase());
      validateHeader(headerCols, issues);
      const indices = mapHeaderIndices(headerCols);

      for (let i = 1; i < rawLines.length; i++) {
        const rowNumber = i + 1; // human-readable
        const cols = rawLines[i].split(',').map(c => c.trim());
        const colVal = (idx: number) => idx >= 0 && idx < cols.length ? cols[idx] : '';

        const positionName = colVal(indices.position);
        if (!positionName) {
          issues.push({ rowNumber, field: 'position', message: 'Position name is required', severity: 'error' });
        }

        const voteLimitRaw = colVal(indices.voteLimit);
        const numberOfWinnersRaw = colVal(indices.numberOfWinners);
        const orderRaw = colVal(indices.order);
        const scopeRaw = colVal(indices.votingScope);

        let voteLimit = 1;
        if (voteLimitRaw) {
          const n = parseInt(voteLimitRaw, 10);
          if (isNaN(n) || n < 1) {
            issues.push({ rowNumber, field: 'voteLimit', message: `Invalid voteLimit "${voteLimitRaw}" -> defaulting to 1`, severity: 'warning', positionName });
          } else {
            voteLimit = n;
          }
        }

        let numberOfWinners = 1;
        if (numberOfWinnersRaw) {
          const n = parseInt(numberOfWinnersRaw, 10);
          if (isNaN(n) || n < 1) {
            issues.push({ rowNumber, field: 'numberOfWinners', message: `Invalid numberOfWinners "${numberOfWinnersRaw}" -> defaulting to 1`, severity: 'warning', positionName });
          } else {
            numberOfWinners = n;
          }
        }

        let order = 0;
        if (orderRaw) {
          const n = parseInt(orderRaw, 10);
          if (isNaN(n) || n < 0) {
            issues.push({ rowNumber, field: 'order', message: `Invalid order "${orderRaw}" -> defaulting to 0`, severity: 'warning', positionName });
          } else {
            order = n;
          }
        }

        let votingScopeId: number | undefined = undefined;
        if (scopeRaw) {
          const hasVotingScopes = votingScopes.length > 0;
          
          if (!hasVotingScopes) {
            // Election has no scopes - will merge to "No Scope"
            issues.push({ 
              rowNumber, 
              field: 'votingScope', 
              message: `Scope "${scopeRaw}" will be merged to "No Scope" - election has no voting scopes`, 
              severity: 'warning',
              positionName
            });
          } else {
            const scopeMatch = votingScopes.find(s => s.name.toLowerCase() === scopeRaw.toLowerCase());
            if (!scopeMatch) {
              issues.push({ 
                rowNumber, 
                field: 'votingScope', 
                message: `Scope "${scopeRaw}" not found in election, will be merged to "No Scope"`, 
                severity: 'warning',
                positionName
              });
            } else {
              votingScopeId = scopeMatch.id;
            }
          }
        }

        if (positionName) {
          results.push({
            position: positionName,
            voteLimit,
            numberOfWinners,
            order,
            votingScopeId,
            scopeNameRaw: scopeRaw || undefined,
            rowNumber
          });
        }
      }

      // Merge duplicate positions that ended up in "No Scope" (same name + no votingScopeId)
      const mergedResults: ParsedPosition[] = [];
      const noScopePositions = new Map<string, ParsedPosition>();
      
      results.forEach(pos => {
        if (!pos.votingScopeId) {
          // No scope - check for duplicates to merge
          const key = pos.position.toLowerCase();
          const existing = noScopePositions.get(key);
          
          if (existing) {
            // Merge: keep the first one, but note that others were merged
            if (!existing.scopeNameRaw && pos.scopeNameRaw) {
              existing.scopeNameRaw = pos.scopeNameRaw; // Preserve original scope info
            }
          } else {
            noScopePositions.set(key, pos);
          }
        } else {
          // Has scope - add directly
          mergedResults.push(pos);
        }
      });
      
      // Add merged no-scope positions
      mergedResults.push(...Array.from(noScopePositions.values()));
      
      setParsedPositions(mergedResults);
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
    if (parsedPositions.length === 0) return;
    if (errorCount > 0) {
      alert('Please resolve all errors before importing.');
      return;
    }
    try {
      await onUpload(parsedPositions);
      resetState();
      onClose();
    } catch (e) {
      console.error('Positions import failed:', e);
    }
  };

  // Scope distribution (parity with voters component)
  const scopeCounts = parsedPositions.reduce((acc, pos) => {
    let scopeName = 'No Scope';
    if (pos.votingScopeId) {
      const scope = votingScopes.find(s => s.id === pos.votingScopeId);
      scopeName = scope ? scope.name : `Unknown Scope (ID: ${pos.votingScopeId})`;
    }
    acc[scopeName] = (acc[scopeName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Track merged positions (those with scopeNameRaw but no votingScopeId)
  const mergedPositions = parsedPositions.filter(pos => pos.scopeNameRaw && !pos.votingScopeId);
  
  // Calculate how many positions were actually merged (original count vs current count)
  const originalScopedCount = parseIssues.filter(issue => 
    issue.field === 'votingScope' && issue.severity === 'warning'
  ).length;
  const actualMergedCount = originalScopedCount - mergedPositions.length;

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
                <p><b>Instructions:</b> Download the template, fill it out with your positions, and use the Import button below to upload your CSV file.</p>
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
                  <div className="font-semibold text-[var(--color-primary)] leading-tight">Position List Template (CSV)</div>
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
                    href="/assets/sample/positions.csv"
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
                    {selectedFile.size > 1024 * 1024 ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : `${(selectedFile.size / 1024).toFixed(1)} KB`}
                  </span>
                </div>
                <button onClick={handleRemove} className="ml-2 p-1 rounded-md hover:bg-gray-200 transition" aria-label={`Remove ${selectedFile.name}`}>
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
                      {actualMergedCount > 0 && (
                        <span className="block text-xs mt-1">
                          Duplicate position names will be merged into single entries.
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {parseIssues.map((issue, index) => (
                    <div key={index} className={`text-xs p-2 rounded ${issue.severity === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}> 
                      <span className="font-medium">
                        Row {issue.rowNumber}
                        {issue.positionName && (
                          <span className="text-gray-600 font-normal"> ({issue.positionName})</span>
                        )}:
                      </span> {issue.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ready summary + distribution */}
            {parsedPositions.length > 0 && errorCount === 0 && (
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <FiCheckCircle className="text-green-500" size={18} />
                  <div className="text-sm text-green-800">
                    <span className="font-medium">{parsedPositions.length} position{parsedPositions.length > 1 ? 's' : ''}</span> ready to import
                  </div>
                </div>
                {Object.keys(scopeCounts).length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Voting Scope Distribution:</div>
                    <div className="space-y-1">
                      {Object.entries(scopeCounts).map(([scope, count]) => (
                        <div key={scope} className="flex justify-between text-xs text-gray-600">
                          <span>
                            {scope}
                          </span>
                          <span>{count} position{count > 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-2">
              <SubmitButton type="button" variant="action" onClick={() => { onClose(); resetState(); }} label="Cancel" />
              <SubmitButton
                type="button"
                variant="small"
                onClick={parsedPositions.length === 0 || errorCount > 0 ? undefined : handleImport}
                label={loading ? 'Importing…' : 'Import'}
                isLoading={loading}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg ${(parsedPositions.length === 0 || errorCount > 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};