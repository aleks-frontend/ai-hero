import { AlertCircle } from "lucide-react";

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return (
    <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 w-full max-w-[65ch] px-4 pointer-events-none">
      <div className="flex items-center gap-2 rounded-md bg-red-950 p-3 text-sm text-red-300 shadow-lg pointer-events-auto">
        <AlertCircle className="size-5 shrink-0" />
        {message}
      </div>
    </div>
  );
};
