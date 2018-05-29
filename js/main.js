function wrapper(){

//initialize map

var topLeft = [49.052589, -116.223559],
    botRight = [44.895140, -103.927112];

var myMap = L.map('mapid').fitBounds([topLeft, botRight]);


//add tiles
L.tileLayer('https://{s}.tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=d0f7c9187bfe46659b71bb1f9ea9838b', 
{
	attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	apikey: 'd0f7c9187bfe46659b71bb1f9ea9838b',
	maxZoom: 14,
	minZoom: 5
}).addTo(myMap);

var dStyle = {
    "color": "#50267c",
    "weight": 1
  };
var dHighStyle = {
  "color": "#4411ff",
  "weight": 1,
  "opacity": 0.5,
  "fillOpacity:": 0.4
};

var gStyle = {
    "color": "#b22010",
    "weight": 1,
    "opacity": 0.5
};

var gHighStyle = {
  "color": "#f48275",
  "weight": 1,
  "opacity": 0.5,
  "fillOpacity:": 0.4
};


////////hacky solution to get latlong bounds for d3 event
var boundsKey = {};

var leafZoom = function(key) {
  console.log(key);
  myMap.fitBounds(boundsKey[key], {maxZoom: 9});
  
  };

///format wsa names to match d3 data
var leafClass = function(feat) {
  return feat.properties["MANAME"].replace(" Wilderness Study Area", "").replace(/ /g, "").replace("/", "");
};

///click function handler for leaflet
var onClick = function(e, layer) {
  myMap.fitBounds(e.target.getBounds(), {maxZoom: 9});
  layer.setStyle({weight: 5});
  console.log(layer);
};

console.log(boundsKey);
/////////////add Daines WSA's
$.getJSON('data/daines.geojson', function(data){

  L.geoJson(data, {

    style: dStyle,

onEachFeature: function(feature, layer){

  ///store bounds in map for access by d3 listener
  boundsKey[leafClass(feature)] = layer.getBounds();

  //set layer style

  ///add basic Leaflet popup
  layer.bindPopup("<h3>" + feature.properties["SourceName"] + 
  	"</h3><p>" + d3.format(',')(Math.floor(feature.properties["ACRES"])) + 
    " Acres, " + feature.properties["MANAGER"] + "</p>");

  layer.on("click", function(e){
      onClick(e, layer);
      dotClickFocus(leafClass(feature));
  });

  layer.on("mouseover",function (e){
    layer.setStyle(dHighStyle);
  });

  layer.on("mouseout", function(e){
    layer.setStyle(dStyle);
  });
  
}

  }).addTo(myMap);
});

/////////////////add Gianforte WSA's
$.getJSON('data/gforte.geojson', function(data){

  L.geoJson(data, {

    style: gStyle,

onEachFeature: function(feature, layer){
  boundsKey[leafClass(feature)] = layer.getBounds();
  layer.bindPopup("<h3>" + feature.properties["SourceName"] + 
  	"</h3><p>" + d3.format(',')(Math.floor(feature.properties["ACRES"])) + " Acres, Bureau of Land Management</p>");
  layer.on("click", function(e){
      onClick(e, layer);
      dotClickFocus(`.${leafClass(feature)}`);
  });
  layer.on("mouseover",function (e){
    layer.setStyle(gHighStyle);
  });
  layer.on("mouseout", function(e){
    layer.setStyle(gStyle);
  });
}

  }).addTo(myMap);
});


//////////////// Linked Dot Plot///////////////////////////////////////////


var vizW = function() {
    var win = $(window).width();

    if(win >= 1000) {
      return (win - 700);
    } else if( ((win < 1000) && (win > 650)) ) {
      return 600;
    } else {
      return (win - 50);
    }
};

var vizH = 400;

var vizBox = d3.select("#vizBox")
                  .style("width", `${vizW()}px`)
                  .style("height", vizH)
                  .append("div")
                    .attr("id", "container")
                  .append("svg")
                    .attr("class", "vizSvg")
                    .attr("width", vizW())
                    .attr("height", vizH);
                    

var title = d3.select("#container")
              .append("div")
              .html("<h2>How do the Wilderness Study Areas Compare?</h2>")
                .attr("id", "title");

var img = d3.select("#title")
             .append()

var compressor = function(str) {
    return str.replace(/ /g, "").replace("/", "");
};

var dotClickFocus = function (wsa) {
  vizBox.selectAll("circle")
                      .classed("strong focus", false)
                      .attr("r", 5);

              vizBox.selectAll(wsa)
                  .classed("strong focus", true)
                  .attr("r", 10);

};






//add wsa data
d3.csv("data/wsa_data.csv", function (error, wsaData){
    if(error) throw error;
  
//populate with fake data
    
var fakeAtt = ["Wildness", "Light Pollution", "Noise Pollution", "Mammal", "Charismatic Carnivores"];

for(var att of fakeAtt) {
    for(var wsa of wsaData) {
        wsa[att] = Math.floor(Math.random()*100)*.01;
    }
}

console.log(wsaData);



///dynamic attribute domain finder

var xDom = function(att) {
    var attArray = [];
    for(var wsa of wsaData) {
        attArray.push(wsa[att]);
    }
    return d3.extent(attArray);

};

//dynamic scale generator
var xScaleGen = function(att) {
      return d3.scaleLinear()
                .domain(xDom(att))
                .range([20, vizW()-20]);
} ;

//xScale tests
var wildScale = xScaleGen(fakeAtt[0]);

var xAttScales = fakeAtt.map(function(att){
      return xScaleGen(att);
});

/// create yScale
var yScale = d3.scaleLinear()
                .domain([0, (fakeAtt.length-1)])
                .range([200, vizH - 10]);

///////////////////////create circles
for(i=0;i<fakeAtt.length;i++) {

    var att = fakeAtt[i];

//sort data so drawing order is right to left
    var sorted = wsaData.sort(function(a,b) {
        return b[att] - a[att];
    });

////draw dots
       vizBox.append("g")
          .attr("class", compressor(att))
        .selectAll("circle")
        .data(sorted)
        .enter()
        .append("circle")
          .attr("class", function(d) {
            return "circles " + compressor(d["Area"]);
            })
          .attr("cx", function(d) {
            return xAttScales[i](d[att]);
          })
          .attr("cy", function(d){
            return yScale(i);
          })
          .attr("r", 5)
          .on("mouseover", function(d){

            vizBox.selectAll(`.${compressor(d["Area"])}`)
              .classed("highlight", true);

          })
          .on("mouseout", function(d){

            vizBox.selectAll(`.${compressor(d["Area"])}`)
                  .classed("highlight", false);

          })
          .on("click", function(d){

              dotClickFocus(`.${compressor(d["Area"])}`);
              leafZoom(compressor(d["Area"]));
          });

///add Labels
    vizBox.select(`.${compressor(att)}`)
                .append("text")
                .text(att)
                    .attr("class", "label")
                    .attr("x", `${vizW()/2}`)
                    .attr("y", function(d){
                      return yScale(i)-15;
                    })
                    .attr("text-anchor", "middle")
                    .attr("text-decoration", "underline");

} ////end for loop creating dots for each attribute




}); ///end d3 callback function





///////end wrapper function
};

window.onload = wrapper();