import React from "react";
import GenomeViewer from "./components/GenomeVisualizer/GenomeViewer";
import "./App.css";

function App() {
  return (
    <div className="App">
      <GenomeViewer data="/test.json" style={{ flex: 1, height: "100vh" }} />
    </div>
  );
}

export default App;
