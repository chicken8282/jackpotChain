import type { PropsWithChildren } from "react";

export default function PageLayout({ children }: PropsWithChildren) {
  return (
    <main className="px-4 pb-24 pt-28 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-8 sm:gap-10 lg:gap-12">
        {children}
      </div>
    </main>
  );
}
