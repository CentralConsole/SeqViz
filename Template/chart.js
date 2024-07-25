//console.log(d3);

let w = window.innerWidth;
let h = window.innerHeight;
const dms = {
    width: w,
    height: h,
    margin: {
        top: 0.1 * h,
        bottom: 0.1 * h,
        right: 0.1 * w,
        left: 0.1 * w
    }
};
//"dms" for dimensions

dms.contentWidth = dms.width - dms.margin.left - dms.margin.right;
dms.contentHeight = dms.height - dms.margin.top - dms.margin.bottom;
dms.unit = dms.contentHeight / 100;
dms.boxHeight = dms.unit * 3;
dms.vSpace = dms.boxHeight * 2;
dms.fontSize = dms.boxHeight * 0.8;
//set basic constant values
const box = d3.select('#box-div').append('svg')
    .attr('id', 'box')
    .attr('width', dms.width)
    .attr('height', dms.height)

const content = box.append('g')
    .attr('id', 'content')
    .style('transform', `translate(${dms.margin.left}px, ${dms.margin.top}px)`);
//"g" for group. A group does not have a width or a height. However, it should be centered.

//The lines above can be reused.
const axis = content.append('g')
    .attr('id', 'axis');
//.style('transform',`translateY(${dms.contentHeight/2}px)`);

const featureArea = content.append('g')
    .attr('id', 'feature-area');
//.style('transform',`translateY(${dms.contentHeight/2}px)`);

d3.json('../data/human_mito.json')
    .then(drawLinear);

function drawLinear(dataset) {
    //console.log(dataset);
    //Test if the dataset is successfully read.

    const parselocus = d => d.split(/\s+/);
    const locusGet = d => parselocus(d.locus);

    const featureGet = d => d.features;
    const feature = featureGet(dataset);

    const typeGet = d => d.type;
    const locationGet = d => d.location;
    const informationGet = d => d.information;

    const totalLength = locusGet(dataset)[1];
    //console.log(totalLength);

    const LengthScale = d3.scaleLinear()
        .domain([0, totalLength])
        .range([0, dms.contentWidth]);

    const AxisGen = d3.axisTop()
        .scale(LengthScale)
        .ticks(7);

    axis.call(AxisGen);
    axis.selectAll('text')
        .style("font-size", dms.fontSize);

    var row = 1;
    var i = 1;//i is used to attribute the id of the features. IMORTANT!
    var intervals = new Array();
    var occupied = {};
    intervals[0] = [0,0];
    occupied[row] = intervals;
    //console.log(`intervals:${intervals[1][1]}`);

    var start = 0;
    var end = 0;

    function display(g, type, location, r, displayBox='true',displayText='true', text=''){//g for group; r for row;
        let cleanedStr = str=>str.replace('>', '').replace('<', '');
        var startStr = location[0][0];
        var endStr = location[location.length - 1].at(-1);
        var start = Number(cleanedStr(startStr));
        var end = Number(cleanedStr(endStr));
        if (end == start){
            end = start + 2;
            start = start -2;
        }
        
        if (displayBox){
            j = 1;
            const boxGroup = g.append('g')
                .attr('id', `${"feature-box"}${i}`)
                .attr('class', `box-group`);
            
            boxGroup.append('line')
                .attr('id', `${"feature-bone"}${i}`)
                .attr('class', `box bone ${type}`)
                .attr('x1', LengthScale(start))
                .attr('y1', 0)
                .attr('x2', LengthScale(end))
                .attr('y2', 0)
                .style('transform', `translateY(${dms.vSpace * r}px)`);

            location.forEach(loc=>{
                var BoxStartStr = loc[0];
                var BoxEndStr = loc.at(-1);
                var BoxStart = Number(cleanedStr(BoxStartStr));
                var BoxEnd = Number(cleanedStr(BoxEndStr));
                boxGroup.append('line')
                .attr('id', `${"feature-box"}${i}-${j}`)
                .attr('class', `box ${type}`)
                .attr('x1', LengthScale(BoxStart))
                .attr('y1', 0)
                .attr('x2', LengthScale(BoxEnd))
                .attr('y2', 0)
                .style('transform', `translateY(${dms.vSpace * r}px)`);
                j++;
            })
        }
        if (displayText){
            g.append('text')
            .attr('id', `${"feature-annotation" + i}`)
            .attr('class', 'annotation')
            .attr('x', `${LengthScale((start + end) / 2)}`)
            .attr('y', `${dms.vSpace * r + dms.unit * 0.5}`)
            .text(text)
            trimText(g, i);
        }
    i++;
    }

    feature.forEach(d => {
        var row = 1;
        const location = locationGet(d);
        let cleanedStr = str=>str.replace('>', '').replace('<', '');
        var startStr = location[0][0];
        var endStr = location[location.length - 1].at(-1);
        var start = Number(cleanedStr(startStr));
        var end = Number(cleanedStr(endStr));
        interval = [start, end];
        //console.log(`type: ${typeGet(d)}, location: ${interval}`);
        while (checkOccupation(row, interval, occupied)) {
            row++;
        }
        occupied[row].push(interval);

        const featureDisplay = featureArea.append('g')
            .attr('id', 'id', `${"feature" + i}`)
            .attr('class', "feature"); //Create a group for each feature.

        if (typeGet(d) == 'source') {
            display(g=featureDisplay, type='source', location, r=row, displayBox='true',displayText='false');
        }//Display source.
        else if (typeGet(d) == 'operon') {
            var annotationText = `${informationGet(d).operon} (operon)`;
            display(g=featureDisplay, type='operon', location, r=row, displayBox='true',displayText='true', text=annotationText);
        }//Display operon.
        else if (typeGet(d) == 'CDS') {
            var annotationText = `${informationGet(d).product}`;
            display(g=featureDisplay, type='CDS', location, r=row, displayBox='true',displayText='true', text=annotationText);
        }//Display CDS.
        else if (typeGet(d) == 'gene') {
            var annotationText = `${informationGet(d).gene}`;
            display(g=featureDisplay, type='gene', location, r=row, displayBox='true',displayText='true', text=annotationText);
        }//Display gene.
        else if (typeGet(d) == 'exon') {
            var annotationText = `${typeGet(d)}`;
            display(g=featureDisplay, type='exon', location, r=row, displayBox='true',displayText='true', text=annotationText);
        }//Display gene.
        else if (typeGet(d) == 'intron') {
            var annotationText = `${typeGet(d)}`;
            display(g=featureDisplay, type='intron', location, r=row, displayBox='true',displayText='true', text=annotationText);
        }//Display gene
        else if (typeGet(d) == 'misc_feature') {
            var annotationText = `${informationGet(d).note}`;
            display(g=featureDisplay, type='misc_feature', location, r=row, displayBox='true',displayText='true', text=annotationText);
        }//Display gene.
        else if (typeGet(d) == 'STS') {
            var annotationText = `${informationGet(d).standard_name}(STS)`;
            display(g=featureDisplay, type='misc_feature', location, r=row, displayBox='true',displayText='true', text=annotationText);
        }//Display gene.
        else if (typeGet(d) == 'variation'){
            display(g=featureDisplay, type='variation', location, r=row, displayBox='true',displayText='false');
            i++;
        }
        else if (typeGet(d) == 'gap'){
            display(g=featureDisplay, type='gap', location, r=0, displayBox='true',displayText='false');
            i++;
        }
        else {
            var annotationText = `${typeGet(d)}`;
            display(g=featureDisplay, type='others', location, r=row, displayBox='true',displayText='true', text=annotationText);
        }
    });
    beautify(featureArea);
    //console.log(occupied[2]);
}



function trimText(element, i) {
    var BBox = document.querySelector(`#${"feature-box"}${i}`);
    const maxWidth = BBox.getBBox().width;
    var annotation = document.querySelector(`${'#' + "feature-annotation" + i}`);
    const textWidth = annotation.getBBox().width;

    if (textWidth > maxWidth) {
        text = annotation.textContent;
        fontSize = dms.fontSize;
        maxChar = maxWidth / fontSize;
        text = text.substring(0, maxChar);
        //console.log(maxChar);
        text = text + "...";
        //console.log(text);
        element.select(`${'#' + "feature-annotation" + i}`)
            .text(text);
    }
} //Trim texts that are too long.

function beautify(element) {
    element.selectAll('.box')
        .style('stroke-linecap', 'butt')
        .style('stroke-width', dms.boxHeight);
    
    element.selectAll('.bone')
        .style('opacity',0.5)
        .style('stroke-linecap', 'butt')
        .style('stroke-dasharray', '3, 5');

    element.selectAll('.annotation')
        .style('font-size', dms.fontSize);
}

function compareNumbers(a, b) {
    return a - b;
  }

function checkOccupation(row, interval, occupied){
    //interval.sort(compareNumbers);
    console.log(`row:${row}`);
    intervalStart = interval[0];
    intervalEnd = interval[1];
    //console.log(`intervalStart, intervalEnd: ${intervalStart}, ${intervalEnd}`);
    if (!Array.isArray(occupied[row])) {
        occupied[row] = [];
    }
    for (let element of occupied[row]) {
        let occupiedStart = element[0];
        let occupiedEnd = element[1];
        //console.log(`occupiedStart, occupiedEnd: ${occupiedStart}, ${occupiedEnd}`);
        if ((intervalStart >= occupiedStart && intervalStart < occupiedEnd) ||
            (intervalEnd > occupiedStart && intervalEnd <= occupiedEnd)) {
            return true;
        }
    }
    return false;
}

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