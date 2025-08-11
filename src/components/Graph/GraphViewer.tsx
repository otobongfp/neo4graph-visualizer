import React, { useState } from "react";
import EmbeddedGraphView from "./EmbeddedGraphView";
import SampleData from "./SampleData";
import { ExtendedNode, ExtendedRelationship } from "../../types";
import { graphQueryAPIWithTransform } from "../../services/GraphQuery";

const GraphViewer: React.FC = () => {
  const [nodes, setNodes] = useState<ExtendedNode[]>([]);
  const [relationships, setRelationships] = useState<ExtendedRelationship[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(false);

  // Connection form state
  const [connectionForm, setConnectionForm] = useState({
    uri: "neo4j+ssc://224c5da6.databases.neo4j.io",
    userName: "neo4j",
    password: "",
    database: "neo4j",
    documentNames: ["Apple stock during pandemic.pdf"],
  });

  const handleLoadSampleData = (
    sampleNodes: ExtendedNode[],
    sampleRelationships: ExtendedRelationship[]
  ) => {
    setNodes(sampleNodes);
    setRelationships(sampleRelationships);
    setError(null);
    setShowGraph(false); // Reset graph view when new data is loaded
  };

  const handleLoadBackendData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Starting backend data load...");

      // Create an AbortController for the API call
      const abortController = new AbortController();

      // Set a timeout to abort the request if it takes too long
      const timeoutId = setTimeout(() => {
        console.log("Request timeout - aborting");
        abortController.abort();
      }, 60000); // 60 second timeout

      // Fetch graph data from backend with connection parameters
      const response = await graphQueryAPIWithTransform(
        "entities", // query_type
        connectionForm.documentNames, // document_names
        abortController.signal,
        connectionForm // connection parameters
      );

      // Clear the timeout since we got a response
      clearTimeout(timeoutId);

      // Extract the transformed data
      const { nodes: backendNodes, relationships: backendRelationships } =
        response.data.data;

      setNodes(backendNodes);
      setRelationships(backendRelationships);
      setShowGraph(false); // Reset graph view when new data is loaded

      console.log(
        `Loaded ${backendNodes.length} nodes and ${backendRelationships.length} relationships from backend`
      );
    } catch (err: any) {
      console.error("Error loading backend data:", err);
      if (err.name === "AbortError") {
        setError(
          "Request was cancelled due to timeout. The backend is taking too long to respond."
        );
      } else {
        setError(
          err.message ||
            "Failed to load data from backend. Check your connection details."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnectionChange = (field: string, value: string | string[]) => {
    setConnectionForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleShowGraph = () => {
    setShowGraph(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Graph Visualization
        </h1>

        <SampleData onLoadSampleData={handleLoadSampleData} />

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">Backend Connection</h3>
          <p className="text-gray-600 mb-4">
            Configure your Neo4j connection and load real graph data from your
            backend.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Neo4j URI
              </label>
              <input
                type="text"
                value={connectionForm.uri}
                onChange={(e) => handleConnectionChange("uri", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="neo4j+ssc://your-database.neo4j.io"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Database
              </label>
              <input
                type="text"
                value={connectionForm.database}
                onChange={(e) =>
                  handleConnectionChange("database", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="neo4j"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={connectionForm.userName}
                onChange={(e) =>
                  handleConnectionChange("userName", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="neo4j"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={connectionForm.password}
                onChange={(e) =>
                  handleConnectionChange("password", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Names (JSON array)
            </label>
            <textarea
              value={JSON.stringify(connectionForm.documentNames, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleConnectionChange("documentNames", parsed);
                } catch (err) {
                  // Keep the old value if JSON is invalid
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder='["document1.pdf", "document2.pdf"]'
            />
          </div>

          <button
            onClick={handleLoadBackendData}
            disabled={loading || !connectionForm.password}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? "Connecting to Neo4j..." : "Load Backend Data"}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Graph Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Graph Controls</h2>

          <button
            onClick={handleShowGraph}
            disabled={nodes.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {showGraph
              ? "Hide Graph View"
              : `Open Graph View (${nodes.length} nodes, ${relationships.length} relationships)`}
          </button>

          {nodes.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-sm">
                Data loaded successfully! Click the button above to view the
                graph.
              </p>
            </div>
          )}
        </div>

        {/* Embedded Graph View - Only show when showGraph is true */}
        {showGraph && (
          <EmbeddedGraphView
            nodeValues={nodes}
            relationshipValues={relationships}
            viewPoint="chatInfoView"
          />
        )}

        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium mb-2">Instructions</h3>
          <p className="text-gray-600">
            This is a standalone graph visualization component. First load
            sample data or configure your backend connection and load real data,
            then click "Open Graph View" to see the visualization.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GraphViewer;
