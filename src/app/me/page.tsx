import Link from "next/link";
import ProfilePanel from "../profile-panel";

export default function MePage() {
  return (
    <main className="shell">
      <section className="panel compactPanel">
        <Link href="/" className="backLink topMostBackLink">‹ Hi</Link>
        <div className="brandRow">
          <div className="mark" aria-hidden="true"><span /><span /></div>
          <p className="brand">Project Navigator</p>
        </div>
        <div className="mePage">
          <h1 className="pageTitle">Interface</h1>
          <ProfilePanel />
        </div>
      </section>
    </main>
  );
}
