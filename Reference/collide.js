// 设置画布高度等于宽度
const height = width;
// 创建颜色比例尺，使用Tableau 10色板
const color = d3.scaleOrdinal(d3.schemeTableau10);
// 创建2D画布上下文
const context = DOM.context2d(width, height);
// 将输入数据转换为节点对象
const nodes = data.map(Object.create);

// 创建力导向模拟器
const simulation = d3
  .forceSimulation(nodes)
  .alphaTarget(0.3) // 保持模拟活跃，使图形持续运动
  .velocityDecay(0.1) // 设置低摩擦系数，使节点移动更流畅
  .force("x", d3.forceX().strength(0.01)) // 添加X轴方向的中心力
  .force("y", d3.forceY().strength(0.01)) // 添加Y轴方向的中心力
  .force(
    "collide",
    d3
      .forceCollide()
      .radius((d) => d.r + 1) // 设置碰撞检测半径
      .iterations(3) // 设置碰撞检测迭代次数
  )
  .force(
    "charge",
    d3.forceManyBody().strength((d, i) => (i ? 0 : (-width * 2) / 3)) // 设置节点间斥力，第一个节点特别强
  )
  .on("tick", ticked); // 每帧更新时调用ticked函数

// 添加事件监听器
d3.select(context.canvas)
  .on("touchmove", (event) => event.preventDefault()) // 阻止触摸事件的默认行为
  .on("pointermove", pointermoved); // 处理指针移动事件

// 当模拟器失效时停止
invalidation.then(() => simulation.stop());

// 处理指针移动事件
function pointermoved(event) {
  const [x, y] = d3.pointer(event); // 获取指针位置
  nodes[0].fx = x - width / 2; // 更新第一个节点的X坐标
  nodes[0].fy = y - height / 2; // 更新第一个节点的Y坐标
}

// 渲染函数，在每一帧更新时调用
function ticked() {
  // 清除画布
  context.clearRect(0, 0, width, height);
  // 保存当前绘图状态
  context.save();
  // 将坐标系原点移到画布中心
  context.translate(width / 2, height / 2);

  // 绘制所有节点（除了第一个节点）
  for (let i = 1; i < nodes.length; ++i) {
    const d = nodes[i];
    // 开始绘制路径
    context.beginPath();
    // 移动到节点边缘
    context.moveTo(d.x + d.r, d.y);
    // 绘制圆形节点
    context.arc(d.x, d.y, d.r, 0, 2 * Math.PI);
    // 设置填充颜色
    context.fillStyle = color(d.group);
    // 填充节点
    context.fill();
  }
  // 恢复绘图状态
  context.restore();
}

// 返回画布元素
return context.canvas;
