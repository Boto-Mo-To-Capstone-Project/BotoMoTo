"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import InteractiveSurvey from "@/components/survey/InteractiveSurvey";
import Button from "@/components/Button";
import { FormSchema } from "@/types/survey";
import { toast } from "react-hot-toast";
import UserHeader from "@/components/voter/UserHeader";

interface Survey {
  id: number;
  title: string;
  description: string;
  formSchema: FormSchema;
  isActive: boolean;
}

const SurveyForm = () => {
  const router = useRouter();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [voterData, setVoterData] = useState<any>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'none' | 'already_submitted' | 'just_submitted'>('none');

  useEffect(() => {
    checkSession();
  }, []);

  // Get voter data from session (more secure than localStorage)
  const checkSession = async () => {
    try {
      const res = await fetch("/api/voter/session", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setVoterData(data.voter);
        fetchActiveSurvey();
      } else {
        toast.error("Please log in as a voter first");
        router.push("/voter/login");
        return;
      }
    } catch (e) {
      console.error("Error checking voter session:", e);
      toast.error("Invalid voter session data");
      router.push("/voter/login");
      return;
    }
  };

  const fetchActiveSurvey = async () => {
    try {
      const response = await fetch('/api/voter/survey/active');
      const data = await response.json();
      
      if (data.success) {
        setSurvey(data.data.survey);
      } else {
        setError(data.message || "No active survey found");
      }
    } catch (err) {
      setError("Failed to fetch survey");
      console.error("Error fetching survey:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSurvey = async (responses: Record<string, any>) => {
    if (!survey || !voterData?.voterCode) {
      toast.error("Unable to submit survey - voter data missing");
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/voter/survey/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: survey.id,
          answers: responses,
          voterCode: voterData.voterCode,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Survey submitted successfully!");
        setSubmissionStatus('just_submitted');
        setHasSubmitted(true);
      } else {
        if (data.message?.includes("already submitted")) {
          // If already submitted, update status but don't show success
          setSubmissionStatus('already_submitted');
          setHasSubmitted(true);
          toast.error("You have already submitted this survey");
        } else {
          toast.error(data.message || "Failed to submit survey");
        }
      }
    } catch (err) {
      toast.error("Failed to submit survey");
      console.error("Error submitting survey:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
    <main className="flex flex-col items-center gap-10 px-5 md:px-20 pb-20 pt-40">
      <div className="w-full sm:w-4/5 lg:w-3/5 max-w-4xl">
        <UserHeader
          name={voterData?.name}
          organization={voterData?.organizationName}
          showLogout
          isLoading={loading}
          className="mb-4"
        />
      </div>
      <div className="w-full sm:w-4/5 lg:w-3/5 max-w-4xl">
        <div className="space-y-4 animate-pulse">
          {/* Header */}
          <div className="text-center space-y-2 mb-10">
            <div className="h-8 w-1/2 bg-gray-300 rounded mx-auto"></div>
            <div className="h-4 w-2/3 bg-gray-200 rounded mx-auto"></div>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-4 space-y-3 shadow-sm">
                <div className="h-6 w-1/3 bg-gray-300 rounded"></div>
                <div className="h-10 w-full bg-gray-300 rounded"></div>

                {/* Option-like skeletons */}
                <div className="space-y-2 mt-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <div className="h-5 w-5 bg-gray-300 rounded-full"></div>
                      <div className="flex-1 h-8 bg-gray-300 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Submit button */}
          <div className="pt-6 flex justify-center">
            <div className="h-12 w-48 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>

    </main>


    );
  }

  if (error || !survey) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-10 px-5 md:px-10 pb-20 pt-40">
        <div className="text-center space-y-4 flex flex-col items-center">
          <div className="w-full max-w-md">
            <UserHeader
              name={voterData?.name}
              organization={voterData?.organizationName}
          showLogout
              className="mb-4"
            />
          </div>
          <h1 className="voter-election-heading">Survey</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-yellow-800">
              {error || "No active survey is currently available."}
            </p>
          </div>
          <Button
            variant="long_primary"
            onClick={() => router.push("/voter/live-dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      </main>
    );
  }

  if (hasSubmitted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-10 px-5 md:px-10 pb-20 pt-40">
        <div className="text-center space-y-4 flex flex-col items-center">
          <div className="w-full max-w-md">
            <UserHeader
              name={voterData?.name}
              organization={voterData?.organizationName}
          showLogout
              className="mb-4"
            />
          </div>
          <h1 className="voter-election-heading">
            {submissionStatus === 'just_submitted' ? 'Survey Submitted' : 'Survey Already Submitted'}
          </h1>
          <div className={`${submissionStatus === 'just_submitted' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-6 max-w-md mx-auto`}>
            <p className={submissionStatus === 'just_submitted' ? 'text-green-800' : 'text-blue-800'}>
              {submissionStatus === 'just_submitted' 
                ? "Thank you for your feedback! Your survey response has been submitted successfully."
                : "You have already submitted a response to this survey. Thank you for your participation!"
              }
            </p>
          </div>
          <Button
            variant="long_primary"
            onClick={() => router.push("/voter/live-dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center gap-10 px-5 md:px-20 pb-20 pt-40">
      <div className="w-full sm:w-4/5 lg:w-3/5 max-w-4xl">
        <UserHeader
          name={voterData?.name}
          organization={voterData?.organizationName}
          showLogout
          className="mb-4"
        />
      </div>

      <div className="w-full sm:w-4/5 lg:w-3/5 max-w-4xl">
        <InteractiveSurvey
          schema={survey.formSchema}
          onSubmit={handleSubmitSurvey}
          isSubmitting={submitting}
        />
      </div>
    </main>
  );
};

export default SurveyForm;
