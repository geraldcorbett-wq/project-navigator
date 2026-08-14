import GlobalNav from "../../../components/global-nav";
import ConversationPanel from "./conversation-panel";

type Props = { params: { conversationId: string } };

export default function ConversationPage({ params }: Props) {
  return (
    <main className="shell appShell">
      <section className="panel conversationPanelShell">
        <div className="brandRow">
          <div className="mark" aria-hidden="true"><span /><span /></div>
          <p className="brand">Project Navigator</p>
        </div>
        <ConversationPanel conversationId={params.conversationId} />
        <GlobalNav />
      </section>
    </main>
  );
}
