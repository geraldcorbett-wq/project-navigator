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
          <p className="brand">Navigator</p>
        </div>

        <div className="content">
          <p className="eyebrow">AVAILABLE WHEN NEEDED</p>
          <h1 id="navigator-title">HI.</h1>
          <p className="intro">
            I&apos;m here. Quietly ready to help you organize what matters,
            one clear step at a time.
          </p>
          <button type="button" className="primaryButton">
            Begin
          </button>
        </div>

        <footer>
          <span className="statusDot" aria-hidden="true" />
          <span>Shell online</span>
        </footer>
      </section>
    </main>
  );
}
