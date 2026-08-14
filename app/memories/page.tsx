import GlobalNav from "../../components/global-nav";
import MemoriesPanel from "./memories-panel";

export default function MemoriesPage() {
  return (
    <main className="shell appShell">
      <section className="panel compactPanel">
        <div className="brandRow">
          <div className="mark" aria-hidden="true"><span /><span /></div>
          <p className="brand">Project Navigator</p>
        </div>
        <div className="mePage">
          <h1 className="pageTitle">Memories</h1>
          <MemoriesPanel />
        </div>
        <GlobalNav />
      </section>
    </main>
  );
}
