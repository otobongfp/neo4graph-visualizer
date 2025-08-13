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
  const [newFileName, setNewFileName] = useState("");

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

  const handleAddFile = () => {
    if (
      newFileName.trim() &&
      !connectionForm.documentNames.includes(newFileName.trim())
    ) {
      setConnectionForm((prev) => ({
        ...prev,
        documentNames: [...prev.documentNames, newFileName.trim()],
      }));
      setNewFileName("");
    }
  };

  const handleRemoveFile = (index: number) => {
    setConnectionForm((prev) => ({
      ...prev,
      documentNames: prev.documentNames.filter((_, i) => i !== index),
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddFile();
    }
  };

  const handleClearAllFiles = () => {
    setConnectionForm((prev) => ({
      ...prev,
      documentNames: [],
    }));
  };

  const handleAddSampleFiles = () => {
    const sampleFiles = [
      "Apple stock during pandemic.pdf",
      "Market analysis report.pdf",
      "Financial statements Q4.pdf",
      "Investment portfolio.pdf",
    ];
    setConnectionForm((prev) => ({
      ...prev,
      documentNames: [...new Set([...prev.documentNames, ...sampleFiles])],
    }));
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Files
            </label>

            {/* File List */}
            <div className="mb-3">
              {connectionForm.documentNames.length > 0 ? (
                <div className="space-y-2">
                  {connectionForm.documentNames.map((fileName, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center">
                        <svg
                          className="w-5 h-5 text-gray-400 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">
                          {fileName}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Remove file"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p>No files added yet</p>
                  <p className="text-sm">
                    Add files below to include them in the graph
                  </p>
                </div>
              )}
            </div>

            {/* Add File Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter file name (e.g., document1.pdf)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddFile}
                disabled={
                  !newFileName.trim() ||
                  connectionForm.documentNames.includes(newFileName.trim())
                }
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors"
              >
                Add
              </button>
            </div>

            {/* File Count */}
            <div className="mt-2 text-sm text-gray-600">
              {connectionForm.documentNames.length} file
              {connectionForm.documentNames.length !== 1 ? "s" : ""} selected
            </div>

            {/* Bulk Operations */}
            {connectionForm.documentNames.length > 0 && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleClearAllFiles}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-200 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={handleAddSampleFiles}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 transition-colors"
                >
                  Add Sample Files
                </button>
              </div>
            )}
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
