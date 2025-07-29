"use client";

import { useEffect, useState } from "react";
import type { Session } from "next-auth";

interface RequestCount {
  currentCount: number;
  limit: number;
}

interface RequestCounterProps {
  session: Session | null;
}

export function RequestCounter({ session }: RequestCounterProps) {
  const [requestCount, setRequestCount] = useState<RequestCount | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchRequestCount = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch("/api/request-count");
      if (response.ok) {
        const data = await response.json();
        setRequestCount(data);
        setIsAdmin(data.isAdmin ?? false);
      }
    } catch (error) {
      console.error("Failed to fetch request count:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestCount();
  }, [session?.user?.id]);

  if (!session?.user?.id) return null;

  return (
    <div className="fixed top-4 right-4 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm">
      <div className="text-gray-300 mb-1">Daily Requests</div>
      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : requestCount ? (
        <div className="text-white">
          {requestCount.currentCount} / {isAdmin ? "Infinite" : requestCount.limit}
        </div>
      ) : (
        <div className="text-gray-400">-</div>
      )}
      <button
        onClick={fetchRequestCount}
        className="mt-2 text-xs text-blue-400 hover:text-blue-300"
      >
        Refresh
      </button>
    </div>
  );
} 