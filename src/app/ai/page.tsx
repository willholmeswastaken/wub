"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      // Scroll to show the user's message with space below for AI response
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages]);
  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-4xl flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-32">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`duration-300 animate-in fade-in ${
              message.role === "user" ? "flex justify-end" : ""
            }`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {message.role === "user" ? (
              <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-sm">
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <div key={`${message.id}-${i}`}>
                          <div className="prose prose-sm prose-headings:text-primary-foreground prose-strong:text-primary-foreground prose-code:text-primary-foreground prose-pre:bg-primary/20 prose-pre:text-primary-foreground max-w-none text-primary-foreground">
                            <ReactMarkdown>{part.text}</ReactMarkdown>
                          </div>
                        </div>
                      );
                  }
                })}
              </div>
            ) : (
              <div className="text-black dark:text-gray-100">
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <div key={`${message.id}-${i}`}>
                          <div className="prose prose-sm dark:prose-headings:text-gray-100 dark:prose-strong:text-gray-100 dark:prose-code:text-gray-100 max-w-none text-black dark:text-gray-100">
                            <ReactMarkdown>{part.text}</ReactMarkdown>
                          </div>
                        </div>
                      );
                  }
                })}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage({ text: input });
          setInput("");
        }}
        className="mt-4"
      >
        <input
          className="w-full rounded border border-zinc-300 p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
          value={input}
          placeholder="Say something..."
          onChange={(e) => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}
