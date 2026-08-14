import GlobalNav from "../../components/global-nav";
import ConversationsPanel from "./conversations-panel";

export default function ConversationsPage() {
  return (
    <main className="shell appShell">
      <section className="panel compactPanel">
        <div className="brandRow">
          <div className="mark" aria-hidden="true"><span /><span /></div>
          <p className="brand">Project Navigator</p>
        </div>
        <div className="mePage">
          <h1 className="pageTitle">Conversations</h1>
          <ConversationsPanel />
        </div>
        <GlobalNav />
      </section>
    </main>
  );
}
