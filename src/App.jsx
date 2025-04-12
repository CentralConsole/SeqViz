import React from "react";
import SeqViewerLinear from "./components/GenomeVisualizer/SeqViewerLinear";
import "./App.css";

function App() {
  return (
    <div className="App">
      <SeqViewerLinear data="/test.json" style={{ flex: 1, height: "100vh" }} />
    </div>
  );
}

export default App;
