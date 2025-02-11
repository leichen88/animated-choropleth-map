// Set SVG parameters
const width = 1000,
    height = 580;

// Map scale, location on screen and its projection
const projection = d3.geoNaturalEarth1()
    .scale(200)
    .center([0, 0])
    .translate([width / 2.2, height / 1.8])

// Path generator
const path = d3.geoPath()
    .projection(projection);

// SVG element
const svg = d3.select("#idp-map")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

// Array to store attribute data
const attributeArray = [];
let currentAttribute = 0;
let playing = false;
let totalRefugeeNumber = 0; 

// Initialize the map
function init() {
    setMap();
    animateMap();
}

// Set up the map
function setMap() {
    loadData();
}

// Load data using promises
function loadData() {
    const polygonsURL = "js/world_polygons_simplified.json";
    const polylinesURL = "js/world_lines_simplified.json";
    const countryDataURL = "data/idp_pop_wide.csv";

    Promise.all([
        d3.json(polygonsURL),
        d3.json(polylinesURL),
        d3.csv(countryDataURL)
    ]).then(processData).catch(error => console.log("Error loading data:", error));
}

// Function to calculate total refugee number for the current year
function getTotalRefugeeNumber(year) {
    let totalRefugees = 0;
    d3.selectAll('.country').each(function(d) {
        const currentValue = d.properties[year];
        if (!isNaN(currentValue)) {
            totalRefugees += currentValue;
        }
    });
    // Format the total number in millions
    const formattedTotalRefugees = (totalRefugees / 1000000).toFixed(2) + ' million';
    return formattedTotalRefugees;
}

function processData(data) {
    const world = data[0];
    const boundary = data[1];
    const countryData = data[2];

    const countries = world.objects.world_polygons_simplified.geometries;

    for (let i in countries) {
        for (let j in countryData) {
            if (countries[i].properties.color_code == countryData[j].iso) {
                for (let k in countryData[j]) {
                    if (k != 'name' && k != 'iso') {
                        if (attributeArray.indexOf(k) == -1) {
                            attributeArray.push(k);
                        }
                        countries[i].properties[k] = Number(countryData[j][k]);
                    }
                }
                break;
            }
        }
    }

    drawMap(world);
    drawLines(boundary);

    totalRefugeeNumber = getTotalRefugeeNumber(attributeArray[currentAttribute]);
    d3.select('#clock').html('In ' + attributeArray[currentAttribute] + ', there are <span style="font-size: 1.4rem; color: #0072BC ">' + totalRefugeeNumber + '</span> IDPs across the world.');
}

// Draw polygon
function drawMap(world) {
    svg.selectAll(".country")
        .data(topojson.feature(world, world.objects.world_polygons_simplified).features)
        .enter().append("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("fill", function(d) {
            return getColor(d.properties[attributeArray[currentAttribute]]);
        })
        .append("title")
          .text(function(d) { return `${d.properties.gis_name} \nIDP Population: ${d3.format(",")(d.properties[attributeArray[currentAttribute]])}`}
      );
}

// Draw polylines
function drawLines(boundary) {
    const lineGroup = svg.append("g").attr("class", "lines");
    lineGroup.selectAll("path")
        .data(topojson.feature(boundary, boundary.objects.world_lines_simplified).features)
        .enter()
        .append("path")
        .attr("d", path)
        .style("fill", "none")
        .attr("class", function(d) { return d.properties.type; });
}

// Update map sequence
function sequenceMap() {
    svg.selectAll('.country')
        .transition()
        .duration(100)
        .attr('fill', function(d) {
            return getColor(d.properties[attributeArray[currentAttribute]]);
        })
        .select("title")
        .text(function(d) {
            return `${d.properties.gis_name}\nIDP Population: ${d3.format(",")(d.properties[attributeArray[currentAttribute]])}`;
        });;
}
        
// Get color based on value
const colorScale = d3.scaleThreshold()
.domain([100000, 2000000, 4000000])
.range(["#8EBEFF", "#589BE5", "#0072BC", "#044F85"])
.unknown("#CCCCCC");;


function getColor(valueIn) {
    if (valueIn === 0) {
      return colorScale.unknown();
    }
    return colorScale(valueIn);
  }

// Get data range
function getDataRange() {
    let min = Infinity,
        max = Infinity;

    d3.selectAll('.country').each(function(d) {
        const currentValue = d.properties[attributeArray[currentAttribute]];

        if (currentValue < min) {
            min = currentValue;
        }

        if (currentValue > max) {
            max = currentValue;
        }
    });

    return [min, max];
}


function animateMap() {
    let timer;

    d3.select('#play').on('click', function() {
        if (playing == false) {
            timer = setInterval(function() {
                if (currentAttribute < attributeArray.length - 1) {
                    currentAttribute += 1;
                } else {
                    currentAttribute = 0;
                }
                sequenceMap();
                
                // Calculate the total refugee number for the current year
                totalRefugeeNumber = getTotalRefugeeNumber(attributeArray[currentAttribute]);
                
                // Update the message
                d3.select('#clock').html('In ' + attributeArray[currentAttribute] + ', there are <span style="font-size: 1.4rem; color: #0072BC ">' + totalRefugeeNumber + '</span> IDPs across the world.');
            }, 1000);

            d3.select(this).html('stop');
            playing = true;
        } else {
            clearInterval(timer);
            d3.select(this).html('play');
            playing = false;
        }
    });
}


// set legend
svg.append("g")
  .attr("class", "legendThreshold")
  .attr("transform", "translate(5,450)");

const legend = d3.legendColor()
.labelFormat(d3.format(".1s"))
.shapeWidth(12)
.shapeHeight(12)
.labels(d3.legendHelpers.thresholdLabels)
.labelOffset(3)
.shapePadding(0)
.scale(colorScale);

svg.select(".legendThreshold")
    .call(legend);


window.onload = function() {
    init();
    // Start animation
    d3.select('#play').dispatch('click');
};
