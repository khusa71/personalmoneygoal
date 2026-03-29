export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundColor: "#FAFAFA",
        backgroundImage: "radial-gradient(#e4e4e7 0.5px, transparent 0.5px)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
