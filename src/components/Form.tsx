"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FORMSPREE_ID = process.env.NEXT_PUBLIC_FORMSPREE_ID;

export default function Form() {
  const [formData, setFormData] = useState({
    email: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!FORMSPREE_ID) {
      setErrorMessage("Formspree is not configured.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          _subject: "Bight waitlist signup",
        }),
      });

      const responseData = (await response.json().catch(() => ({}))) as {
        error?: string;
        errors?: Array<{ message?: string }>;
      };

      if (response.ok) {
        alert("Success!");
        setFormData({ email: "" });
        setErrorMessage("");
      } else {
        setErrorMessage(
          responseData.error ||
            responseData.errors?.[0]?.message ||
            "Something went wrong. Please try again."
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? `${error.message} :(` : "Something went wrong :("
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Email address"
          className="shadow-inner shadow-blue-600/20 text-gn placeholder-gn/50 placeholder:text-black/30 border border-blu focus:outline-none active:outline-none bg-white/70 font-bold rounded-xl"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
      </div>

      {errorMessage && <p className="text-500">{errorMessage}</p>}

      <div className="flex space-x-3 max-w-xs">
        <Button
          type="submit"
          disabled={submitting}
          className="text-sm md:text-md font-semibold flex-1 bg-gn  text-white py-2 px-2 rounded-xl transition duration-300 ease-in-out transform hover:bg-blu/0 hover:text-blu/50 hover:font-bold hover:border-blu/50 shadow-lg shadow-gn/10 hover:shadow-blu/0 border border-blu"
        >
          {submitting ? "Sending..." : "Register"}
        </Button>

        <Button
          type="button"
          className="text-sm md:text-md font-semibold flex-1 bg-white/0   text-black py-2 px-2 rounded-xl transition duration-300 ease-in-out transform  hover:text-white hover:font-bold hover:border-blu/50 shadow-lg shadow-gn/10  border border-black hover:bg-gn"
          onClick={() => router.push("/Product")}
        >
          Try it out
        </Button>
      </div>
      <p className="text-sm md:text-lg font-medium  text-black">
        Get updates on the latest news and features.
      </p>
    </form>
  );
}
