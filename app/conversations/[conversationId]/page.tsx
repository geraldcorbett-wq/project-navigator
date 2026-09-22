import GlobalNav from "../../../components/global-nav";
import ConversationPanel from "./conversation-panel";

type Props = { params: Promise<{ conversationId: string }> };

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;
  return (
    <main className="shell appShell">
      <section className="panel conversationPanelShell">
        <div className="brandRow">
          <div className="mark" aria-hidden="true"><span /><span /></div>
          <p className="brand">Project Navigator</p>
        </div>
        <ConversationPanel conversationId={conversationId} />
        <GlobalNav />
      </section>
    </main>
  );
}
