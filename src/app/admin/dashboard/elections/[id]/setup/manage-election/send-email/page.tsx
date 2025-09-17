"use client";
import { useState, useEffect, useRef } from "react";
import { MdAdd } from "react-icons/md";
import { FiCheck, FiMail, FiRotateCcw, FiEye, FiUpload, FiSettings } from "react-icons/fi";
import { SubmitButton } from "@/components/SubmitButton";
import SearchBar from "@/components/SearchBar";
import SendEmailTable from "@/components/sendEmailTable";
import { TrialSendingModal } from "@/components/TrialSendingModal";
import { TemplateToolbar } from "@/components/TemplateToolbar";
import { TemplateUploadModal } from "@/components/TemplateUploadModal";
import { TemplateManagementModal } from "@/components/TemplateManagementModal";
import FileViewer from "@/components/FileViewer";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { formatElectionSchedule } from "@/lib/email/templates/data";

// Debounce hook
function useDebouncedValue<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function SendEmailPage() {
  const params = useParams<{ id: string }>();
  const electionId = Number(params?.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [sortCol, setSortCol] = useState<
    | "name"
    | "status"
    | "scope"
    | "email"
    | "contactNumber"
    | "birthdate"
    | "codeSendStatus"
    | "code"
    | null
  >(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showTrialSendingModal, setShowTrialSendingModal] = useState(false);
  const [showSendDropdown, setShowSendDropdown] = useState(false);
  const [showTemplateManagement, setShowTemplateManagement] = useState(false);
  
  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<string>("voting-code");
  const [availableTemplates, setAvailableTemplates] = useState<Array<{
    id: string;
    name: string;
    type: 'system' | 'custom';
    description?: string;
  }>>([]);
  const [showTemplateUpload, setShowTemplateUpload] = useState(false);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [fileViewerUrl, setFileViewerUrl] = useState<string>("");
  
  // Email sending state
  const [sendingStatus, setSendingStatus] = useState<{
    pending: number;
    sending: number;
    sent: number;
    failed: number;
    total: number;
  }>({ pending: 0, sending: 0, sent: 0, failed: 0, total: 0 });
  const [isSending, setIsSending] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);

  // Data state from API
  const [rawRows, setRawRows] = useState<Array<{
    id: number;
    name: string;
    status: string;
    scope: string;
    email: string;
    contactNumber: string;
    birthdate: string;
    voted: boolean;
    codeSendStatus: string;
    code: string; // Add voting code field
  }>>([]);

  // Frontend sorting function
  const getSortedRows = () => {
    if (!sortCol) return rawRows;
    
    const sorted = [...rawRows].sort((a, b) => {
      let aVal: any = a[sortCol];
      let bVal: any = b[sortCol];
      
      // Handle different data types
      if (typeof aVal === "string" && typeof bVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortDir === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
    
    return sorted;
  };

  // Get the final sorted rows for display
  const rows = getSortedRows();
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };
  const handleSort = (
    col:
      | "name"
      | "status"
      | "scope"
      | "email"
      | "contactNumber"
      | "birthdate"
      | "codeSendStatus"
      | "code"
  ) => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };
  const handleCheckboxChange = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Template handlers
  const fetchAvailableTemplates = async () => {
    try {
      const response = await fetch("/api/email/templates");
      const data = await response.json();
      if (data.success && data.templates) {
        setAvailableTemplates(data.templates);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      toast.error("Failed to load templates");
    }
  };

  const handleTemplatePreview = async () => {
    try {
      // Use the API endpoint URL directly - no need to fetch and create blob
      const previewUrl = `/api/email/templates/preview?template=${selectedTemplate}`;
      
      // Test if the endpoint responds correctly
      const response = await fetch(previewUrl);
      if (!response.ok) {
        throw new Error(`Preview failed: ${response.statusText}`);
      }
      
      // Set the API URL directly for FileViewer
      setFileViewerUrl(previewUrl);
      setShowFileViewer(true);
    } catch (error) {
      console.error("Template preview failed:", error);
      toast.error("Failed to preview template");
    }
  };

  const handleTemplateUpload = () => {
    setShowTemplateUpload(true);
  };

  const handleTemplateUploadSave = async (data: { 
    templateName: string; 
    templateFile: File | null; 
    description?: string;
  }) => {
    try {
      if (!data.templateFile) {
        toast.error("Please select a template file");
        return;
      }

      const formData = new FormData();
      formData.append("templateName", data.templateName);
      formData.append("templateFile", data.templateFile);
      if (data.description) {
        formData.append("description", data.description);
      }

      const response = await fetch("/api/email/templates", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to upload template");
        throw new Error(result.message || "Failed to upload template");
      }

      toast.success("Template uploaded successfully");
      setShowTemplateUpload(false);
      
      // Refresh available templates
      await fetchAvailableTemplates();
      
      // Return success to indicate completion
      return { success: true };
    } catch (error: any) {
      console.error("Template upload failed:", error);
      // Don't show another toast here since we already showed one above
      throw error; // Re-throw to let modal handle the error state
    }
  };

  const handleTemplateManagement = () => {
    setShowTemplateManagement(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/email/templates?templateId=${templateId}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to delete template");
      }

      toast.success("Template deleted successfully");
      
      // Refresh available templates
      await fetchAvailableTemplates();
      
      // Reset selected template if it was deleted
      if (selectedTemplate === templateId) {
        setSelectedTemplate("voting-code");
      }
    } catch (error: any) {
      console.error("Template deletion failed:", error);
      toast.error(error.message || "Failed to delete template");
    }
  };

  const handleManagementPreview = (templateId: string) => {
    // Close management modal and preview the template
    setShowTemplateManagement(false);
    setSelectedTemplate(templateId);
    setTimeout(() => handleTemplatePreview(), 100);
  };

  const handleSendEmail = async (type: "all" | "selected") => {
    setShowSendDropdown(false);
    
    if (isSending) {
      toast.error("Already sending emails, please wait...");
      return;
    }

    try {
      setIsSending(true);
      
      // Determine which voters to send to
      let voterIds: number[];
      if (type === "all") {
        voterIds = rows.map(row => row.id);
      } else if (type === "selected") {
        if (selectedIds.length === 0) {
          toast.error("Please select voters first");
          setIsSending(false);
          return;
        }
        voterIds = selectedIds;
      } else {
        toast.error("Invalid send type");
        setIsSending(false);
        return;
      }

      if (voterIds.length === 0) {
        toast.error("No voters selected for sending");
        return;
      }

      // Call bulk API to send codes
      const response = await fetch("/api/voters/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: "send_codes",
          voterIds: voterIds,
          electionId: electionId,
          templateId: selectedTemplate, // Include selected template
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to send emails");
      }

      toast.success(`Started sending codes to ${result.data.affectedCount} voters`);
      
      // Trigger data refresh
      setReloadKey(prev => prev + 1);
      
    } catch (error: any) {
      console.error("Error sending emails:", error);
      toast.error(error.message || "Failed to send emails");
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryFailed = async () => {
    setShowSendDropdown(false);
    
    if (isSending) {
      toast.error("Already sending emails, please wait...");
      return;
    }

    try {
      setIsSending(true);
      
      // Get all failed voters
      const failedVoters = rows.filter(row => row.codeSendStatus === "FAILED");
      const failedIds = failedVoters.map(voter => voter.id);

      if (failedIds.length === 0) {
        toast.error("No failed voters to retry");
        return;
      }

      // Call bulk API to retry failed codes
      const response = await fetch("/api/voters/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operation: "retry_failed",
          voterIds: failedIds,
          electionId: electionId,
          templateId: selectedTemplate, // Include selected template
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to retry failed emails");
      }

      toast.success(`Started retrying codes for ${result.data.affectedCount} failed voters`);
      
      // Trigger data refresh
      setReloadKey(prev => prev + 1);
      
    } catch (error: any) {
      console.error("Error retrying failed emails:", error);
      toast.error(error.message || "Failed to retry failed emails");
    } finally {
      setIsSending(false);
    }
  };

  // Initialize state from URL once
  const initializedFromURL = useRef(false);
  useEffect(() => {
    if (initializedFromURL.current) return;
    initializedFromURL.current = true;

    const sp = new URLSearchParams(searchParams?.toString() || "");
    const p = Number(sp.get("page") || 1);
    const l = Number(sp.get("limit") || 10);
    const s = sp.get("search") || "";

    if (!Number.isNaN(p) && p > 0) setPage(p);
    if (!Number.isNaN(l) && l > 0) setPageSize(l);
    setSearch(s);
  }, [searchParams]);

  // Keep URL in sync with state
  useEffect(() => {
    const current = searchParams?.toString() || "";
    const sp = new URLSearchParams(current);
    sp.set("page", String(page));
    sp.set("limit", String(pageSize));
    if (debouncedSearch) sp.set("search", debouncedSearch); else sp.delete("search");

    const target = sp.toString();
    if (target !== current) {
      router.replace(`?${target}`, { scroll: false });
    }
  }, [page, pageSize, debouncedSearch, router, searchParams]);

  // Fetch voters from API
  useEffect(() => {
    if (!electionId || Number.isNaN(electionId)) return;

    const ctrl = new AbortController();
    let alive = true;                // guard: only latest run updates state
    const run = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          electionId: String(electionId),
          page: String(page),
          limit: String(pageSize),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        });
        const res = await fetch(`/api/voters?${qs.toString()}`, {
          method: "GET",
          signal: ctrl.signal,
        });
        const json = await res.json();

        if (!res.ok || json?.success === false) {
          toast.error(json?.message || "Failed to fetch voters");
          return;
        }

        // Map API voter -> table row
        const mapped = (json.data?.voters || []).map((v: any) => ({
          id: v.id,
          name: `${v.lastName ?? ""}, ${v.firstName ?? ""}${v.middleName ? " " + v.middleName : ""}`
            .trim()
            .replace(/^,\s*/, ""),
          status: v.isActive ? "Active" : "Inactive",
          scope: v.votingScope?.name ?? "—",
          email: v.email ?? "",
          contactNumber: v.contactNum ?? "",
          birthdate: "",
          voted: !!v.voted,
          codeSendStatus: v.codeSendStatus || "PENDING",
          code: v.code || "—", // Add voting code display
        }));

        if (alive) {
          setRawRows(mapped);
          setTotalPages(json.data?.pagination?.totalPages || 1);
          setHasLoaded(true);
        }
      } catch (e: any) {
        if (e?.name !== "AbortError" && alive) {
          console.error("Failed to fetch voters:", e);
          toast.error("Failed to load voters");
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [electionId, page, pageSize, debouncedSearch, reloadKey]); // Removed sortCol, sortDir

  // SSE connection for real-time status updates
  useEffect(() => {
    if (!electionId || Number.isNaN(electionId)) return;

    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource(
          `/api/voters/bulk/status/stream?electionId=${electionId}`
        );

        eventSource.onopen = () => {
          setSseConnected(true);
          console.log("SSE connected for election status");
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
              case "connected":
                console.log("SSE connection confirmed");
                break;
                
              case "status_update":
                setSendingStatus(data.data.statusCounts);
                break;
                
              case "heartbeat":
                // Keep connection alive
                break;
                
              case "error":
                console.error("SSE error:", data.message);
                break;
                
              default:
                console.log("Unknown SSE message type:", data.type);
            }
          } catch (error) {
            console.error("Error parsing SSE message:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("SSE connection error:", error);
          setSseConnected(false);
          
          // Attempt to reconnect after 5 seconds
          setTimeout(() => {
            if (eventSource?.readyState === EventSource.CLOSED) {
              connectSSE();
            }
          }, 5000);
        };

      } catch (error) {
        console.error("Failed to create SSE connection:", error);
        setSseConnected(false);
      }
    };

    // Start connection
    connectSSE();

    // Cleanup on unmount
    return () => {
      if (eventSource) {
        eventSource.close();
        setSseConnected(false);
      }
    };
  }, [electionId]);

  // Fetch available templates on mount
  useEffect(() => {
    fetchAvailableTemplates();
  }, []);

  return (
    <>
      {/*<Toaster position="top-center" />*/}
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50"
      >
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Search and actions */}
          <div className="main-toolbar sticky top-16 z-30 bg-white flex flex-col md:flex-row md:items-center md:gap-4 gap-2 mb-6 py-3 px-2">
            <div className="flex-shrink-0"></div>
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search for Voter"
              />
            </div>
            
            {/* Template toolbar */}
            <div className="flex-shrink-0">
              <TemplateToolbar
                selectedTemplate={selectedTemplate}
                availableTemplates={availableTemplates}
                onTemplateChange={setSelectedTemplate}
                onPreview={handleTemplatePreview}
                onUpload={handleTemplateUpload}
                onManage={handleTemplateManagement}
              />
            </div>
            
            {/* Status indicator */}
            {(sendingStatus.total > 0 || isSending) && (
              <div className="flex-shrink-0 bg-gray-50 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium">Email Status</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-yellow-600">Pending: {sendingStatus.pending}</span>
                  <span className="text-blue-600">Sending: {sendingStatus.sending}</span>
                  <span className="text-green-600">Sent: {sendingStatus.sent}</span>
                  <span className="text-red-600">Failed: {sendingStatus.failed}</span>
                </div>
                {sendingStatus.total > 0 && (
                  <div className="mt-1">
                    <div className="w-32 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${((sendingStatus.sent + sendingStatus.failed) / sendingStatus.total) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex-shrink-0 flex gap-2 items-center">
              <SubmitButton
                label="Trial Sending"
                variant="action"
                icon={<MdAdd size={20} />}
                title="Trial Sending"
                onClick={() => setShowTrialSendingModal(true)}
              />
              <div className="relative inline-block text-left">
                <SubmitButton
                  label={isSending ? "Sending..." : "Send Email"}
                  variant="action"
                  type="button"
                  className={`p-2 flex items-center justify-center ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !isSending && setShowSendDropdown((prev) => !prev)}
                />
                {showSendDropdown && !isSending && (
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 z-50">
                    <div className="py-1">
                      <button
                        className={`flex items-center gap-2 w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                          selectedIds.length === 0 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-gray-700'
                        }`}
                        onClick={() => handleSendEmail("selected")}
                        disabled={selectedIds.length === 0}
                      >
                        <FiCheck size={16} />
                        Selected ({selectedIds.length})
                      </button>
                      <button
                        className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => handleSendEmail("all")}
                      >
                        <FiMail size={16} />
                        All ({rows.length})
                      </button>
                      {sendingStatus.failed > 0 && (
                        <>
                          <hr className="my-1" />
                          <button
                            className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                            onClick={() => handleRetryFailed()}
                          >
                            <FiRotateCcw size={16} />
                            Retry Failed ({sendingStatus.failed})
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-5">
            <SendEmailTable
              voters={rows}
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={handleSort}
              page={page}
              totalPages={totalPages}
              onFirst={handleFirst}
              onPrev={handlePrev}
              onNext={handleNext}
              onLast={handleLast}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              selectedIds={selectedIds}
              onCheckboxChange={handleCheckboxChange}
              loading={loading}
              hasLoaded={hasLoaded}
            />
          </div>
        </div>
      </div>

      {/* TrialSendingModal */}
      <TrialSendingModal
        open={showTrialSendingModal}
        onClose={() => setShowTrialSendingModal(false)}
        onSave={async function (data: {
          voterName: string;
          email: string;
          contactNumber: string;
          voterLimit: number;
          numberOfWinners: number;
          votingScopeId?: number | null;
        }) {
          try {
            // Generate a test voting code
            const testVotingCode = Math.floor(Math.random() * 900000 + 100000).toString();

            // Call the trial sending API with electionId
            // The backend will fetch election details and enrich template data
            const response = await fetch("/api/email/trial-send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                templateId: selectedTemplate,
                recipientEmail: data.email,
                recipientName: data.voterName,
                electionId: electionId, // Pass electionId for backend to fetch details
                templateData: {
                  voterName: data.voterName,
                  votingCode: testVotingCode,
                  contactEmail: 'support@boto-mo-to.online'
                }
              }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
              throw new Error(result.message || "Failed to send trial email");
            }

            toast.success(`Trial email sent successfully to ${data.email}`);
            setShowTrialSendingModal(false);
            
            return { success: true };
          } catch (error: any) {
            console.error("Trial sending failed:", error);
            toast.error(error.message || "Failed to send trial email");
            throw error;
          }
        }}
      />

      {/* FileViewer for template preview */}
      {showFileViewer && (
        <FileViewer
          fileUrl={fileViewerUrl}
          fileName={`${selectedTemplate}-preview.html`}
          title={`Template Preview: ${selectedTemplate.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
          fileType="text"
          onClose={() => {
            setShowFileViewer(false);
            // Only revoke blob URLs, not API URLs
            if (fileViewerUrl && fileViewerUrl.startsWith('blob:')) {
              URL.revokeObjectURL(fileViewerUrl);
            }
            setFileViewerUrl("");
          }}
        />
      )}

      {/* Template Upload Modal */}
      <TemplateUploadModal
        open={showTemplateUpload}
        onClose={() => setShowTemplateUpload(false)}
        onSave={handleTemplateUploadSave}
        isLoading={false}
      />

      {/* Template Management Modal */}
      <TemplateManagementModal
        open={showTemplateManagement}
        onClose={() => setShowTemplateManagement(false)}
        onDeleteTemplate={handleDeleteTemplate}
        onPreviewTemplate={handleManagementPreview}
        isLoading={false}
      />
    </>
  );
}

