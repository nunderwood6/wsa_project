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
var layerKey = {};

var leafZoom = function(key) {
  var layer = layerKey[key][0],
      feature = layerKey[key][1];


  myMap.fitBounds(layer.getBounds(), {maxZoom: 9});

  layer.bindPopup("<h3>" + feature.properties["SourceName"] + 
    "</h3><p>" + d3.format(',')(Math.floor(feature.properties["ACRES"])) + 
    " Acres, " + feature.properties["MANAGER"] + "</p>").openPopup();
  };

///format wsa names to match d3 data
var leafClass = function(feat) {
  return feat.properties["MANAME"].replace(" Wilderness Study Area", "").replace(/ /g, "").replace("/", "");
};

var leafClassy = function(feat) {
  return feat.replace(" Wilderness Study Area", "").replace(/ /g, "").replace("/", "");
}

///click function handler for leaflet
var onClick = function(e, layer) {
  myMap.fitBounds(e.target.getBounds(), {maxZoom: 9});
  layer.setStyle({weight: 5});
};


/////////////add Daines WSA's
$.getJSON('data/daines.geojson', function(data){

  L.geoJson(data, {

    style: dStyle,

onEachFeature: function(feature, layer){

  ///store bounds in map for access by d3 listener
  layerKey[leafClass(feature)] = [layer, feature];

  //set layer style

  ///add basic Leaflet popup
  layer.bindPopup("<h3>" + feature.properties["SourceName"] + 
  	"</h3><p>" + d3.format(',')(Math.floor(feature.properties["ACRES"])) + 
    " Acres, " + feature.properties["MANAGER"] + "</p>");

  layer.on("click", function(e){
      onClick(e, layer);
      dotClickFocus(feature.properties["MANAME"]);
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
  layerKey[leafClass(feature)] = [layer, feature];
  layer.bindPopup("<h3>" + feature.properties["SourceName"] + 
  	"</h3><p>" + d3.format(',')(Math.floor(feature.properties["ACRES"])) + " Acres, Bureau of Land Management</p>");
  layer.on("click", function(e){
      onClick(e, layer);
      dotClickFocus(feature.properties["MANAME"]);
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
              .html("<h2>How do Wilderness Study Areas Compare?</h2>")
                .attr("id", "title");

var compressor = function(str) {
    return str.replace(/ /g, "").replace("/", "");
};

var dotHover = function(wsa) {

      for(var att of fakeAtt) {
          var x = d3.select(`.${compressor(att)}`).select(`.${compressor(wsa["Area"])}`).attr("cx") - 20,
              y = d3.select(`.${compressor(att)}`).select(`.${compressor(wsa["Area"])}`).attr("cy") - 20;

          var hoverTip = d3.select("#container")
                        .append("div")
                          .attr("class", "hover " + compressor(att))
                          .attr("id", "hoverTip")
                          .style("left", x + "px")
                          .style("top", y + "px");

          if(att == "Wildness") {

              if(x>400) {
                x= x-150;
              }
              if(x>300 && wsa["Area"].length > 15) {
                x = x - 200;
              }
              hoverTip.style("left", x + "px")
                      .style("top", y + "px")
                  .text(wsa["Area"] +" "+ wsa[att]);
          }
          else {
              hoverTip.text(wsa[att]);
            }


}
}






var dotClickFocus = function (wsa) {
/////////////////input from leaflet///////////////////
if(typeof wsa == "string") {

  ///remove any already focused
  vizBox.selectAll("circle")
          .classed("strong focus", false)
          .attr("r", 5);
///add new focus
  vizBox.selectAll(`.${leafClassy(wsa)}`)
          .classed("strong focus", true)
          .attr("r", 10);


d3.selectAll(".focus").classed("hidden", true);

//switch title
d3.select("#title").html(`<h2>${wsa}</h2>`)


//add focus labels
for(var att of fakeAtt) {
    var x = d3.select(`.${compressor(att)}`).select(`.${leafClassy(wsa)}`).attr("cx") - 20,
        y = d3.select(`.${compressor(att)}`).select(`.${leafClassy(wsa)}`).attr("cy") - 35;

    var toolTip = d3.select("#container")
                  .append("div")
                    .attr("class", "focus " + compressor(att))
                    .attr("id", "toolTip")
                    .style("left", x + "px")
                    .style("top", y + "px");


//get node data
        var value = d3.select(`.${compressor(att)}`).select(`.${leafClassy(wsa)}`).data()[0][att];
        console.log(value);
          toolTip.text(value);


}

//input from d3
} else {
  ///remove any already focused
  vizBox.selectAll("circle")
          .classed("strong focus", false)
          .attr("r", 5);
///add new focus
  vizBox.selectAll(`.${compressor(wsa["Area"])}`)
          .classed("strong focus", true)
          .attr("r", 10);

d3.selectAll(".focus").classed("hidden", true);

//switch title
d3.select("#title").html(`<h2>${wsa["Area"]} Wilderness Study Area</h2>`)


//add focus labels
for(var att of fakeAtt) {
    var x = d3.select(`.${compressor(att)}`).select(`.${compressor(wsa["Area"])}`).attr("cx") - 20,
        y = d3.select(`.${compressor(att)}`).select(`.${compressor(wsa["Area"])}`).attr("cy") - 35;

    var toolTip = d3.select("#container")
                  .append("div")
                    .attr("class", "focus " + compressor(att))
                    .attr("id", "toolTip")
                    .style("left", x + "px")
                    .style("top", y + "px");

        toolTip.text(wsa[att]);


}
}

};

//populate with fake data
var fakeAtt = ["Wildness", "Light Pollution", "Noise Pollution", "Mammal", "Charismatic Carnivores"];

//add wsa data
d3.csv("data/wsa_data.csv", function (error, wsaData){
    if(error) throw error;

for(var att of fakeAtt) {
    for(var wsa of wsaData) {
        wsa[att] =Math.random().toFixed(2);
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
                .range([20, vizW()-30]);
} ;

//xScale tests
var wildScale = xScaleGen(fakeAtt[0]);

var xAttScales = fakeAtt.map(function(att){
      return xScaleGen(att);
});

/// create yScale
var yScale = d3.scaleLinear()
                .domain([0, (fakeAtt.length-1)])
                .range([75, vizH - 30]);

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

            dotHover(d);
            vizBox.selectAll(`.${compressor(d["Area"])}`)
              .classed("highlight", true);

          })
          .on("mouseout", function(d){

            vizBox.selectAll(`.${compressor(d["Area"])}`)
                  .classed("highlight", false);
                  d3.selectAll(".hover").remove();

          })
          .on("click", function(d) {
              dotClickFocus(d);
              leafZoom(compressor(d["Area"]));
          });

///add Labels
    vizBox.select(`.${compressor(att)}`)
                .append("text")
                .text(att)
                    .attr("class", "label")
                    .attr("x", `${vizW()/2}`)
                    .attr("y", function(d){
                      return yScale(i)+25;
                    })
                    .attr("text-anchor", "middle");

} ////end for loop creating dots for each attribute




}); ///end d3 callback function





///////end wrapper function
};

window.onload = wrapper();