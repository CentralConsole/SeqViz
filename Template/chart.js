//console.log(d3);
//这个js文件用于可视化基因序列和注释
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

const featureArea = content.append('g')
    .attr('id', 'feature-area');

d3.json('../data/human_insulin.json') //.json文件地址
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
    i = 1;//i is used to attribute the id of the features. IMORTANT!
    var intervals = new Array();
    var occupied = {};
    intervals[0] = [0, 0];
    occupied[row] = intervals;

    var start = 0;
    var end = 0;

    function display(type, location, r, displayBox = true, displayText = true, text = '') {//g for group; r for row;
        const featureDisplay = featureArea.append('g')
            .attr('id', 'id', `${"feature" + i}`)
            .attr('class', "feature");
        //Create a group for each feature.
        let cleanedStr = str => str.replace('>', '').replace('<', '');
        var startStr = location[0][0];
        var endStr = location[location.length - 1].at(-1);
        var start = Number(cleanedStr(startStr));
        var end = Number(cleanedStr(endStr));
        /*
        if (end == start) {
            end = start + 2;
            start = start - 2;
        }
        */
        if (displayBox) {
            j = 1;
            const boxGroup = featureDisplay.append('g')
                .attr('id', `${"feature-box-group"}-${i}`)
                .attr('class', `box-group`);

            boxGroup.append('line')
                .attr('id', `${"feature-bone"}-${i}`)
                .attr('class', `box bone ${type}`)
                .attr('x1', LengthScale(start))
                .attr('y1', 0)
                .attr('x2', LengthScale(end))
                .attr('y2', 0)
                .style('transform', `translateY(${dms.vSpace * r}px)`);

            var locationArray = new Array();

            location.forEach(loc => {
                var BoxStartStr = loc[0];
                var BoxEndStr = loc.at(-1);
                var BoxStart = Number(cleanedStr(BoxStartStr));
                var BoxEnd = Number(cleanedStr(BoxEndStr));
                locationArray.push(BoxStart, BoxEnd);
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

        if (displayText) {
            featureDisplay.append('text')
                .attr('id', `feature-annotation-${i}`)
                .attr('class', 'annotation')
                .attr('x', `${LengthScale((start + end) / 2)}`)
                .attr('y', `${dms.vSpace * r + dms.unit * 0.5}`)
                .text(text);

            var trimmedText = trimText(i);
            featureDisplay.select(`#feature-annotation-${i}`)
                .text(trimmedText);

        }

        var annotation = document.querySelector(`#feature-annotation-${i}`);

        featureDisplay.on("mouseover", function () {
            if (annotation) {
                const textWidth = annotation.getBBox().width;
                d3.select(this).raise();
                d3.select(this).append('line')//Background of annotation text.
                    .attr('id', `annotation-bg-${i}`)
                    .attr('class', `annotationg-bg`)
                    .attr('x1', `${LengthScale((start + end) / 2) - textWidth*1.5 / 2}`)
                    .attr('y1', 0)
                    .attr('x2', `${LengthScale((start + end) / 2) + textWidth*1.5 / 2}`)
                    .attr('y2', 0)
                    .style('transform', `translateY(${dms.vSpace * r}px)`)
                    .style('stroke-linecap', 'round')
                    .style('stroke-width', dms.boxHeight);

                d3.select(this).select('.annotation')//Display FULL annotation text.
                    .text(text)
                    .raise();
            }

            locationArray.forEach(d => {
                const locationVis = d3.select(this).append('g')
                    .attr('class', 'location');

                locationVis.append('line')
                    .attr('class', 'location-mark')
                    .attr('x1', LengthScale(d))
                    .attr('y1', 0)
                    .attr('x2', LengthScale(d))
                    .attr('y2', 6);
                
                const formatNum = d3.format(",");

                locationVis.append('text')
                    .attr('class', 'location-text')
                    .attr('x', LengthScale(d))
                    .attr('y', 18)
                    .text(formatNum(d));        
            })
        })

        featureDisplay.on("mouseout", function () {
            d3.select(this).lower();
            d3.select(this).select('.annotation').text(trimmedText);
            d3.select(this).select(`#annotation-bg-${i}`)
                .remove();
            d3.select(this).selectAll(`.location`).remove();
        })

        i++;
    }

    feature.forEach(d => {
        var row = 1;
        const location = locationGet(d);
        let cleanedStr = str => str.replace('>', '').replace('<', '');
        var startStr = location[0][0];
        var endStr = location[location.length - 1].at(-1);
        var start = Number(cleanedStr(startStr));
        var end = Number(cleanedStr(endStr));
        interval = [start, end];
        while (checkOccupation(row, interval, occupied)) {
            row++;
        }
        occupied[row].push(interval);
        if (typeGet(d) == 'source') {
            display(type = 'source', location, r = row, displayBox = false, displayText = false);
        }//Display source.
        else if (typeGet(d) == 'operon') {
            var annotationText = `${informationGet(d).operon} (operon)`;
            display(type = 'operon', location, r = row, displayBox = true, displayText = true, text = annotationText);
        }//Display operon.
        else if (typeGet(d) == 'CDS') {
            var annotationText = `${informationGet(d).product}`;
            display(type = 'CDS', location, r = row, displayBox = true, displayText = true, text = annotationText);
        }//Display CDS.
        else if (typeGet(d) == 'gene') {
            var annotationText = `${informationGet(d).gene}`;
            display(type = 'gene', location, r = row, displayBox = true, displayText = true, text = annotationText);
        }//Display gene.
        else if (typeGet(d) == 'exon') {
            var annotationText = `${typeGet(d)}`;
            display(type = 'exon', location, r = row, displayBox = true, displayText = true, text = annotationText);
        }//Display gene.
        else if (typeGet(d) == 'intron') {
            var annotationText = `${typeGet(d)}`;
            display(type = 'intron', location, r = row, displayBox = true, displayText = true, text = annotationText);
        }//Display gene
        else if (typeGet(d) == 'misc_feature') {
            var annotationText = `${informationGet(d).note}`;
            display(type = 'misc_feature', location, r = row, displayBox = true, displayText = true, text = annotationText);
        }//Display gene.
        else if (typeGet(d) == 'STS') {
            var annotationText = `STS ${informationGet(d).standard_name}`;
            display(type = 'misc_feature', location, r = row, displayBox = true, displayText = true, text = annotationText);
        }//Display gene.
        else if (typeGet(d) == 'variation') {
            var annotationText = `${typeGet(d)}`;
            display(type = 'variation', location, r = row, displayBox = true, displayText = false);
            i++;
        }
        else if (typeGet(d) == 'gap') {
            var annotationText = `${typeGet(d)}`;
            display(type = 'gap', location, r = 0, displayBox = true, displayText = true, text = annotationText);
            i++;
        }
        else {
            var annotationText = `${typeGet(d)}`;
            display(type = 'others', location, r = row, displayBox = true, displayText = true, text = annotationText);
            i++;
        }
    });
    beautify(featureArea);

}



function trimText(i) {
    var BBox = document.querySelector(`#feature-box-group-${i}`);
    const maxWidth = BBox.getBBox().width;

    var annotation = document.querySelector(`#feature-annotation-${i}`);
    const textWidth = annotation.getBBox().width;
    //console.log(`maxWidth: ${maxWidth}, textWidth: ${maxWidth}`);
    if (textWidth > maxWidth) {
        text = annotation.textContent;
        fontSize = dms.fontSize;
        maxChar = maxWidth / fontSize;
        text = text.substring(0, maxChar);
        //console.log(maxChar);
        text = text + "..";
        console.log(text);
    }
    return text
} //Trim texts that are too long.

function beautify(element) {
    element.selectAll('.box')
        .style('stroke-linecap', 'butt')
        .style('stroke-width', dms.boxHeight);

    element.selectAll('.bone')
        .style('opacity', 0.5)
        .style('stroke-linecap', 'butt')
        .style('stroke-width', dms.boxHeight / 2)
        .style('stroke-dasharray', '3, 5');

    element.selectAll('.annotation')
        .style('font-size', dms.fontSize);

    element.selectAll('.gap')
        .style('stroke-linecap', 'butt')
        .style('stroke-width', dms.boxHeight / 2);

    element.selectAll('.variation')
        .style('stroke-linecap', 'round')
        .style('stroke-width', dms.boxHeight/5);
        
}

function compareNumbers(a, b) {
    return a - b;
}

function checkOccupation(row, interval, occupied) {
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