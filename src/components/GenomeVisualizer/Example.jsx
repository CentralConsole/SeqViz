import React, { useEffect, useState } from "react";
import GenomeVisualizer from "./GenomeVisualizer";

const Example = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    // 使用 fetch 加载 JSON 文件
    fetch("/test.json")
      .then((response) => response.json())
      .then((json) => {
        setData(json);
      })
      .catch((error) => {
        console.error("Error loading JSON:", error);
      });
  }, []);

  if (!data) {
    return <div>加载中...</div>;
  }

  return (
    <div style={{ width: "100%", height: "600px", padding: "20px" }}>
      <h1>基因组可视化示例</h1>
      <p>这是一个示例，展示了人类线粒体基因组的可视化。</p>
      <GenomeVisualizer data={data} width={800} height={400} />
    </div>
  );
};

export default Example;
