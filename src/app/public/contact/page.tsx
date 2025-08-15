"use client";

import AboutFooter from "@/components/about-us/AboutFooter";
import Button from "@/components/Button";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";
import { useState } from "react";

export default function ContactPage() {
  const [message, setMessage] = useState();
  const handleSubmit = () => {
    console.log("Button clicked!");
  }
  return (
    <main className="min-h-screen flex flex-col items-center pt-20">
      <div className="flex flex-col items-center py-20 gap-4">
        <p className="text-dmd font-semibold">Get in touch</p>
        <p className="text-xl font-normal text-gray text-center">Our team would love to hear from you.</p>
      </div>
      <form className="flex flex-col w-full xs:w-[380px] mb-20 px-5 items-center">
        <div className="flex gap-2">
          <InputField placeholder="First name" label="First name" type="text" />
          <InputField placeholder="Last name" label="Last name" type="text" />
        </div>
        <InputField placeholder="you@gmail.com" label="Email" type="email" wrapperClassName="mt-4"/>
        <InputField placeholder="Phone number" label="Phone number" type="tel" wrapperClassName="mt-4"/>
        <InputField
          label="Message"
          textarea
          rows={4}
          placeholder="Type your message here..."
          name="message"
          value={message}
          wrapperClassName="mt-4"
          
        />

         {/* Checkbox */}
        <InputField
          type="checkbox"
          label="I agree to the Privacy Policy"
          wrapperClassName="flex flex-row-reverse items-center justify-end gap-4"
          
        />
        <SubmitButton onClick={handleSubmit} type="submit" label="Submit"/>
      </form>

      <AboutFooter/>
    </main>
  );
}