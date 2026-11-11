/**
 * The transaction entry screen is a full-screen, light keypad experience, so
 * it deliberately sits outside the `(app)` layout: no navbar, no month picker
 * and no bottom action bar competing with the on-screen keypad.
 */
export default function EntryLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative z-0 flex min-h-dvh flex-col bg-white">
      {children}
    </div>
  );
}
