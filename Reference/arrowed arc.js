// 1. 构造圆弧生成器
const arcGen = d3.arc()
  .innerRadius(60)
  .outerRadius(60)   // 想要一条“线”就把内外半径设成一样
  .startAngle(0)
  .endAngle(Math.PI * 0.7);

// 2. 计算圆弧末端的位置和方向
const endAngle   = Math.PI * 0.7;
const radius     = 60;
const [x, y]     = [Math.cos(endAngle) * radius, Math.sin(endAngle) * radius]; // 圆弧终点
const tangentAng = endAngle + Math.PI / 2;                                      // 切线方向（垂直于半径）

// 3. 根据切线方向计算箭头三角形
const arrowLen  = 10;  // 箭头长度
const arrowHalf = 4;   // 箭头宽度的一半
const tip       = [x + Math.cos(tangentAng) * arrowLen,
                   y + Math.sin(tangentAng) * arrowLen];
const left      = [x - Math.sin(tangentAng) * arrowHalf,
                   y + Math.cos(tangentAng) * arrowHalf];
const right     = [x + Math.sin(tangentAng) * arrowHalf,
                   y - Math.cos(tangentAng) * arrowHalf];

// 4. 合并路径
const arcPath   = arcGen();                               // d3 生成的圆弧
const arrowPath = [
  'M', left,                     // 从圆弧末端到箭头左下
  'L', tip,                      // 到箭头尖端
  'L', right,                    // 到箭头右下
  'Z'                            // 闭合三角形
].join(' ');

const fullPath = `${arcPath} ${arrowPath}`;               // 直接拼在一起即可

// 5. 绘制
svg.append('path')
   .attr('d', fullPath)
   .attr('fill', 'steelblue')
   .attr('stroke', 'black')
   .attr('stroke-width', 1)
   .attr('transform', 'translate(150,150)');   // 平移到画布中央