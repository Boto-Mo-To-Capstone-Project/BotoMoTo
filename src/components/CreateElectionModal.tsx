import { useState } from 'react';
import { InputField } from '@/components/InputField';
import { SubmitButton } from '@/components/SubmitButton';
import { MdAdd } from "react-icons/md";
import toast from 'react-hot-toast';

// Define the shape expected by the modal
interface UiElection {
  id: number;
  name: string;
  description: string;
  status: "Draft" | "Active" | "Closed";
  isTemplate?: boolean;
  templateId?: number | null;
  instanceYear?: number | null;
  instanceName?: string | null;
}

interface CreateElectionModalProps {
  open: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onCreateInstance: (templateId: number, instanceYear: number, instanceName: string) => void;
  templates: UiElection[];
  loading: boolean;
  title?: string;
  description?: string;
}

export function CreateElectionModal({ 
  open, 
  onClose, 
  onCreateNew, 
  onCreateInstance, 
  templates, 
  loading,
  title = "Create Election",
  description = "Choose how you want to create your election:"
}: CreateElectionModalProps) {
  const [modalType, setModalType] = useState<'choice' | 'instance'>('choice');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [instanceYear, setInstanceYear] = useState(new Date().getFullYear());
  const [instanceName, setInstanceName] = useState('');

  const handleCreateInstanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !instanceName.trim()) {
      toast.error('Please select a template and enter an instance name');
      return;
    }
    onCreateInstance(selectedTemplate, instanceYear, instanceName.trim());
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear + i);

  // Reset modal state when closing
  const handleClose = () => {
    setModalType('choice');
    setSelectedTemplate(null);
    setInstanceName('');
    setInstanceYear(new Date().getFullYear());
    onClose();
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative max-w-4xl max-h-screen p-10 flex flex-col justify-center w-full">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh] w-full">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {modalType === 'choice' ? title : 'Create Instance'}
              </h3>
              {modalType === 'choice' && description && (
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              )}
            </div>
            <button
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
              onClick={handleClose}
            >
              <svg className="w-3 h-3" aria-hidden="true" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
              </svg>
              <span className="sr-only">Close modal</span>
            </button>
          </div>

          {/* Modal body */}
          <div className="p-4">
            {modalType === 'choice' ? (
              <div className="space-y-4">
                <button
                  onClick={onCreateNew}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <MdAdd className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Create New Election</h3>
                      <p className="text-sm text-gray-500 mt-1">Start from scratch with a completely new election</p>
                    </div>
                  </div>
                </button>
                
                {templates.length > 0 && (
                  <button
                    onClick={() => setModalType('instance')}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all text-left group"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Create from Template</h3>
                        <p className="text-sm text-gray-500 mt-1">Use an existing election template ({templates.length} available)</p>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleCreateInstanceSubmit} className="space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setModalType('choice')}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h4 className="text-lg font-medium text-gray-900">Create Instance from Template</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Template*
                  </label>
                  <select
                    value={selectedTemplate || ''}
                    onChange={(e) => setSelectedTemplate(Number(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Choose a template...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name.replace(' (Template)', '')}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instance Year*
                  </label>
                  <select
                    value={instanceYear}
                    onChange={(e) => setInstanceYear(Number(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <InputField
                    label="Instance Name*"
                    type="text"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    placeholder="e.g., Fall 2025, Academic Year 2025"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    A descriptive name for this election instance
                  </p>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setModalType('choice')}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create Instance'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
