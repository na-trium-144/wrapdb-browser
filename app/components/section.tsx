import clsx from "clsx";

export function Section({
  className,
  title,
  children,
}: {
  className?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={clsx(
        "bg-base-1 dark:bg-base-1d p-6 rounded-lg",
        "border border-base-2 dark:border-base-2d",
        "text-content-2 dark:text-content-2d leading-relaxed",
        className,
      )}
    >
      <h3
        className={clsx(
          "text-xl font-semibold text-content-1 dark:text-content-1d",
          "border-b border-base-2 dark:border-base-2d pb-2 mb-4",
        )}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}
