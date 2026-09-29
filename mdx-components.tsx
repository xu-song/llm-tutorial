import { Children, cloneElement, ComponentPropsWithoutRef, isValidElement, ReactNode } from "react";
import type { MDXComponents } from "mdx/types";
import CodeRunner from "@/components/CodeRunner";
import CodeTabs from "@/components/CodeTabs";
import PaperHeader from "@/components/PaperHeader";
import References from "@/components/References";
import Cite from "@/components/Cite";
import LinePlayground from "@/components/viz/LinePlayground";
import GradientDescentViz from "@/components/viz/GradientDescentViz";
import ScatterClassifier from "@/components/viz/ScatterClassifier";
import KMeansViz from "@/components/viz/KMeansViz";
import EntropyExplorer from "@/components/viz/EntropyExplorer";
import CrossEntropyExplorer from "@/components/viz/CrossEntropyExplorer";
import SigmoidExplorer from "@/components/viz/SigmoidExplorer";
import SplitGainExplorer from "@/components/viz/SplitGainExplorer";
import NeuralNetViz from "@/components/viz/NeuralNetViz";
import PCAExplorer from "@/components/viz/PCAExplorer";
import ConfusionMatrixExplorer from "@/components/viz/ConfusionMatrixExplorer";
import OverfittingExplorer from "@/components/viz/OverfittingExplorer";
import KFoldExplorer from "@/components/viz/KFoldExplorer";
import SVMMarginExplorer from "@/components/viz/SVMMarginExplorer";
import ProbabilityExplorer from "@/components/viz/ProbabilityExplorer";
import NaiveBayesExplorer from "@/components/viz/NaiveBayesExplorer";
import EnsembleExplorer from "@/components/viz/EnsembleExplorer";
import KLDirectionExplorer from "@/components/viz/KLDirectionExplorer";
import JointEntropyExplorer from "@/components/viz/JointEntropyExplorer";
import EntropyRelationDiagram from "@/components/viz/EntropyRelationDiagram";
import NLLCurveExplorer from "@/components/viz/NLLCurveExplorer";
import RLGridWorld from "@/components/viz/RLGridWorld";
import DistillTemperature from "@/components/viz/DistillTemperature";
import DecodingSampler from "@/components/viz/DecodingSampler";
import GrammarGraph from "@/components/viz/GrammarGraph";
import BanditExplorer from "@/components/viz/BanditExplorer";
import CliffCompare from "@/components/viz/CliffCompare";
import PolicyGradientViz from "@/components/viz/PolicyGradientViz";
import PPOClipExplorer from "@/components/viz/PPOClipExplorer";
import DiscountFactorViz from "@/components/viz/DiscountFactorViz";
import ValueIterationHeatmap from "@/components/viz/ValueIterationHeatmap";
import AsyncDPSweepViz from "@/components/viz/AsyncDPSweepViz";
import RandomWalkTDMC from "@/components/viz/RandomWalkTDMC";
import ActionDiscretizationViz from "@/components/viz/ActionDiscretizationViz";
import ReparamGradientViz from "@/components/viz/ReparamGradientViz";
import SquashedGaussianViz from "@/components/viz/SquashedGaussianViz";
import GAELambdaViz from "@/components/viz/GAELambdaViz";
import BanditStrategyCompare from "@/components/viz/BanditStrategyCompare";
import BanditRegretViz from "@/components/viz/BanditRegretViz";
import OfflineExtrapolationViz from "@/components/viz/OfflineExtrapolationViz";
import ExpectileViz from "@/components/viz/ExpectileViz";
import DoublyRobustViz from "@/components/viz/DoublyRobustViz";
import DQNBiasViz from "@/components/viz/DQNBiasViz";
import AdvantageEstimatorViz from "@/components/viz/AdvantageEstimatorViz";
import MCTSExplorer from "@/components/viz/MCTSExplorer";
import DynaQPlanningViz from "@/components/viz/DynaQPlanningViz";
import DistributionalReturnViz from "@/components/viz/DistributionalReturnViz";
import EligibilityTraceViz from "@/components/viz/EligibilityTraceViz";
import LambdaReturnMixtureViz from "@/components/viz/LambdaReturnMixtureViz";
import ExpertIterationViz from "@/components/viz/ExpertIterationViz";
import OrmPrmCompareViz from "@/components/viz/OrmPrmCompareViz";
import CovariateShiftViz from "@/components/viz/CovariateShiftViz";
import OptionsHorizonViz from "@/components/viz/OptionsHorizonViz";
import FeudalGoalViz from "@/components/viz/FeudalGoalViz";
import QMixMonotonicViz from "@/components/viz/QMixMonotonicViz";
import SuccessorFeatureViz from "@/components/viz/SuccessorFeatureViz";
import LolaTitForTatViz from "@/components/viz/LolaTitForTatViz";
import BootstrappedDqnViz from "@/components/viz/BootstrappedDqnViz";
import ExplorationSpectrumViz from "@/components/viz/ExplorationSpectrumViz";
import CreditPropagationViz from "@/components/viz/CreditPropagationViz";
import NoveltyExplorationViz from "@/components/viz/NoveltyExplorationViz";
import LLNConvergenceViz from "@/components/viz/LLNConvergenceViz";
import ImportanceSamplingViz from "@/components/viz/ImportanceSamplingViz";
import BlackjackPolicyViz from "@/components/viz/BlackjackPolicyViz";
import FloatOverflowViz from "@/components/viz/FloatOverflowViz";
import CEKLDecompositionViz from "@/components/viz/CEKLDecompositionViz";
import PerplexityViz from "@/components/viz/PerplexityViz";
import OnPolicyDistillLoop from "@/components/viz/OnPolicyDistillLoop";
import ExposureBiasWalk from "@/components/viz/ExposureBiasWalk";
import ReverseKLBar from "@/components/viz/ReverseKLBar";
import EfficiencyCompare from "@/components/viz/EfficiencyCompare";
import MixedDistillDial from "@/components/viz/MixedDistillDial";
import GRPOAdvantageViz from "@/components/viz/GRPOAdvantageViz";
import BornAgainCurve from "@/components/viz/BornAgainCurve";
import WeakToStrongBar from "@/components/viz/WeakToStrongBar";
import ConfidenceReweightViz from "@/components/viz/ConfidenceReweightViz";

type FigureProps = ComponentPropsWithoutRef<"figure">;
type FigcaptionProps = ComponentPropsWithoutRef<"figcaption">;
type FigcaptionWithAltProps = FigcaptionProps & { "data-figure-alt"?: string };
type ImgProps = ComponentPropsWithoutRef<"img">;

function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textFromNode(node.props.children);
  return "";
}

function Figure({ children, className = "", ...props }: FigureProps) {
  const childArray = Children.toArray(children);
  const image = childArray.find(
    (child): child is React.ReactElement<ImgProps> => isValidElement(child) && child.type === "img",
  );
  const alt = typeof image?.props.alt === "string" ? image.props.alt : undefined;

  return (
    <figure className={className} {...props}>
      {childArray.map((child) => {
        if (!isValidElement<FigcaptionWithAltProps>(child) || child.type !== "figcaption") return child;
        return cloneElement(child, { "data-figure-alt": alt });
      })}
    </figure>
  );
}

function FigureCaption({ children, className = "", ...props }: FigcaptionWithAltProps) {
  const text = textFromNode(children).trim();
  const alt = props["data-figure-alt"];
  const sourceOnly = /^图源[:：]/.test(text) || /^图片来源[:：]/.test(text) || /^来源[:：]/.test(text);

  return (
    <figcaption className={`${className} figure-caption !mt-3 mx-auto max-w-2xl text-center text-zinc-500 dark:text-zinc-500`} {...props}>
      {sourceOnly && alt ? (
        <span className="figure-caption-main block !text-[13px] !leading-5">{alt}</span>
      ) : (
        children
      )}
      {sourceOnly ? (
        <span className="figure-caption-source mt-1 block !text-[11px] !leading-4 text-zinc-400 dark:text-zinc-600">
          {children}
        </span>
      ) : null}
    </figcaption>
  );
}

// 在所有 MDX 文件中全局可用的组件。
// 这样教程作者无需 import,直接写 <CodeRunner /> / <LinePlayground /> 等即可。
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    figure: Figure,
    figcaption: FigureCaption,
    CodeRunner,
    CodeTabs,
    PaperHeader,
    References,
    Cite,
    LinePlayground,
    GradientDescentViz,
    ScatterClassifier,
    KMeansViz,
    EntropyExplorer,
    CrossEntropyExplorer,
    SigmoidExplorer,
    SplitGainExplorer,
    NeuralNetViz,
    PCAExplorer,
    ConfusionMatrixExplorer,
    OverfittingExplorer,
    KFoldExplorer,
    SVMMarginExplorer,
    ProbabilityExplorer,
    NaiveBayesExplorer,
    EnsembleExplorer,
    KLDirectionExplorer,
    JointEntropyExplorer,
    EntropyRelationDiagram,
    NLLCurveExplorer,
    RLGridWorld,
    DistillTemperature,
    DecodingSampler,
    GrammarGraph,
    BanditExplorer,
    CliffCompare,
    PolicyGradientViz,
    PPOClipExplorer,
    DiscountFactorViz,
    ValueIterationHeatmap,
    AsyncDPSweepViz,
    RandomWalkTDMC,
    ActionDiscretizationViz,
    ReparamGradientViz,
    SquashedGaussianViz,
    GAELambdaViz,
    BanditStrategyCompare,
    BanditRegretViz,
    OfflineExtrapolationViz,
    ExpectileViz,
    DoublyRobustViz,
    DQNBiasViz,
    AdvantageEstimatorViz,
    MCTSExplorer,
    DynaQPlanningViz,
    DistributionalReturnViz,
    EligibilityTraceViz,
    LambdaReturnMixtureViz,
    ExpertIterationViz,
    OrmPrmCompareViz,
    CovariateShiftViz,
    OptionsHorizonViz,
    FeudalGoalViz,
    QMixMonotonicViz,
    SuccessorFeatureViz,
    LolaTitForTatViz,
    BootstrappedDqnViz,
    ExplorationSpectrumViz,
    CreditPropagationViz,
    NoveltyExplorationViz,
    LLNConvergenceViz,
    ImportanceSamplingViz,
    BlackjackPolicyViz,
    FloatOverflowViz,
    CEKLDecompositionViz,
    PerplexityViz,
    OnPolicyDistillLoop,
    ExposureBiasWalk,
    ReverseKLBar,
    EfficiencyCompare,
    MixedDistillDial,
    GRPOAdvantageViz,
    BornAgainCurve,
    WeakToStrongBar,
    ConfidenceReweightViz,
    ...components,
  };
}
