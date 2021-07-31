var svg;
var xScale, yScale;
var g;
var width, height;
var line, clip, brush;
var idleTimeout;
var tooltipFocus;
var bisectDate, formatValue, dateFormatter;
var currentIndex = 0;
var country = "";

// Features of the annotation
var annotations = [
    {
        note: {
            label: "Recorded the highest cases per day",
            title: "Peak Point"
        },
        id: 'annot2',
        type: d3.annotationCalloutCircle,
        subject: {
            radius: 20,         // circle radius
            radiusPadding: 20   // white space around circle befor connector
        },
        connector: {
            end: "arrow",        // none, or arrow or dot
            type: "line",       // Line or curve
            points: 3,           // Number of break in the curve
            lineType: "horizontal"
        },
        x: 1210,
        y: 20,
        dy: 200,
        dx: -100
    }
]

function createBaseGraph() {
    // set the dimensions and margins of the graph
    margin = { top: 10, right: 30, bottom: 30, left: 60 },
        width = 1500 - margin.left - margin.right,
        height = 850 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    svg = d3.select("#my-svg")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

}

function initGraph() {
    currentIndex = 1;
    createBaseGraph();
    bindDataToGraph(1,"india.csv");
    activateSlide();
    setTitle(1,"India");
}

function activateSlide(){
    let activeElement = document.getElementById(currentIndex);
    activeElement.classList.add("active");
    for(let i=0;i<3;i++){
        let btnIndex = i + 1;
        if(currentIndex !== btnIndex){
            let inactiveElement = document.getElementById(btnIndex);
            inactiveElement.classList.remove("active");
        }
    }
    handleNextPrev();
}

function handleNextPrev(){
    let prevElement = document.getElementById('prev');
    let nextElement = document.getElementById('next');
    if(currentIndex === 1) {
        prevElement.classList.add("inactive");
        nextElement.classList.remove("inactive");
    } else if(currentIndex === 3) {
        nextElement.classList.add("inactive");
        prevElement.classList.remove("inactive");
    }
    else{
        prevElement.classList.remove("inactive");
        nextElement.classList.remove("inactive");
    }
}

function updateAnnotation(countryCode,data){
    let maxPoint = Math.max(...data.map(data => data.value));
    let position = { x: 0, y: 0, dy: 0, dx: 0 };
    switch (countryCode) {
        case 'india.csv':
            position = { x: 1210, y: 15, dy: 200, dx: -100 };
            break;
        case 'usa.csv':
            position = { x: 890, y: 15, dy: 200, dx: -100 };
            break;
        case 'brazil.csv':
            position = { x: 1335, y: 15, dy: 70, dx: -100 };
            break;
    }
    annotations[0] = {...annotations[0],x: position.x, y: position.y, dx: position.dx, dy: position.dy};
    return annotations;
}

function clearGraph() {
    svg.selectAll("*").remove();
}

function bindDataToGraph(visualType,fileName) {

    //Read the data
    d3.csv(fileName,

        // When reading the csv, I must format variables:
        function (data) {
            return { date: d3.timeParse("%Y-%m-%d")(data.date), value: data.value }
        },

        // Now I can use this dataset:
        function (data) {
            initAxis(data);
            addClip();
            drawLine(data);
            if(visualType === 1){
                addTooltip(data);
                animateLine();
                annotations =  updateAnnotation(fileName,data);
                setTimeout(() => {
                    addAnnotations();
                },1000);
            }
            addBrush();
            resetBrushEvent(data);
        });
}

function addAnnotations() {
    // Add annotation to the chart
    const makeAnnotations = d3.annotation().annotations(annotations);
    svg.append("g")
        .call(makeAnnotations)
}

function addClip() {
    // Add a clipPath: everything out of this area won't be drawn.
    clip = svg.append("defs").append("svg:clipPath")
        .attr("id", "clip")
        .append("svg:rect")
        .attr("width", width)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 0);
}

function drawLine(data) {
    // Create the line variable: where both the line and the brush take place
    line = svg.append('g')
        .attr("clip-path", "url(#clip)")

    // Add the line
    line.append("path")
        .datum(data)
        .attr("class", "line")  // I add the class line to be able to modify this line later on.
        .attr("fill", "none")
        .attr("d", d3.line()
            .x(function (d) { return xScale(d.date) })
            .y(function (d) { return yScale(d.value) })
        )
}

function initAxis(data) {
    initXAxis(data);
    initYAxis(data);
}

// Add X axis
function initXAxis(data) {
    xScale = d3.scaleTime()
        .domain(d3.extent(data, function (d) { return d.date; }))
        .range([0, width]);
    xAxis = svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale));
}

// Add Y axis
function initYAxis(data) {
    yScale = d3.scaleLinear()
        .domain([0, d3.max(data, function (d) { return +d.value; })])
        .range([height, 0]);
    yAxis = svg.append("g")
        .call(d3.axisLeft(yScale));
}

// Add brushing
function addBrush() {
    brush = d3.brushX()                   // Add the brush feature using the d3.brush function
        .extent([[0, 0], [width, height]])  // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
        .on("end", updateChart)               // Each time the brush selection changes, trigger the 'updateChart' function

    line
        .append("g")
        .attr("class", "brush")
        .call(brush);
}

// If user double click, reinitialize the chart
function resetBrushEvent(data) {
    svg.on("dblclick", function () {
        xScale.domain(d3.extent(data, function (d) { return d.date; }))
        xAxis.transition().call(d3.axisBottom(xScale))
        line
            .select('.line')
            .transition()
            .attr("d", d3.line()
                .x(function (d) { return xScale(d.date) })
                .y(function (d) { return yScale(d.value) })
            )
    });
}

function animateLine() {
    let totalLength = svg.select('.line').node().getTotalLength();

    svg.select('.line')
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition() // Call Transition Method
        .duration(3000) // Set Duration timing (ms)
        .ease(d3.easeLinear) // Set Easing option
        .attr("stroke-dashoffset", 0);
}

function addTooltip(data) {
    bisectDate = d3.bisector(function (d) { return d.date; }).left;
    formatValue = d3.format(",");
    dateFormatter = d3.timeFormat("%m/%d/%y");
    tooltipFocus = svg.append("g")
        .attr("class", "focus")
        .style("display", "none");

    tooltipFocus.append("circle")
        .attr("r", 5);

    tooltipFocus.append("rect")
        .attr("class", "tooltip")
        .attr("width", 100)
        .attr("height", 50)
        .attr("x", 10)
        .attr("y", -22)
        .attr("rx", 4)
        .attr("ry", 4);

    tooltipFocus.append("text")
        .attr("class", "tooltip-date")
        .attr("x", 18)
        .attr("y", -2);

    tooltipFocus.append("text")
        .attr("x", 18)
        .attr("y", 18)
        .text("Cases: ");

    tooltipFocus.append("text")
        .attr("class", "tooltip-likes")
        .attr("x", 60)
        .attr("y", 18);

    svg.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", function () { tooltipFocus.style("display", null); })
        .on("mouseout", function () { tooltipFocus.style("display", "none"); })
        .on("mousemove", mousemove);

    function mousemove() {
        var x0 = xScale.invert(d3.mouse(this)[0]),
            i = bisectDate(data, x0, 1),
            d0 = data[i - 1],
            d1 = data[i],
            d = x0 - d0.date > d1.date - x0 ? d1 : d0;
        tooltipFocus.attr("transform", "translate(" + xScale(d.date) + "," + yScale(d.value) + ")");
        tooltipFocus.select(".tooltip-date").text(dateFormatter(d.date));
        tooltipFocus.select(".tooltip-likes").text(formatValue(d.value));
    }
}

// A function that set idleTimeOut to null
function idled() { idleTimeout = null; }

// A function that update the chart for given boundaries
function updateChart() {

    // What are the selected boundaries?
    extent = d3.event.selection

    // If no selection, back to initial coordinate. Otherwise, update X axis domain
    if (!extent) {
        if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
        xScale.domain([4, 8])
    } else {
        xScale.domain([xScale.invert(extent[0]), xScale.invert(extent[1])])
        line.select(".brush").call(brush.move, null) // This remove the grey brush area as soon as the selection has been done
    }

    // Update axis and line position
    xAxis.transition().duration(1000).call(d3.axisBottom(xScale))
    line
        .select('.line')
        .transition()
        .duration(1000)
        .attr("d", d3.line()
            .x(function (d) { return xScale(d.date) })
            .y(function (d) { return yScale(d.value) })
        )
}

function switchData(visualType,slideVal) {
    clearGraph();
    createBaseGraph();
    switch (slideVal) {
        case 'prev':
            currentIndex = currentIndex != 1 ? currentIndex - 1 : currentIndex || 1;
            switchData(visualType,currentIndex);
            break;
        case 1:
            country = "India";
            bindDataToGraph(visualType,'india.csv');
            currentIndex = slideVal;
            break;
        case 2:
            country = "USA";
            bindDataToGraph(visualType,'usa.csv');
            currentIndex = slideVal;
            break;
        case 3:
            country = "Brazil"
            bindDataToGraph(visualType,'brazil.csv');
            currentIndex = slideVal;
            break;
        case 'next':
            currentIndex = currentIndex != 3 ? currentIndex + 1 : currentIndex || 3;
            switchData(visualType,currentIndex);
            break;
    }
    setTitle(visualType,country);
    activateSlide();
    handleDDStatus(visualType);
    if(visualType === 2){
        setDropdownSelect(country);
    }
}

function setTitle(visualType,data){
    let prefix1 = visualType === 1 ? "Covid-19 Confirmed cases Time Series - " : "Covid-19 Time Series with Data drilling - "
    let titleEl = document.getElementById("title");
    titleEl.innerHTML = prefix1+data;
}

function setDropdownSelect(data){
    let selectEl = document.getElementById("all-dropdown");
    selectEl.innerHTML = data;   
}

function handleDDStatus(visualType){
    let allEl = document.getElementById("all-dropdown");
    let selectEl = document.getElementById("dd-status");
    selectEl.innerHTML = visualType === 1 ? 'Drilldown disabled' : 'Drilldown enabled  (Select the timeseries to zoom and double click to zoom out)';   
    if(visualType === 2){
        selectEl.classList.add('active');
    }else{
        selectEl.classList.remove('active');
        allEl.innerHTML = 'Select here'
    }
}

initGraph();
