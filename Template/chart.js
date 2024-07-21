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

d3.json('../data/human_insulin.json')
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
    
    var i = 1;
    feature.forEach(d => {
        const featureDisplay = featureArea.append('g')
            .attr('id','id',`${"feature"+i}`)
            .attr('class',"feature"); //Create a group for each feature.

        function trimText(i){
            var BBox = document.querySelector(`${'#'+"feature-box"+i}`);
            const maxWidth = BBox.getBBox().width;
            var annotation = document.querySelector(`${'#'+"feature-annotation"+i}`);
            const textWidth = annotation.getBBox().width;
        
            if (textWidth > maxWidth){
                text = annotation.textContent;
                fontSize = parseFloat(window.getComputedStyle(annotation).fontSize);
                console.log(fontSize);
                maxChar = maxWidth / fontSize;
                text = text.substring(0,maxChar);
                console.log(maxChar);
                text = text + "...";
                console.log(text);
                featureDisplay.select(`${'#'+"feature-annotation"+i}`)
                    .text(text);
            }
        } //Trim texts that are too long.

        if (typeGet(d) == 'source'){
            featureDisplay.append('line')
                .attr('id',`${"feature-box"+i}`)
                .attr('class','source')
                .attr('x1',LengthScale(Number(locationGet(d)[0])))
                .attr('y1',0)
                .attr('x2',LengthScale(Number(locationGet(d)[1])))
                .attr('y2',0)
                .style('transform',`translateY(${dms.contentHeight/50}px)`);
            i++;
        }//Display source.
        else if (typeGet(d) == 'operon'){
            featureDisplay.append('line')
                .attr('id',`${"feature-box"+i}`)
                .attr('class','operon')
                .attr('x1',LengthScale(Number(locationGet(d)[0])))
                .attr('y1',0)
                .attr('x2',LengthScale(Number(locationGet(d)[1])))
                .attr('y2',0)
                .style('transform',`translateY(${dms.contentHeight/50*4}px)`);
            
            featureDisplay.append('text')
                .attr('id',`${"feature-annotation"+i}`)
                .attr('class','annotation')
                .attr('x',`${LengthScale((Number(locationGet(d)[0])+Number(locationGet(d)[1]))/2)}`)
                .attr('y',`${dms.contentHeight/50*4 + 3}`)
                .text(`${informationGet(d).operon + '(operon)'}`)
            trimText(i);
            i++;
        }//Display operon.
        else if (typeGet(d) == 'CDS'){
            featureDisplay.append('line')
                .attr('id',`${"feature-box"+i}`)
                .attr('class','cds')
                .attr('x1',LengthScale(Number(locationGet(d)[0])))
                .attr('y1',0)
                .attr('x2',LengthScale(Number(locationGet(d)[1])))
                .attr('y2',0)
                .style('transform',`translateY(${dms.contentHeight/50*8}px)`);

           featureDisplay.append('text')
                .attr('id',`${"feature-annotation"+i}`)
                .attr('class','annotation')
                .attr('x',`${LengthScale((Number(locationGet(d)[0])+Number(locationGet(d)[1]))/2)}`)
                .attr('y',`${dms.contentHeight/50*8 + 3}`)
                .text(`${informationGet(d).product}`)
                //.attr('textLength',`${LengthScale(Number(locationGet(d)[1])-Number(locationGet(d)[0]))}`);
            trimText(i)
            i++;
        }//Display CDS.
        else if (typeGet(d) == 'gene'){
            featureDisplay.append('line')
                .attr('id',`${"feature-box"+i}`)
                .attr('class','gene')
                .attr('x1',LengthScale(Number(locationGet(d)[0])))
                .attr('y1',0)
                .attr('x2',LengthScale(Number(locationGet(d)[1])))
                .attr('y2',0)
                .style('transform',`translateY(${dms.contentHeight/50*12}px)`);

           featureDisplay.append('text')
                .attr('id',`${"feature-annotation"+i}`)
                .attr('class','annotation')
                .attr('x',`${LengthScale((Number(locationGet(d)[0])+Number(locationGet(d)[1]))/2)}`)
                .attr('y',`${dms.contentHeight/50*12 + 3}`)
                .text(`${informationGet(d).gene}`)
                //.attr('textLength',`${LengthScale(Number(locationGet(d)[1])-Number(locationGet(d)[0]))}`);
            trimText(i)
            i++;
        }//Display gene.
        else{
            featureDisplay.append('line')
                .attr('id',`${"feature-box"+i}`)
                .attr('class','others')
                .attr('x1',LengthScale(Number(locationGet(d)[0])))
                .attr('y1',0)
                .attr('x2',LengthScale(Number(locationGet(d)[1])))
                .attr('y2',0)
                .style('transform',`translateY(${dms.contentHeight/50*16}px)`);

            featureDisplay.append('text')
                .attr('id',`${"feature-annotation"+i}`)
                .attr('class','annotation')
                .attr('x',`${LengthScale((Number(locationGet(d)[0])+Number(locationGet(d)[1]))/2)}`)
                .attr('y',`${dms.contentHeight/50*16 + 3}`)
                .text(`${informationGet(d).gene}`)
                //.attr('textLength',`${LengthScale(Number(locationGet(d)[1])-Number(locationGet(d)[0]))}`);
        trimText(i)
        i++;
        }
        
    });


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
}


/*
设定画图板尺寸  dms
设定组件 .append()

导入数据 .json().then(); xGet

设定坐标 .scaleLinear()

画画 .selectAll().data().join()

标注

交互

*/