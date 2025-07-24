"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import { useChat } from "@ai-sdk/react";
import { Loader2 } from "lucide-react";
import { ErrorMessage } from "~/components/error-message";

interface ChatProps {
  userName: string;
}

export const ChatPage = ({ userName }: ChatProps) => {
  const [error, setError] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
  } = useChat({
    body: {
      language: "Serbian"
    },
    async onError(err) {
      
      // Handle Response object (future-proofing)
      if (err instanceof Response && err.status === 401) {
        setError("You must be signed in to chat.");
        setShowSignIn(true);
      }
      // Handle Error object with Unauthorized message
      else if (err instanceof Error && err.message === "Unauthorized") {
        setError("You must be signed in to chat.");
        setShowSignIn(true);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  });

  console.log(messages, "messages");  

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <>
      {error && <ErrorMessage message={error} />}
      <div className="flex flex-1 flex-col">
        <div
          className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500"
          role="log"
          aria-label="Chat messages"
        >
          {messages.map((message, index) => {
            return (
              <ChatMessage
                key={index}
                parts={message.parts}
                role={message.role}
                userName={userName}
              />
            );
          })}
          {((status === "streaming") || (status === "submitted")) && (
            <div className="flex justify-center py-4">
              <Loader2 className="size-6 animate-spin text-gray-400" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-700">
          <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-4xl p-4"
          >
            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Say something..."
                autoFocus
                aria-label="Chat input"
                className="flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-gray-200 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                disabled={status === "streaming" || status === "submitted"}
              />
              <button
                type="submit"
                disabled={status === "streaming" || status === "submitted" || !input.trim()}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:hover:bg-gray-700"
              >
                {((status === "streaming") || (status === "submitted")) ? <Loader2 className="size-4 animate-spin" /> : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
    </>
  );
};
