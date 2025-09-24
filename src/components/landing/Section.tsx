import * as React from "react";

export function Section(props: React.ComponentProps<"section">) {
  const { className = "", children, ...rest } = props;
  return (
    <section
      {...rest}
      className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </section>
  );
}
