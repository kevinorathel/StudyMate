import * as React from "react";
import { cn } from "@/lib/utils";

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading: boolean;
}

export const Loader: React.FC<LoaderProps> = ({ isLoading, className, ...props }) => {
  if (!isLoading) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-20 backdrop-blur-sm",
        className
      )}
      {...props}
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-t-transparent" />
    </div>
  );
};
