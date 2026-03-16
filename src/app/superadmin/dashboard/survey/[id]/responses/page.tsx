"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { MdVisibility } from "react-icons/md";
import Table from "@/components/TableComponent";

interface SurveyResponse {
  id: number;
  voterId: number;
  voterCode: string;
  voterName?: string;
  submittedAt: string;
  answers: Record<string, any>;
}

interface Survey {
  id: number;
  title: string;
  description: string;
  formSchema: any;
  isActive: boolean;
}

const collectNumericValues = (value: unknown, bucket: number[]) => {
  if (value === null || value === undefined) return;

  if (typeof value === "number" && Number.isFinite(value)) {
    bucket.push(value);
    return;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      bucket.push(Number(trimmed));
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectNumericValues(item, bucket));
  }
};

const calculateAverageAnswer = (answers: Record<string, any>): number | null => {
  const numericValues: number[] = [];
  Object.values(answers || {}).forEach((value) => collectNumericValues(value, numericValues));

  if (numericValues.length === 0) return null;
  const total = numericValues.reduce((sum, current) => sum + current, 0);
  return total / numericValues.length;
};

export default function SurveyResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;
  
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Filter state (audits-style filter toolbar)
  const [answersCountFilter, setAnswersCountFilter] = useState("all");
  const [averageFilter, setAverageFilter] = useState("all");
  const [submittedDateFilter, setSubmittedDateFilter] = useState("all");
  
  // Response detail modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null);

  useEffect(() => {
    if (surveyId) {
      loadSurveyAndResponses();
    }
  }, [surveyId]);

  const loadSurveyAndResponses = async () => {
    try {
      setLoading(true);
      
      // Load survey details
      const surveyRes = await fetch(`/api/superadmin/surveys/${surveyId}`);
      if (!surveyRes.ok) {
        if (surveyRes.status === 404) {
          toast.error("Survey not found");
          router.push("/superadmin/dashboard/survey");
          return;
        }
        throw new Error("Failed to fetch survey");
      }
      
      const surveyData = await surveyRes.json();
      setSurvey(surveyData.data.survey);
      
      // Load survey responses
      const responsesRes = await fetch(`/api/superadmin/surveys/${surveyId}/responses`);
      if (!responsesRes.ok) {
        throw new Error("Failed to fetch responses");
      }
      
      const responsesData = await responsesRes.json();
      const responsesList = responsesData.data.responses || [];
      setResponses(responsesList);
      
      // Map responses to table format
      const mapped = responsesList.map((response: SurveyResponse) => {
        const averageAnswer = calculateAverageAnswer(response.answers);

        return {
          id: response.id,
          Voter_Code: response.voterCode,
          Voter_Name: response.voterName || "N/A",
          Submitted_At: new Date(response.submittedAt).toLocaleString(),
          Answers_Count: Object.keys(response.answers).length,
          Average_Answer: averageAnswer === null ? "N/A" : averageAnswer.toFixed(2),
          Answers_Count_Value: Object.keys(response.answers).length,
          Average_Answer_Value: averageAnswer,
          Submitted_At_Value: response.submittedAt,
          View: (
            <div className="flex justify-start gap-2">
              <button
                className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewResponse(response);
                }}
                title="View response details"
              >
                <MdVisibility size={18} />
              </button>
            </div>
          ),
        };
      });
      
      setRows(mapped);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to load survey responses");
    } finally {
      setLoading(false);
    }
  };

  const handleViewResponse = (response: SurveyResponse) => {
    setSelectedResponse(response);
    setViewModalOpen(true);
  };

  const handleExportCSV = () => {
    if (responses.length === 0) {
      toast.error("No responses to export");
      return;
    }
    
    try {
      // Create CSV content
      const headers = ["Voter Code", "Voter Name", "Submitted At", "Average Answer"];
      
      // Add question headers
      if (survey?.formSchema?.questions) {
        survey.formSchema.questions.forEach((q: any) => {
          headers.push(q.label || q.type);
        });
      }
      
      const csvContent = [
        headers.join(","),
        ...responses.map(response => {
          const averageAnswer = calculateAverageAnswer(response.answers);
          const row = [
            `"${response.voterCode}"`,
            `"${response.voterName || 'N/A'}"`,
            `"${new Date(response.submittedAt).toLocaleString()}"`,
            `"${averageAnswer === null ? "N/A" : averageAnswer.toFixed(2)}"`
          ];
          
          // Add answers
          if (survey?.formSchema?.questions) {
            survey.formSchema.questions.forEach((q: any) => {
              const answer = response.answers[q.id] || "";
              row.push(`"${String(answer).replace(/"/g, '""')}"`);
            });
          }
          
          return row.join(",");
        })
      ].join("\n");
      
      // Download CSV
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `survey_${surveyId}_responses.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Responses exported successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export responses");
    }
  };

  const handleSelectionChange = (newSelectedIds: string[]) => {
    setSelectedIds(newSelectedIds);
  };

  const filteredRows = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    return rows.filter((row) => {
      const answersCount = Number(row.Answers_Count_Value ?? row.Answers_Count ?? 0);
      const averageValue =
        typeof row.Average_Answer_Value === "number" ? row.Average_Answer_Value : null;
      const submittedAt = row.Submitted_At_Value ? new Date(row.Submitted_At_Value) : null;

      // Answers Count filter
      if (answersCountFilter === "0-2" && !(answersCount >= 0 && answersCount <= 2)) return false;
      if (answersCountFilter === "3-5" && !(answersCount >= 3 && answersCount <= 5)) return false;
      if (answersCountFilter === "6+" && !(answersCount >= 6)) return false;

      // Average filter
      if (averageFilter === "with_average" && averageValue === null) return false;
      if (averageFilter === "no_average" && averageValue !== null) return false;
      if (averageFilter === "high" && !(averageValue !== null && averageValue >= 4)) return false;
      if (averageFilter === "mid" && !(averageValue !== null && averageValue >= 3 && averageValue < 4)) return false;
      if (averageFilter === "low" && !(averageValue !== null && averageValue < 3)) return false;

      // Submitted date filter
      if (submittedDateFilter === "today" && !(submittedAt && submittedAt >= startOfToday)) return false;
      if (submittedDateFilter === "last_7_days" && !(submittedAt && submittedAt >= sevenDaysAgo)) return false;
      if (submittedDateFilter === "last_30_days" && !(submittedAt && submittedAt >= thirtyDaysAgo)) return false;

      return true;
    });
  }, [rows, answersCountFilter, averageFilter, submittedDateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const filters = useMemo(
    () => [
      {
        key: "answersCount",
        label: "Answers Count",
        value: answersCountFilter,
        onChange: (value: string) => {
          setAnswersCountFilter(value);
          setPage(1);
        },
        options: [
          { value: "all", label: "All Counts" },
          { value: "0-2", label: "0 to 2" },
          { value: "3-5", label: "3 to 5" },
          { value: "6+", label: "6+" },
        ],
      },
      {
        key: "average",
        label: "Average Answer",
        value: averageFilter,
        onChange: (value: string) => {
          setAverageFilter(value);
          setPage(1);
        },
        options: [
          { value: "all", label: "All Averages" },
          { value: "with_average", label: "With Average" },
          { value: "high", label: "High (>= 4.00)" },
          { value: "mid", label: "Mid (3.00 - 3.99)" },
          { value: "low", label: "Low (< 3.00)" },
          { value: "no_average", label: "No Average (N/A)" },
        ],
      },
      {
        key: "submittedDate",
        label: "Submitted Date",
        value: submittedDateFilter,
        onChange: (value: string) => {
          setSubmittedDateFilter(value);
          setPage(1);
        },
        options: [
          { value: "all", label: "All Dates" },
          { value: "today", label: "Today" },
          { value: "last_7_days", label: "Last 7 Days" },
          { value: "last_30_days", label: "Last 30 Days" },
        ],
      },
    ],
    [answersCountFilter, averageFilter, submittedDateFilter]
  );

  const handleClearAllFilters = () => {
    setAnswersCountFilter("all");
    setAverageFilter("all");
    setSubmittedDateFilter("all");
    setPage(1);
  };

  // Pagination handlers
  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  return (
    <>
      <div className="app h-full flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Responses Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3">
            <Table
              loading={loading}
              title={`${survey?.title || "Loading..."} - ${responses.length} response${responses.length !== 1 ? 's' : ''} collected`}
              columns={[
                "Voter_Code",
                "Voter_Name",
                "Submitted_At",
                "Answers_Count",
                "Average_Answer",
                "View",
              ]}
              data={filteredRows}
              showActions={true}
              actions={["export", "filter"]}
              onExport={handleExportCSV}
              showFilters={false}
              filterToolbarFilters={filters}
              onFilterClearAll={handleClearAllFilters}
              selectedIds={selectedIds}
              onSelectionChange={handleSelectionChange}
              page={page}
              totalPages={totalPages}
              onFirst={handleFirst}
              onPrev={handlePrev}
              onNext={handleNext}
              onLast={handleLast}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </div>
      </div>

      {/* Response Detail Modal */}
      {viewModalOpen && selectedResponse && survey && (
        <ResponseDetailModal
          response={selectedResponse}
          survey={survey}
          open={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedResponse(null);
          }}
        />
      )}
    </>
  );
}

// Response Detail Modal Component
interface ResponseDetailModalProps {
  response: SurveyResponse;
  survey: Survey;
  open: boolean;
  onClose: () => void;
}

function ResponseDetailModal({ response, survey, open, onClose }: ResponseDetailModalProps) {
  if (!open) return null;

  const questions = survey.formSchema?.questions || [];

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-w-4xl max-h-screen p-10 flex flex-col justify-center w-full">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh]">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Response Details</h3>
              <p className="text-sm text-gray-600">
                Voter: {response.voterCode} | Submitted: {new Date(response.submittedAt).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
              onClick={onClose}
            >
              <svg className="w-3 h-3" aria-hidden="true" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
              </svg>
              <span className="sr-only">Close modal</span>
            </button>
          </div>
          
          {/* Modal body */}
          <div className="p-6">
            <div className="space-y-6">
              {questions.map((question: any) => {
                const answer = response.answers[question.id];
                
                return (
                  <div key={question.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="font-medium text-gray-900 mb-2">
                      {question.label}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </div>
                    {question.description && (
                      <div className="text-sm text-gray-600 mb-2">{question.description}</div>
                    )}
                    <div className="bg-gray-50 rounded-lg p-3">
                      {answer !== undefined && answer !== null && answer !== "" ? (
                        <div className="text-gray-900">
                          {Array.isArray(answer) ? answer.join(", ") : String(answer)}
                        </div>
                      ) : (
                        <div className="text-gray-500 italic">No answer provided</div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {questions.length === 0 && (
                <div className="text-gray-500 text-center py-8">
                  No questions found in this survey
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
