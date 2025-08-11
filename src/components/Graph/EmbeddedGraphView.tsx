import {
  Banner,
  Flex,
  IconButtonArray,
  LoadingSpinner,
  useDebounceValue,
} from "@neo4j-ndl/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BasicNode,
  BasicRelationship,
  EntityType,
  ExtendedNode,
  ExtendedRelationship,
  GraphType,
  OptionType,
  Scheme,
} from "../../types";
import { InteractiveNvlWrapper } from "@neo4j-nvl/react";
import NVL from "@neo4j-nvl/base";
import type { Node, Relationship } from "@neo4j-nvl/base";
import {
  ArrowPathIconOutline,
  FitToScreenIcon,
  InformationCircleIconOutline,
  MagnifyingGlassMinusIconOutline,
  MagnifyingGlassPlusIconOutline,
  ExploreIcon,
} from "@neo4j-ndl/react/icons";
import { IconButtonWithToolTip } from "../UI/IconButtonToolTip";
import {
  filterData,
  getCheckboxConditions,
  graphTypeFromNodes,
  processGraphData,
  extractGraphSchemaFromRawData,
} from "../../utils/Utils";
import { graphLabels, nvlOptions, queryMap } from "../../utils/Constants";
import CheckboxSelection from "./CheckboxSelection";
import ResultOverview from "./ResultOverview";
import { ResizePanelDetails } from "./ResizePanel";
import GraphPropertiesPanel from "./GraphPropertiesPanel";

interface EmbeddedGraphViewProps {
  nodeValues: ExtendedNode[];
  relationshipValues: ExtendedRelationship[];
  viewPoint?: string;
}

const EmbeddedGraphView: React.FC<EmbeddedGraphViewProps> = ({
  nodeValues,
  relationshipValues,
  viewPoint = "chatInfoView",
}) => {
  const nvlRef = useRef<NVL>(null);
  const [node, setNode] = useState<ExtendedNode[]>([]);
  const [relationship, setRelationship] = useState<ExtendedRelationship[]>([]);
  const [allNodes, setAllNodes] = useState<ExtendedNode[]>([]);
  const [allRelationships, setAllRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<"unknown" | "success" | "danger">(
    "unknown"
  );
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [scheme, setScheme] = useState<Scheme>({});
  const [newScheme, setNewScheme] = useState<Scheme>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery] = useDebounceValue(searchQuery, 300);
  const [graphType, setGraphType] = useState<GraphType[]>([]);
  const [disableRefresh, setDisableRefresh] = useState<boolean>(false);
  const [selected, setSelected] = useState<
    { type: EntityType; id: string } | undefined
  >(undefined);
  const [mode, setMode] = useState<boolean>(false);
  const graphQueryAbortControllerRef = useRef<AbortController>();
  const [openGraphView, setOpenGraphView] = useState<boolean>(false);
  const [schemaNodes, setSchemaNodes] = useState<OptionType[]>([]);
  const [schemaRels, setSchemaRels] = useState<OptionType[]>([]);
  const [viewCheck, setViewcheck] = useState<string>("enhancement");

  const graphQuery: string =
    graphType.includes("DocumentChunk") && graphType.includes("Entities")
      ? queryMap.DocChunkEntities
      : graphType.includes("DocumentChunk")
        ? queryMap.DocChunks
        : graphType.includes("Entities")
          ? queryMap.Entities
          : "";

  // fit graph to original position
  const handleZoomToFit = () => {
    if (nvlRef.current && allNodes.length > 0) {
      nvlRef.current?.fit(
        allNodes.map((node) => node.id),
        {}
      );
    }
  };

  // Initialize graph when component mounts or data changes
  useEffect(() => {
    if (nodeValues.length > 0 || relationshipValues.length > 0) {
      setLoading(true);

      try {
        const graphTypes = graphTypeFromNodes(nodeValues);
        setGraphType(graphTypes);

        const processedData = processGraphData(nodeValues, relationshipValues);
        setAllNodes(processedData.finalNodes);
        setAllRelationships(processedData.finalRels);

        // Initialize with all data
        setNode(processedData.finalNodes);
        setRelationship(processedData.finalRels);

        // Set schema from processed data
        setScheme(processedData.schemeVal);
        setNewScheme(processedData.schemeVal);

        setStatus("success");
        setStatusMessage("Graph loaded successfully");

        // Fit to screen after a short delay to ensure the graph is rendered
        setTimeout(() => {
          handleZoomToFit();
        }, 100);
      } catch (error) {
        console.error("Error processing graph data:", error);
        setStatus("danger");
        setStatusMessage("Error processing graph data");
      } finally {
        setLoading(false);
      }
    } else {
      // Reset state when no data
      setNode([]);
      setRelationship([]);
      setAllNodes([]);
      setAllRelationships([]);
      setGraphType([]);
      setScheme({});
      setNewScheme({});
      setStatus("unknown");
      setStatusMessage("");
    }
  }, [nodeValues, relationshipValues]);

  // Filter data based on search query
  useEffect(() => {
    if (debouncedQuery && allNodes.length > 0) {
      const filteredData = filterData(
        graphType,
        allNodes,
        allRelationships,
        scheme
      );
      setNode(filteredData.filteredNodes);
      setRelationship(filteredData.filteredRelations);
    } else if (allNodes.length > 0) {
      setNode(allNodes);
      setRelationship(allRelationships);
    }
  }, [debouncedQuery, allNodes, allRelationships, graphType, scheme]);

  const mouseEventCallbacks = useMemo(
    () => ({
      onNodeClick: (node: Node) => {
        setSelected({ type: "node", id: node.id });
      },
      onRelationshipClick: (relationship: Relationship) => {
        setSelected({ type: "relationship", id: relationship.id });
      },
      onCanvasClick: () => {
        setSelected(undefined);
      },
      onPan: true,
      onZoom: true,
      onDrag: true,
    }),
    []
  );

  const nvlCallbacks = useMemo(
    () => ({
      onLayoutComputing(isComputing: boolean) {
        setDisableRefresh(isComputing);
      },
    }),
    []
  );

  const handleZoomIn = () => {
    nvlRef.current?.setZoom(nvlRef.current.getScale() * 1.3);
  };

  const handleZoomOut = () => {
    nvlRef.current?.setZoom(nvlRef.current.getScale() * 0.7);
  };

  const handleRefresh = () => {
    if (allNodes.length > 0) {
      setNode([...allNodes]);
      setRelationship([...allRelationships]);
    }
  };

  const handleCheckboxChange = (graph: GraphType) => {
    const updatedGraphType = graphType.includes(graph)
      ? graphType.filter((type) => type !== graph)
      : [...graphType, graph];
    setGraphType(updatedGraphType);
  };

  const handleSchemaView = async (rawNodes: any[], rawRelationships: any[]) => {
    const { nodes, relationships } = extractGraphSchemaFromRawData(
      rawNodes,
      rawRelationships
    );
    setSchemaNodes(nodes as any);
    setSchemaRels(relationships as any);
    setViewcheck("viz");
    setOpenGraphView(true);
  };

  const selectedItem = useMemo(() => {
    if (!selected) return undefined;

    if (selected.type === "node") {
      return allNodes.find((n) => n.id === selected.id);
    } else {
      return allRelationships.find((r) => r.id === selected.id);
    }
  }, [selected, allNodes, allRelationships]);

  const checkBoxView = viewPoint !== "chatInfoView";

  const headerTitle = "Graph Visualization";

  if (nodeValues.length === 0 && relationshipValues.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Graph Visualization</h2>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            No graph data available. Please load sample data or connect to your
            backend first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="border-b border-gray-200 p-4">
        <Flex
          className="w-full"
          alignItems="center"
          flexDirection="row"
          justifyContent="space-between"
        >
          <div className="flex items-center">
            <h2 className="text-xl font-semibold">{headerTitle}</h2>
            {viewPoint !== graphLabels.chatInfoView && (
              <div className="flex items-center ml-4">
                <span>
                  <InformationCircleIconOutline className="n-size-token-6" />
                </span>
                <span className="n-body-small ml-1">
                  {graphLabels.chunksInfo}
                </span>
              </div>
            )}
          </div>
          {checkBoxView && (
            <CheckboxSelection
              graphType={graphType}
              loading={loading}
              handleChange={handleCheckboxChange}
              {...getCheckboxConditions(allNodes)}
            />
          )}
        </Flex>
      </div>

      <div className="flex" style={{ height: "600px" }}>
        <div
          className="bg-palette-neutral-bg-default relative"
          style={{ width: "100%", flex: "1" }}
        >
          {loading ? (
            <div className="my-40 flex items-center justify-center">
              <LoadingSpinner size="large" />
            </div>
          ) : status === "danger" ? (
            <div className="my-40 flex items-center justify-center">
              <Banner
                name="graph banner"
                description={statusMessage}
                type={status}
                usage="inline"
              />
            </div>
          ) : node.length === 0 &&
            relationship.length === 0 &&
            graphType.length !== 0 ? (
            <div className="my-40 flex items-center justify-center">
              <Banner
                name="graph banner"
                description={graphLabels.noNodesRels}
                type="danger"
                usage="inline"
              />
            </div>
          ) : graphType.length === 0 && checkBoxView ? (
            <div className="my-40 flex items-center justify-center">
              <Banner
                name="graph banner"
                description={graphLabels.selectCheckbox}
                type="danger"
                usage="inline"
              />
            </div>
          ) : (
            <>
              <div className="flex" style={{ height: "100%" }}>
                <div
                  className="bg-palette-neutral-bg-default relative"
                  style={{ width: "100%", flex: "1" }}
                >
                  <InteractiveNvlWrapper
                    nodes={node}
                    rels={relationship}
                    nvlOptions={nvlOptions}
                    ref={nvlRef}
                    mouseEventCallbacks={{ ...mouseEventCallbacks }}
                    interactionOptions={{
                      selectOnClick: true,
                    }}
                    nvlCallbacks={nvlCallbacks}
                  />
                  <IconButtonArray
                    orientation="vertical"
                    isFloating={true}
                    className="absolute top-4 right-4"
                  >
                    <IconButtonWithToolTip
                      label="Schema View"
                      text="Schema View"
                      onClick={() => handleSchemaView(node, relationship)}
                      placement="left"
                    >
                      <ExploreIcon className="n-size-token-7" />
                    </IconButtonWithToolTip>
                  </IconButtonArray>
                  <IconButtonArray
                    orientation="vertical"
                    isFloating={true}
                    className="absolute bottom-4 right-4"
                  >
                    {viewPoint !== "chatInfoView" && (
                      <IconButtonWithToolTip
                        label="Refresh"
                        text="Refresh graph"
                        onClick={handleRefresh}
                        placement="left"
                        disabled={disableRefresh}
                      >
                        <ArrowPathIconOutline className="n-size-token-7" />
                      </IconButtonWithToolTip>
                    )}
                    <IconButtonWithToolTip
                      label="Zoomin"
                      text="Zoom in"
                      onClick={handleZoomIn}
                      placement="left"
                    >
                      <MagnifyingGlassPlusIconOutline className="n-size-token-7" />
                    </IconButtonWithToolTip>
                    <IconButtonWithToolTip
                      label="Zoom out"
                      text="Zoom out"
                      onClick={handleZoomOut}
                      placement="left"
                    >
                      <MagnifyingGlassMinusIconOutline className="n-size-token-7" />
                    </IconButtonWithToolTip>
                    <IconButtonWithToolTip
                      label="Zoom to fit"
                      text="Zoom to fit"
                      onClick={handleZoomToFit}
                      placement="left"
                    >
                      <FitToScreenIcon className="n-size-token-7" />
                    </IconButtonWithToolTip>
                  </IconButtonArray>
                </div>
              </div>
            </>
          )}
        </div>
        <ResizePanelDetails open={true}>
          {selectedItem !== undefined ? (
            <GraphPropertiesPanel
              inspectedItem={selectedItem as BasicNode | BasicRelationship}
              newScheme={newScheme}
            />
          ) : (
            <ResultOverview
              nodes={node}
              relationships={relationship}
              newScheme={newScheme}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              setNodes={setNode}
              setRelationships={setRelationship}
            />
          )}
        </ResizePanelDetails>
      </div>
    </div>
  );
};

export default EmbeddedGraphView;
