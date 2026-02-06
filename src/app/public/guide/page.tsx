'use client'

import AboutFooter from "@/components/about-us/AboutFooter";
import { SubmitButton } from "@/components/SubmitButton";
import TutorialItem, { TutorialItemProps } from "@/components/TutorialItem";
import { useState } from "react";

import adminPic1_1 from "@/app/assets/tutorial/admin/1-1.png"
import adminPic1_2 from "@/app/assets/tutorial/admin/1-2.png"
import adminPic2_1 from "@/app/assets/tutorial/admin/2-1.png"
import adminPic2_2 from "@/app/assets/tutorial/admin/2-2.png"
import adminPic2_3 from "@/app/assets/tutorial/admin/2-3.png"
import adminPic3_1 from "@/app/assets/tutorial/admin/3-1.png"
import adminPic3_2 from "@/app/assets/tutorial/admin/3-2.png"
import adminPic4_1 from "@/app/assets/tutorial/admin/4-1.png"
import adminPic5_1 from "@/app/assets/tutorial/admin/5-1.png"
import adminPic6_1 from "@/app/assets/tutorial/admin/6-1.png"
import adminPic6_2 from "@/app/assets/tutorial/admin/6-2.png"
import adminPic7_1 from "@/app/assets/tutorial/admin/7-1.png"
import adminPic7_2 from "@/app/assets/tutorial/admin/7-2.png"
import adminPic8_1 from "@/app/assets/tutorial/admin/8-1.png"
import adminPic8_2 from "@/app/assets/tutorial/admin/8-2.png"
import adminPic8_3 from "@/app/assets/tutorial/admin/8-3.png"
import adminPic8_4 from "@/app/assets/tutorial/admin/8-4.png"
import adminPic8_5 from "@/app/assets/tutorial/admin/8-5.png"
import adminPic8_6 from "@/app/assets/tutorial/admin/8-6.png"
import adminPic8_7 from "@/app/assets/tutorial/admin/8-7.png"
import adminPic8_8 from "@/app/assets/tutorial/admin/8-8.png"
import adminPic8_9 from "@/app/assets/tutorial/admin/8-9.png"
import adminPic8_10 from "@/app/assets/tutorial/admin/8-10.png"
import adminPic8_11 from "@/app/assets/tutorial/admin/8-11.png"
import adminPic8_12 from "@/app/assets/tutorial/admin/8-12.png"
import adminPic8_13 from "@/app/assets/tutorial/admin/8-13.png"
import adminPic8_14 from "@/app/assets/tutorial/admin/8-14.png"
import adminPic8_15 from "@/app/assets/tutorial/admin/8-15.png"
import adminPic9_1 from "@/app/assets/tutorial/admin/9-1.png"
import adminPic10_1 from "@/app/assets/tutorial/admin/10-1.png"

import voterPic1_1 from "@/app/assets/tutorial/voter/1-1.png"
import voterPic2_1 from "@/app/assets/tutorial/voter/2-1.png"
import voterPic3_1 from "@/app/assets/tutorial/voter/3-1.png"
import voterPic3_2 from "@/app/assets/tutorial/voter/3-2.png"
import voterPic4_1 from "@/app/assets/tutorial/voter/4-1.png"
import voterPic4_2 from "@/app/assets/tutorial/voter/4-2.png"
import voterPic4_3 from "@/app/assets/tutorial/voter/4-3.png"
import voterPic4_4 from "@/app/assets/tutorial/voter/4-4.png"
import voterPic5_1 from "@/app/assets/tutorial/voter/5-1.png"
import voterPic6_1 from "@/app/assets/tutorial/voter/6-1.png"

const TutorialPage = () => {

    const [tab, setTab] = useState<"Admin" | "Voter">("Admin");

    const tabs = ["Admin", "Voter"];

    const adminTutorialData: TutorialItemProps[] = [
        {
            title: "1. Login or Signup",
            description: [
                {
                text: "Returning admins can log in with their email and password.",
                },
                {
                text: "New admins must sign up by filling in these required fields:",
                subDetails: [
                    { text: "Full Name" },
                    { text: "Email Address" },
                    { text: "Password (must have at least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character)" },
                    { text: "Confirm Password" }                    
                ]
                }
            ],
            images: [
                { src: adminPic1_1, alt: "image" },
                { src: adminPic1_2, alt: "image" },

            ]
        },
        {
            title: "2. Organization Registration (first-time admins only)",
            description: [
                {
                text: "After signing up, the system requires you to register your organization.",
                },
                {
                text: "Provide the following details:",
                subDetails: [
                    { text: "Organization Name" },
                    { text: "Organization Email Address" },
                    { text: "Organization Logo (image upload)" },
                    { text: "Letter of Intent (formal statement requesting to use Boto Mo To system)" }                    
                ]
                },
                {
                text: "Click Save to submit the registration.",
                },
            ],
            images: [
                { src: adminPic2_1, alt: "image" },
                { src: adminPic2_2, alt: "image" },
                { src: adminPic2_3, alt: "image" },
            ]
        },
        {
            title: "3. Approval by Superadmin",
            description: [
                {
                text: "The organization request must be reviewed and approved by a Boto Mo To Superadmin.",
                },
                {
                text: "You will not gain full access until approval is granted.",
                },
            ],
            images: [
                { src: adminPic3_1, alt: "image" },
                { src: adminPic3_2, alt: "image" },
            ]
        },
        {
            title: "4. Admin Dashboard Access",
            description: [
                {
                text: "Once approved, you will be redirected to your Admin Dashboard.",
                },
                {
                text: "The dashboard has 4 main sections:",
                subDetails: [
                    { text: "Dashboard – Overview and summary of your account" },
                    { text: "All Elections – Manage all elections under this organization" },
                    { text: "Tickets – Submit issues, complaints, or suggestions to Superadmin" },
                    { text: "Profile – Manage admin account settings" }                    
                ]
                },
                {
                text: "Click Save to submit the registration.",
                },
            ],
            images: [
                { src: adminPic4_1, alt: "image" },
            ]
        },
        {
            title: "5. All Elections Section",
            description: [
                {
                text: "View a list of elections handled by your account.",
                },
                {
                text: "You can add, edit, and delete elections.",
                },
            ],
            images: [
                { src: adminPic5_1, alt: "image" },
            ]
        },
        {
            title: "6. Creating a New Election",
            description: [
                {
                text: "Click the Plus (+) button, then select Create New Election.",
                },
                {
                text: "Fill in the required election details:",
                subDetails: [
                    { text: "Election Name" },
                    { text: "Start Date & End Date" },
                    { text: "Election Description" },
                    { text: "Will this be a repeating election? (Optional)" }                    
                ]
                },
                {
                text: "Save the election.",
                },
            ],
            images: [
                { src: adminPic6_1, alt: "image" },
                { src: adminPic6_2, alt: "image" },
            ]
        },
        {
            title: "7. Optional: Add Voting Scopes & Parties",
            description: [
                {
                text: "Voting Scopes: Restrict voters to only see/vote for candidates within their scope (e.g., Level 1 voters → Level 1 candidates)",
                },
                {
                text: "Parties: Register political parties for candidates.",
                },
                {
                text: "These are optional; in this tutorial, we skip them for simplicity.",
                },
            ],
            images: [
                { src: adminPic7_1, alt: "image" },
                { src: adminPic7_2, alt: "image" },
            ]
        },
        {
            title: "8. Election Setup Sidebar",
            description: [
                {
                text: "Selecting a specific election reveals a Setup Election dropdown with the following tabs:",
                subDetails: [
                    { 
                        text: "Voters",
                        subDetails: [
                            { text: "Add, edit, or delete voters."  },
                            { text: "Batch upload multiple voters via CSV."  },
                            { text: "Required voter information: Surname, First Name, Middle Initial, Email, Voting Scope."  },
                        ]  
                     },
                    { 
                        text: "Positions",
                        subDetails: [
                            { text: "Define available positions."  },
                            { text: "Required fields: Position Name, Vote Limit, Number of Winners, Voting Scope, Display Order."  },
                        ]  
                     },
                    { 
                        text: "Candidates",
                        subDetails: [
                            { text: "Assign candidates (must already be registered voters)."  },
                            { text: "Required fields: Candidate Name (linked to voter), Position, Party."  },
                            { text: "Optional: Candidate Photo, Credentials (PDF)."  },
                        ]  
                     },
                    { 
                        text: "Manage Election",
                        subDetails: [
                            { text: "Ballot Preview – Check what the ballot will look like."  },
                            { text: "Send Emails – Automatically email voter codes to registered voters."  },
                            { text: "MFA Setup – Enable/disable multi-factor authentication."  },
                            { text: "Open Election – Activate the election and allow voting."  },
                            { text: "Live Dashboard – View real-time summaries of voter turnout and results."  },
                            { text: "Election Integrity – Monitor vote security using chain hashing to detect tampering."  },
                        ]  
                     },              
                ]
                },
            ],
            images: [
                { src: adminPic8_1, alt: "image" },
                { src: adminPic8_2, alt: "image" },
                { src: adminPic8_3, alt: "image" },
                { src: adminPic8_4, alt: "image" },
                { src: adminPic8_5, alt: "image" },
                { src: adminPic8_6, alt: "image" },
                { src: adminPic8_7, alt: "image" },
                { src: adminPic8_8, alt: "image" },
                { src: adminPic8_9, alt: "image" },
                { src: adminPic8_10, alt: "image" },
                { src: adminPic8_11, alt: "image" },
                { src: adminPic8_12, alt: "image" },
                { src: adminPic8_13, alt: "image" },
                { src: adminPic8_14, alt: "image" },
                { src: adminPic8_15, alt: "image" },
            ]
        },
        {
            title: "9. Tickets Section",
            description: [
                {
                text: "Submit a ticket to report issues or make suggestions.",
                },
                {
                text: "Tickets go directly to the Superadmin for review.",
                },
            ],
            images: [
                { src: adminPic9_1, alt: "image" },
            ]
        },
        {
            title: "10. Profile Section",
            description: [
                {
                text: "Manage your admin account settings.",
                },
                {
                text: "Options include:",
                subDetails: [
                    { text: "Update profile details" },
                    { text: "Reset password" },
                    { text: "Disable account" },
                    { text: "Transfer ownership of account to another admin" }                    
                ]
                },
            ],
            images: [
                { src: adminPic10_1, alt: "image" },
            ]
        },
    ];

    const voterTutorialData: TutorialItemProps[] = [
        {
            title: "1. Enter Voter Code",
            description: [
                {
                text: "Input your 6-digit voter code (provided by the Admin).",
                },
                {
                text: "If MFA (multi-factor authentication) is enabled by the Admin, you will be required to complete the additional step.",
                },
                {
                text: "In this tutorial, MFA is disabled for simplicity.",
                }
            ],
            images: [
                { src: voterPic1_1, alt: "image" },
            ]
        },
        {
            title: "2. Election Access",
            description: [
                {
                text: "Once the election is officially open, voters can proceed to cast their votes.",
                },
            ],
            images: [
                { src: voterPic2_1, alt: "image" },
            ]
        },
        {
            title: "3. Review Terms and Conditions",
            description: [
                {
                text: "Voters must read and accept the Terms & Conditions before continuing.",
                },
            ],
            images: [
                { src: voterPic3_1, alt: "image" },
                { src: voterPic3_2, alt: "image" },
            ]
        },
        {
            title: "4. Ballot Access & Voting",
            description: [
                {
                text: "The ballot becomes available.",
                },
                {
                text: "Cast votes for the preferred candidates.",
                },
                {
                text: "Review selections before final submission.",
                },
                {
                text: "Upon submission, a Voter Receipt is generated, listing the chosen candidates.",
                },
            ],
            images: [
                { src: voterPic4_1, alt: "image" },
                //{ src: voterPic4_2, alt: "image" },
                { src: voterPic4_3, alt: "image" },
                { src: voterPic4_4, alt: "image" },
            ]
        },
        {
            title: "5. System Survey",
            description: [
                {
                text: "After voting, the system prompts the voter to answer a short survey about the voting experience.",
                },
            ],
            images: [
                { src: voterPic5_1, alt: "image" },
            ]
        },
        {
            title: "6. Live Dashboard Access",
            description: [
                {
                text: "Once done, voters may view the Live Dashboard to see real-time election updates.",
                },
            ],
            images: [
                { src: voterPic6_1, alt: "image" },
            ]
        },
        {
            title: "7. Logout",
            description: [
                {
                text: "Always log out, especially when using a shared device, to protect voting integrity.",
                },
            ],
            images: [
                { src: voterPic6_1, alt: "image" },
            ]
        },
    ];

  return (
    <main className="min-h-screen flex flex-col items-center mt-20">
        {/* about us */}
        <div className="flex flex-col items-center gap-6 py-20 px-5 xs:px-20">
            <div className="text-center">
                <p className="text-md font-semibold text-primary ">Updated 1 Oct 2025</p>
                <p className="text-dlg font-semibold text-black">Boto Mo &#39;To Tutorial</p>
            </div>
            <p className="text-xl font-normal text-gray text-center">Simple walkthrough for admins and voters.</p>
        </div>
      
        {/* introduction */}
        <div className="w-full flex justify-start bg-gray-50 py-10 px-5 xs:px-20">
            <div className="flex flex-col gap-4 text-center xs:text-start">
                <p className="text-dsm font-semibold">Introduction</p>
                <p className="text-lg text-gray">Welcome to the Boto Mo To Tutorial Guide. <br/><br/>This document provides a clear and straightforward introduction to using the system, whether you are an <strong>administrator managing elections</strong> or a <strong>voter participating in one</strong>. <br/><br/>It is intended to serve as a starting point for new users, ensuring a simple and accessible learning experience.</p>
            </div>
        </div>


        {/* toggle styled like tabs */}
        <div className="py-10 w-full text-center px-5 xs:px-20">
            <div className="inline-flex w-full max-w-[500px] md:w-auto rounded-md border border-gray-300 overflow-hidden bg-white ">
                {tabs.map((t, i) => (
                <SubmitButton
                    key={t}
                    variant="tab"
                    onClick={() => setTab(t as "Admin" | "Voter")}
                    className={`w-full h-[44px] md:w-[120px] md:h-10 font-medium transition ${
                    tab === t
                        ? "bg-primary text-white hover:bg-red-900"
                        : "bg-white text-gray hover:bg-gray-100"
                    } ${i !== 0 ? "border-l border-gray-200" : ""}`}
                    label={t}
                />
                ))}
            </div>
        </div>

        {/* conditional tutorial content */}
        <div className="w-full pb-10 px-5 xs:px-20">
            {tab === "Admin" && (
            <div className="space-y-4">
                <div className="space-y-12">
                    {adminTutorialData.map((item, idx) => (
                        <TutorialItem
                        key={idx}
                        title={item.title}
                        description={item.description} // ✅ array of Detail
                        images={item.images}
                        />
                    ))}
                </div>
            </div>
            )}

            {tab === "Voter" && (
            <div className="space-y-4">
                <div className="space-y-12">
                    {voterTutorialData.map((item, idx) => (
                        <TutorialItem
                        key={idx}
                        title={item.title}
                        description={item.description} // ✅ array of Detail
                        images={item.images}
                        />
                    ))}
                </div>
            </div>
            )}
        </div>

      <AboutFooter/>
    </main>
  );
}

export default TutorialPage;