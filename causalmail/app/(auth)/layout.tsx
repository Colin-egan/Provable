import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1">
      <header className="px-6 py-4 border-b">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          CausalMail
        </Link>
      </header>
      {children}
    </div>
  );
}
