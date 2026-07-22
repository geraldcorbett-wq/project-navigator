import AuthPanel from "./auth-panel";
import SystemStatus from "./system-status";

export default function HomePage() {
  return (
    <main className="shell">
      <div className="ambient ambientOne" />
      <div className="ambient ambientTwo" />

      <section className="panel" aria-labelledby="navigator-title">
        <div className="brandRow">
          <div className="mark" aria-hidden="true">
            <span />
            <span />
          </div>
          <p className="brand">Project Navigator</p>
        </div>

        <div className="content identityLayout">
          <div className="greeting">
            <p className="eyebrow">ALL SYSTEMS GO</p>
            <h1 id="navigator-title">HI.</h1>
            <p className="intro">
              I&apos;m here. Quietly ready to help you organize what matters,
              one clear step at a time.
            </p>
          </div>
          <AuthPanel />
        </div>

        <footer>
          <SystemStatus />
        </footer>
      </section>
    </main>
  );
}
