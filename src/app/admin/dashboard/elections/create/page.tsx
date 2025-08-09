"use client";

import { useState, useRef } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import SearchBar from '@/components/SearchBar';
import { MdAdd, MdDownload, MdFilterList, MdDelete, MdEdit, MdSave } from "react-icons/md";
import { ElectionForm, ElectionFormHandle } from "@/components/ElectionForm";
import { ScopeTab } from "@/components/ScopeTab";
import { PartyTab } from "@/components/PartyTab"; // Use PartyTab instead of PartyTable/PartyModal

type TabType = "election" | "scope" | "party";

interface ElectionFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

interface ScopeFormData {
  scopingType: string;
  scopingName: string;
  description: string;
  uploadedFile?: File;
}

interface Party {
  id: number;
  name: string;
  color: string;
}

export default function CreateElectionPage() {
  const [activeTab, setActiveTab] = useState<TabType>("election");
  const [electionData, setElectionData] = useState<ElectionFormData>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });
  const [scopeData, setScopeData] = useState<ScopeFormData>({
    scopingType: "Department",
    scopingName: "Department 1",
    description: "",
  });
  const [addScope, setAddScope] = useState<"yes" | "no" | "">("");
  const [addParty, setAddParty] = useState<"yes" | "no" | "">(""); // <-- Add this line
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [scopingNames, setScopingNames] = useState<{ name: string; description: string }[]>([]);
  const [showPartyModal, setShowPartyModal] = useState(false);

  // PartyTab state
  const [parties, setParties] = useState<Party[]>([]);

  const [scopeSelectedIds, setScopeSelectedIds] = useState<number[]>([]);
  const [partySelectedIds, setPartySelectedIds] = useState<number[]>([]);

  const electionFormRef = useRef<ElectionFormHandle>(null);

  const tabOptions = [
    { label: "Election", value: "election", disabled: false },
    { label: "Scope", value: "scope", disabled: false },
    { label: "Party", value: "party", disabled: false },
  ];

  // Save handler for top Save button
  const handleSaveElection = () => {
    electionFormRef.current?.submitForm();
  };

  const renderContent = () => {
    switch (activeTab) {
      case "election":
        return (
          <div className="flex justify-center">
            <div className="w-full max-w-7xl bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
              <ElectionForm
                ref={electionFormRef}
                electionData={electionData}
                setElectionData={setElectionData}
                addParty={addParty}
                setAddParty={setAddParty}
                scopeType={""}
                setScopeType={function (v: string): void {
                  throw new Error("Function not implemented.");
                }}
                updateScopeTypeInTable={function (v: string): void {
                  throw new Error("Function not implemented.");
                }}
                hideSaveButton
              />
            </div>
          </div>
        );
      case "scope":
        return (
          <ScopeTab
            scopingType={scopeData.scopingType}
            setScopingType={(type) => setScopeData(prev => ({ ...prev, scopingType: type }))}
            scopingNames={scopingNames}
            setScopingNames={setScopingNames}
            search={search}
            setSearch={setSearch}
            showCreateModal={showCreateModal}
            setShowCreateModal={setShowCreateModal}
            selectedIds={scopeSelectedIds}
            setSelectedIds={setScopeSelectedIds}
          />
        );
      case "party":
        return (
          <PartyTab
            parties={parties}
            setParties={setParties}
            search={search}
            setSearch={setSearch}
            showCreateModal={showPartyModal}
            setShowCreateModal={setShowPartyModal}
            selectedIds={partySelectedIds}
            setSelectedIds={setPartySelectedIds}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50">
      <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
        {/* Tabs + Toolbar at the top */}
        <div className="main-toolbar sticky top-16 z-30 bg-white flex flex-col md:flex-row md:items-center md:gap-4 gap-2 mb-6 py-3 px-2 sm:px-5">
          <div className="flex-shrink-0">
            <div className="inline-flex w-full max-w-[380px] md:w-auto rounded-md border border-gray-300 overflow-hidden bg-white">
              {tabOptions.map((tab, i) => (
                <SubmitButton
                  key={tab.value}
                  label={tab.label}
                  variant="tab"
                  isActive={activeTab === tab.value}
                  onClick={() => !tab.disabled && setActiveTab(tab.value as TabType)}
                  className={`w-full h-[44px] md:w-[120px] md:h-10 ${
                    i !== 0 ? "border-l border-gray-200" : ""
                  } ${tab.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                />
              ))}
            </div>
          </div>
          {/* Election Save Button right aligned at the top */}
          {activeTab === "election" && (
            <div className="flex-1 flex justify-end gap-2">
              {/* Cancel Button */}
              <SubmitButton
                label="Cancel"
                variant="action"
                onClick={() => {
                  // TODO: handle cancel (e.g., reset form or navigate away)
                }}
                className="min-w-[100px]"
              />
              {/* Save Button (disabled by default, enable when form is valid) */}
              <SubmitButton
                label="Save"
                variant="action-primary"
                icon={<MdSave size={20} className="text-[var(--color-primary)]" />}
                title="Save"
                onClick={handleSaveElection} // <-- This triggers the form's submit
                className="min-w-[100px]"
              />
            </div>
          )}
          {activeTab === "scope" && (
            <>
              {/* Search bar */}
              <div className="flex-1 md:mx-4">
                <SearchBar
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for Scope"
                />
              </div>
              {/* Action Buttons */}
              <div className="flex-shrink-0 flex gap-2">
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdAdd size={20} />}
                  title="Add"
                  onClick={() => setShowCreateModal(true)}
                />
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdEdit size={20} />}
                  title="Edit"
                  onClick={scopeSelectedIds.length === 1 ? () => {
                          /* TODO: handle edit */
                        } : undefined}
                  className={scopeSelectedIds.length === 1
                      ? ""
                      : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"}
                />
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdDownload size={20} />}
                  title="Download"
                  onClick={
                    scopeSelectedIds.length >= 1
                      ? () => {
                          /* TODO: handle download */
                        }
                      : undefined
                  }
                  className={
                    scopeSelectedIds.length >= 1
                      ? ""
                      : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                  }
                />
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdFilterList size={20} />}
                  title="Filter"
                  onClick={
                    scopeSelectedIds.length >= 1
                      ? () => {
                          /* TODO: handle filter */
                        }
                      : undefined
                  }
                  className={
                    scopeSelectedIds.length >= 1
                      ? ""
                      : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                  }
                />
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdDelete size={20} />}
                  title="Delete"
                  onClick={
                    scopeSelectedIds.length >= 1
                      ? () => {
                          /* TODO: handle delete */
                        }
                      : undefined
                  }
                  className={
                    scopeSelectedIds.length >= 1
                      ? ""
                      : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                  }
                />
                {/* Save Button */}
                <SubmitButton
                  label="Save"
                  variant="action-primary"
                  icon={
                    <MdSave
                      size={20}
                      className={
                        scopingNames.length > 0
                          ? "text-[var(--color-primary)]"
                          : "text-gray-400"
                      }
                    />
                  }
                  title="Save"
                  onClick={
                    scopingNames.length > 0
                      ? () => {
                          /* TODO: handle save */
                        }
                      : undefined
                  }
                  className={
                    scopingNames.length > 0
                      ? ""
                      : "border-2 border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                  }
                />
              </div>
            </>
          )}
          {/* Party Toolbar */}
          {activeTab === "party" && (
            <>
              <div className="flex-1 md:mx-4">
                <SearchBar
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for Party"
                />
              </div>
              <div className="flex-shrink-0 flex gap-2">
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdAdd size={20} />}
                  title="Add"
                  onClick={() => setShowPartyModal(true)}
                />
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdEdit size={20} />}
                  title="Edit"
                  onClick={
                    partySelectedIds.length === 1
                      ? () => {
                          /* TODO: handle edit party */
                        }
                      : undefined
                  }
                  className={
                    partySelectedIds.length === 1
                      ? ""
                      : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                  }
                />
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdDownload size={20} />}
                  title="Download"
                  onClick={
                    partySelectedIds.length >= 1
                      ? () => {
                          /* TODO: handle download party */
                        }
                      : undefined
                  }
                  className={
                    partySelectedIds.length >= 1
                      ? ""
                      : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                  }
                />
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdFilterList size={20} />}
                  title="Filter"
                  onClick={
                    partySelectedIds.length >= 1
                      ? () => {
                          /* TODO: handle filter party */
                        }
                      : undefined
                  }
                  className={
                    partySelectedIds.length >= 1
                      ? ""
                      : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                  }
                />
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdDelete size={20} />}
                  title="Delete"
                  onClick={
                    partySelectedIds.length >= 1
                      ? () => {
                          /* TODO: handle delete party */
                        }
                      : undefined
                  }
                  className={
                    partySelectedIds.length >= 1
                      ? ""
                      : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                  }
                />
                {/* Save Button for Party */}
                <SubmitButton
                  label="Save"
                  variant="action-primary"
                  icon={
                    <MdSave
                      size={20}
                      className={
                        parties.length > 0
                          ? "text-[var(--color-primary)]"
                          : "text-gray-400"
                      }
                    />
                  }
                  title="Save"
                  onClick={
                    parties.length > 0
                      ? () => {
                          /* TODO: handle save party */
                        }
                      : undefined
                  }
                  className={
                    parties.length > 0
                      ? ""
                      : "border-2 border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                  }
                />
              </div>
            </>
          )}
        </div>

        {/* Election form title and description only for Election tab */}
        {activeTab === "election" && (
          <>
            <h2 className="text-lg font-semibold mb-4 px-2 sm:px-5">Election form</h2>
            <p className="text-gray-600 mb-4 px-2 sm:px-5">
              Fill out the necessary fields to create a new election for your organization.
            </p>
          </>
        )}
        {/* Variant: Scope tab */}
        {activeTab === "scope" && (
          <>
            <h2 className="text-lg font-semibold mb-4 px-2 sm:px-5">Scope</h2>
            <p className="text-gray-600 mb-4 px-2 sm:px-5">
              Step 1: Click 'Add Scope' Set eligibility rules or levels for voting, such as limiting access based on voter level (e.g., Level 1, 2, 3).
            </p>
          </>
        )}

        {/* Variant: Party tab */}
        {activeTab === "party" && (
          <>
            <h2 className="text-lg font-semibold mb-4 px-2 sm:px-5">Party</h2>
            <p className="text-gray-600 mb-4 px-2 sm:px-5">
              Step 2: Click 'Add Party' to create a new political party or group.
            </p>
          </>
        )}

        {/* Card/Form */}
        <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-5">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
