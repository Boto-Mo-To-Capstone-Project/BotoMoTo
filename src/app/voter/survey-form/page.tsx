"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import InteractiveSurvey from "@/components/survey/InteractiveSurvey";
import Button from "@/components/Button";
import { FormSchema } from "@/types/survey";
import { toast } from "react-hot-toast";

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
    // Check for voter data in localStorage
    const storedData = localStorage.getItem("voterData");
    if (!storedData) {
      toast.error("Please log in as a voter first");
      router.push("/voter/login");
      return;
    }

    try {
      const parsedData = JSON.parse(storedData);
      setVoterData(parsedData);
      fetchActiveSurvey();
    } catch (err) {
      toast.error("Invalid voter session data");
      router.push("/voter/login");
    }
  }, [router]);

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
    if (!survey || !voterData?.voter?.code) {
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
          voterCode: voterData.voter.code,
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
      <main className="min-h-screen flex flex-col items-center justify-center gap-10 px-5 md:px-10 pb-20 pt-40">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading survey...</p>
        </div>
      </main>
    );
  }

  if (error || !survey) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-10 px-5 md:px-10 pb-20 pt-40">
        <div className="text-center space-y-4 flex flex-col items-center">
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
    <main className="flex flex-col items-center gap-10 px-5 md:px-10 pb-20 pt-40">
      <div className="text-center space-y-2">
        <h1 className="voter-election-heading">Survey</h1>
        <p className="voter-election-desc">
          We value your feedback! Please take a few moments to complete this survey.
        </p>
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
