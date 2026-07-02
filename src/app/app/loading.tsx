export default function AppLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-8 py-12">
      <div className="mb-4 h-8 w-8 rounded bg-surface-hover" />
      <div className="mb-6 h-10 w-2/3 rounded bg-surface-hover" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-surface" />
        <div className="h-4 w-11/12 rounded bg-surface" />
        <div className="h-4 w-4/5 rounded bg-surface" />
        <div className="h-4 w-3/4 rounded bg-surface" />
      </div>
    </div>
  );
}
