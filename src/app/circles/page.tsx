import GlobalNav from "../../components/global-nav";
import CirclesPanel from "./circles-panel";

export default function CirclesPage() {
  return (
    <main className="shell appShell">
      <section className="panel compactPanel">
        <div className="brandRow">
          <div className="mark" aria-hidden="true"><span /><span /></div>
          <p className="brand">Project Navigator</p>
        </div>
        <div className="mePage">
          <h1 className="pageTitle">Circles</h1>
          <CirclesPanel />
        </div>
        <GlobalNav />
      </section>
    </main>
  );
}
