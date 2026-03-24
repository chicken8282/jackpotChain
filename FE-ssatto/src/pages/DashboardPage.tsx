import PageLayout from "../components/layout/PageLayout";
import BlockchainVisualizer from "../components/dashboard/BlockchainVisualizer";
import BlockHeight from "../components/dashboard/BlockHeight";
import NodeNetwork from "../components/dashboard/NodeNetwork";
import { GradientDots } from "../components/common/GradientDots";
import { useDashboardData } from "../hooks/useDashboardData";

export default function DashboardPage() {
  const { blocks, currentHeight, activeNodes } = useDashboardData();

  return (
    <PageLayout>
      <GradientDots
        className="fixed inset-0 -z-10 bg-bg-primary opacity-[0.16]"
        spacing={20}
        dotSize={1.5}
      />

      <BlockchainVisualizer
        blocks={blocks}
        currentHeight={currentHeight}
        activeNodes={activeNodes}
      />
      <section className="grid gap-5 lg:grid-cols-[0.84fr_1.16fr]">
        <BlockHeight currentHeight={currentHeight} />
        <NodeNetwork activeNodes={activeNodes} />
      </section>
    </PageLayout>
  );
}
