console.log(d3);

const dms = {
    width: 1000,
    height: 500,
    margin: {
        top: 50,
        right: 100,
        bottom: 50,
        left: 100
    }
};
//"dms" for dimensions

dms.contentWidth = dms.width - dms.margin.left - dms.margin.right;
dms.contentHeight = dms.height - dms.margin.top - dms.margin.bottom;
dms.unit = dms.contentHeight / 100;
dms.boxHeight =  dms.unit * 2;
dms.vSpace = dms.unit * 2;
dms.fontSize = dms.unit * 2;
//set basic constant values
const box = d3.select('#box-div').append('svg')
    .attr('id', 'box')
    .attr('width',dms.width)
    .attr('height',dms.height)

const content = box.append('g')
    .attr('id', 'content')
    .style('transform', `translate(${dms.margin.left}px, ${dms.margin.top}px)`);
//"g" for group. A group does not have a width or a height. However, it should be centered.

//The lines above can be reused.
const axis = content.append('g')
    .attr('id','axis');
    //.style('transform',`translateY(${dms.contentHeight/2}px)`);

const featureArea = content.append('g')
    .attr('id','feature-area');
    //.style('transform',`translateY(${dms.contentHeight/2}px)`);

d3.json('../data/lac_operon_new.json')
    .then(drawLinear);

function drawLinear(dataset){
    console.log(dataset);
    //Test if the dataset is successfully read.

    const parselocus = d => d.split(/\s+/);
    const locusGet = d => parselocus(d.locus);

    const featureGet = d => d.features;
    const feature = featureGet(dataset);
    
    const typeGet = d => d.type;
    const locationGet = d => d.location;
    const informationGet = d => d.information;

    const totalLength = locusGet(dataset)[1];
    console.log(totalLength);
    
    const LengthScale = d3.scaleLinear()
        .domain([0,totalLength])
        .range([0,dms.contentWidth]);
    
    const AxisGen=d3.axisTop()
        .scale(LengthScale)
        .ticks(7);
    
    axis.call(AxisGen);
    axis.selectAll('text')
        .style("font-size",dms.fontSize);
    
    
    var i = 1;//i is used to attribute the id of the features. IMORTANT!
    var occupied = new Array();
    var row = 1;

    feature.forEach(d => {
        const start = Number(locationGet(d)[0]);
        const end = Number(locationGet(d)[1]);
        const interval = [start,end];
        occupied.push(interval);
        occupied = merge(occupied);
        const featureDisplay = featureArea.append('g')
            .attr('id','id',`${"feature"+i}`)
            .attr('class',"feature"); //Create a group for each feature.

        if (typeGet(d) == 'source'){
            featureDisplay.append('line')
                .attr('id',`${"feature-box"+i}`)
                .attr('class','box source')
                .attr('x1',LengthScale(start))
                .attr('y1',0)
                .attr('x2',LengthScale(end))
                .attr('y2',0)
                .style('transform',`translateY(${dms.vSpace}px)`);
            i++;
        }//Display source.
        else if (typeGet(d) == 'operon'){
            featureDisplay.append('line')
                .attr('id',`${"feature-box"+i}`)
                .attr('class','box operon')
                .attr('x1',LengthScale(start))
                .attr('y1',0)
                .attr('x2',LengthScale(end))
                .attr('y2',0)
                .style('transform',`translateY(${dms.vSpace * 3}px)`);
            
            featureDisplay.append('text')
                .attr('id',`${"feature-annotation"+i}`)
                .attr('class','annotation')
                .attr('x',`${LengthScale((start+end)/2)}`)
                .attr('y',`${dms.vSpace * 3 + dms.unit * 0.5}`)
                .text(`${informationGet(d).operon + '(operon)'}`)
            trimText(featureDisplay,i);
            i++;
        }//Display operon.
        else if (typeGet(d) == 'CDS'){
            featureDisplay.append('line')
                .attr('id',`${"feature-box"+i}`)
                .attr('class','box cds')
                .attr('x1',LengthScale(start))
                .attr('y1',0)
                .attr('x2',LengthScale(end))
                .attr('y2',0)
                .style('transform',`translateY(${dms.vSpace * 5}px)`);

           featureDisplay.append('text')
                .attr('id',`${"feature-annotation"+i}`)
                .attr('class','box annotation')
                .attr('x',`${LengthScale((start+end)/2)}`)
                .attr('y',`${dms.vSpace * 5 + dms.unit * 0.5}`)
                .text(`${informationGet(d).product}`)
                //.attr('textLength',`${LengthScale(end-start)}`);
            trimText(featureDisplay,i);
            i++;
        }//Display CDS.
        else if (typeGet(d) == 'gene'){
            featureDisplay.append('line')
                .attr('id',`${"feature-box"+i}`)
                .attr('class','box gene')
                .attr('x1',LengthScale(start))
                .attr('y1',0)
                .attr('x2',LengthScale(end))
                .attr('y2',0)
                .style('transform',`translateY(${dms.vSpace * 7}px)`);

           featureDisplay.append('text')
                .attr('id',`${"feature-annotation"+i}`)
                .attr('class','box annotation')
                .attr('x',`${LengthScale((start+end)/2)}`)
                .attr('y',`${dms.vSpace * 7 + dms.unit * 0.5}`)
                .text(`${informationGet(d).gene}`);
            trimText(featureDisplay,i);
            i++;
        }//Display gene.
        else{
            featureDisplay.append('line')
                .attr('id',`${"feature-box"+i}`)
                .attr('class','box  others')
                .attr('x1',LengthScale(start))
                .attr('y1',0)
                .attr('x2',LengthScale(end))
                .attr('y2',0)
                .style('transform',`translateY(${dms.unit * 20}px)`);

            featureDisplay.append('text')
                .attr('id',`${"feature-annotation"+i}`)
                .attr('class','annotation')
                .attr('x',`${LengthScale((start+end)/2)}`)
                .attr('y',`${dms.unit * 20 + dms.unit * 0.5}`)
                .text(`${informationGet(d).gene}`);
            trimText(featureDisplay,i);
            i++;
        }
    });
    beautify(featureArea);
    console.log(occupied);
}

function trimText(element,i){
    var BBox = document.querySelector(`${'#'+"feature-box"+i}`);
    const maxWidth = BBox.getBBox().width * 1.5;
    var annotation = document.querySelector(`${'#'+"feature-annotation"+i}`);
    const textWidth = annotation.getBBox().width;

    if (textWidth > maxWidth){
        text = annotation.textContent;
        fontSize = dms.fontSize;
        maxChar = maxWidth / fontSize;
        text = text.substring(0,maxChar);
        console.log(maxChar);
        text = text + "...";
        console.log(text);
        element.select(`${'#'+"feature-annotation"+i}`)
            .text(text);
    }
} //Trim texts that are too long.

function beautify(element){
    element.selectAll('.box')
        .style('stroke-width',dms.boxHeight);

    element.selectAll('.annotation')
        .style('font-size',dms.fontSize);
}

function merge(intervals) {
    if (intervals.length < 2) return intervals
    intervals.sort((a, b) => a[0] - b[0])  //先进行排序
    let curr = intervals[0]  //存储数组内的一个集合
    let result = []
    for (let interval of intervals) {
        if (curr[1] >= interval[0]) {
            curr[1] = Math.max(curr[1], interval[1])
        } else {
            result.push(curr)
            curr = interval
        }
    }
    if (curr.length !== 0) {
        result.push(curr)
    }
    return result
};

    /*
    featureArea.selectAll('line')
        .data(featureGet(dataset))
        .join('line')
        .attr('x1',d=>LengthScale(Number(locationGet(d)[0])))
        .attr('y1',0)
        .attr('x2',d=>LengthScale(Number(locationGet(d)[1])))
        .attr('y2',0)
        .style('transform',`translateY(${dms.contentHeight/2 * Math.random()}px)`);
    */



/*
设定画图板尺寸  dms
设定组件 .append()

导入数据 .json().then(); xGet

设定坐标 .scaleLinear()

画画 .selectAll().data().join()

标注

交互

*/