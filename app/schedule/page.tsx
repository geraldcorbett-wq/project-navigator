import GlobalNav from "../../components/global-nav";
import SchedulePanel from "./schedule-panel";

export default function SchedulePage() {
  return (
    <main className="shell appShell">
      <section className="panel compactPanel">
        <div className="brandRow">
          <div className="mark" aria-hidden="true"><span /><span /></div>
          <p className="brand">Project Navigator</p>
        </div>
        <div className="mePage">
          <h1 className="pageTitle">Schedule</h1>
          <SchedulePanel />
        </div>
        <GlobalNav />
      </section>
    </main>
  );
}
